// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { THROWMODE as TM } from '../config.js'
import BaseThrow from './base-throw.js'
import { Trait, MageThrow } from './dice.js'

/**
 * Manages everything dice throws related in mage-fr.
 * Can do standalone 'quick throw' or display it's own DiceDialog Application to drive throw options 
 */
export default class DiceThrower {

  /**
   * @param {M20eActor|M20eItem} document an Actor or Item
   * @param {BaseThrow}
   */
  constructor(document, baseThrow) {

    this._document = document; //either an actor or owned item
    this._throw = baseThrow;
    this.stats = this._document.getExtendedStats(baseThrow.stats);
    this.data = foundry.utils.mergeObject(this.constructor.defaultData, baseThrow.options);

    this._app = null;
    this._prepared = false;
  }

  static get defaultData() {
    return {
      difficultyBase: game.settings.get("mage-fr", "difficultyBase"),
      difficultyMods: {
        userMod: 0,
        untrainedMod: 0
      },
      dicePoolMods: {
        userMod: 0,
        healthMod: 0
      },
      successMods: {
        userMod: 0
      },
      rollMode: game.settings.get("core", "rollMode"),
      isMagickEffect: false,
      throwIndex: 0,
      difficultyOverride: null,
      ignoreHealthMod: false,
      throwMode : TM.DEDUCT_FAILURES & TM.RESULT_CRITICAL
    };
  }

  /**
   * Attemps to create a new DiceThrower instance with some checks
   * @param  {M20eActor|M20eItem} document an Actor or Item
   * @param {BaseThrow}
   * 
   * @returns {DiceThrow|null} the new DiceThrower instance or null if validation failed
   */
  static create(document, baseThrow) {

    try {
      if (!document) { throw { msg: 'noDocument' }; }
      if (!baseThrow || !baseThrow instanceof BaseThrow ) { throw { msg: 'invalidThrow' }; }
 
      if ( !DiceThrower.isItemThrow(document) ) {
        //only check actor thrown stats
        baseThrow.stats.forEach( stat => BaseThrow.validateStat(document, stat, true));
      }

    } catch (e) {
      if (e.msg) { //todo : maybe add error params
        ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      } else {
        ui.notifications.error(game.i18n.localize(`M20E.notifications.impossibleThrow`));
      }
      return null;
    }
    //everything checks out, let's go !
    return new DiceThrower(document, baseThrow);
  }

  /* -------------------------------------------- */
  /*  Initialisation                              */
  /* -------------------------------------------- */

  /**
   * Calculates the relevant data for display / roll
   * also called by every update method call in order to display accurate values in case diceThrow has an App
   */
  prepareData() {
    this.data.isMagickThrow = BaseThrow.isMagickThrow(this.stats);
    debugger
    //Dice Pool
    this.data.dicePoolBase = this.getDicePoolBase();
    this.data.dicePoolMods['healthMod'] = this.getHealthMod();
    this.data.dicePoolTotal = Math.max(this.data.dicePoolBase + this.getDicePoolMod(), 0);

    //Difficulty
    //this.data.difficultyMods.untrainedMod = this.getUntrainedMod();
    this.data.difficultyTotal = this.data.difficultyBase;
    //this.thresholdTotal = Math.clamped(this.thresholdChosen + this.thresholdMod, 2, 10);
    //flavor
    //this.flavor = this._document.getThrowFlavor(this._traits, this._thowIndex);
    this._prepared = true;
  }

  /**
   * computes the base dice pool
   * arete score for magic throws, or sum of the stats values
   * 
   * @returns {Number} the base dice pool for this throw
   */
   getDicePoolBase() {
    if ( this.data.isMagickThrow ) {
      //dice pool base is just arete
      //items might have an arete score (ie Wonders, Talismans...)
      return this._document.data.stats.magick.arete.value;
    } else {
      //dice pool base is sum of all values
      return this.stats.reduce((acc, cur) => {
        return acc + cur.value;
      }, 0);
    }
  }

  /**
   * computes a negative modifier to the dicePool
   * actual modifer is based on game settings and current player health
   * if main useHealthMalus setting is set to false the specific malus for magic doesn't apply
   * 
   * @returns {Number} a negative modifier
   */
   getHealthMod() {
    if ( DiceThrower.isItemThrow(document) ) { return 0;} //wonders don't have a health malus
    const healthMalus = this.actor.data.data.resources.health.malus;

    if ( game.settings.get("mage-fr", "useHealthMalus") ) {
      if ( this.data.isMagickThrow ) {
        //throw is pure magic, check for specific setting
        return game.settings.get("mage-fr", "useHealthMalusForMagic") ? 
        healthMalus * -1 : 0;
      } else {
        return healthMalus * -1;
      }
    }
    return 0;
  }

  /**
   * @returns {Number} sum of ALL dice pool modifiers
   */
  getDicePoolMod() {
    let totalMod = 0;
    for( const mod in this.data.dicePoolMods) {
      if ( mod !== 'healthMod' || !this.data.ignoreHealthMod) {
        totalMod += this.data.dicePoolMods[mod]
      }
    }
    return totalMod;
  }

  /* -------------------------------------------- */
  /*  Throw implementation                        */
  /* -------------------------------------------- */

  /**
   * Roll the dice
   * packs everything usefull in the rollData for further use
   * create the roll formula for use within a MageRoll
   * send roll to chat and autocloses the app if needed
   * 
   * @param  {Boolean} closeOnRoll only set to false by user clic on the App
   */
   async throwDice(closeOnRoll = true) {
    // do the init (might throw an error if throw is actually impossible)
    if ( !this._prepared ) {
      try {
        this.prepareData();
      } catch (e) {
        ui.notifications.error(game.i18n.localize(`M20E.notifications.${e}`));
        return;
      }
    }
    // get the MageRoll instance
    const mageRoll = this.getRoll();

    // send the message
    const speaker = ChatMessage.getSpeaker({actor: this.actor});
    if ( DiceThrower.isItemThrow(this._document) ) {
      speaker.alias = this._document.name;
    }

    //the async evaluation is gonna be done by the toMessage()
    await mageRoll.toMessage({
      speaker : speaker,
      flavor : this.flavor
    }, {rollMode: this.rollMode});

    //close app if exists or rerender it
    if ( this._app ) {
      if ( closeOnRoll ) {
        await this.app.close();
        this._app = null;
      } else {
        this.app.render(true);
      }
    }
  }

  getRoll() {
    //nicely pack everything we gonna need for our roll and our message
    //todo : populate rollData.options with current values, pass less parameters but better ones
    //ie store booleans, not strings ^^
    const rollOptions = {};/*
      documentId: this._document.id,
      actorId: this.actor.id,
      traits: this._traits,
      throwIndex: this._thowIndex,
      options: this.options,
      isEffectRoll: this.isEffectRoll,
      deductFailures: (this.throwSettings === TROWSETTINGS_BLANDROLL) ? '' :  'df=1',
      tenXplodeSuccess: this.getExplodeSuccess() ? "xs=10" : "",
      dicePoolBase: this.dicePoolBase,
      dicePoolMods: this.dicePoolMods,
      dicePoolTotal: this.dicePoolTotal,
      thresholdBase: this.thresholdBase,
      thresholdChosen: this.thresholdChosen,
      thresholdMods: this.thresholdMods,
      thresholdTotal: this.thresholdTotal
    }*/

    const {dicePoolTotal, difficultyTotal} = this.data;
    const tenXplodeSuccess = this.data.throwMode & TM.XPLODE_SUCCESS ? 'xs=10' : '';
    const deductFailures = this.data.throwMode & TM.DEDUCT_FAILURES ? 'df=1' : '';
    const formula = `${dicePoolTotal}d10${tenXplodeSuccess}cs>=${difficultyTotal}${deductFailures}`;
    
    return new CONFIG.Dice.MageRoll(formula, null, rollOptions);
  }

  /**
   * @returns the document itself or it's parent is document is an owned item
   */
   get actor() {
    return this._document.isEmbedded ? this._document.parent : this._document;
  }

   /**
   * Whether the items own stats are used in lieue of the actor's
   * Atm only wonders / talismans qualify as itemThrows (using their own arete value)
   * @param  {Document} document
   * 
   * @returns {Boolean} false unless document is a owned item of type 'wonder'
   */
    static isItemThrow(document) {
      if ( document.isEmbedded ) {//idem .isOwned
        return ['wonder'].includes(document.type);
      }
      return false;
    }




  /* -------------------------------------------- */
  /*  {DiceDialog} App Handlers                 */
  /* -------------------------------------------- */


  /* -------------------------------------------- */
  /*  Macro to and from                           */
  /* -------------------------------------------- */


}