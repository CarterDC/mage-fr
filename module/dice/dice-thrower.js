// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, BaseThrow } from './dice-helpers.js'
import { M20E } from '../utils/config.js'

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
      throwMode : M20E.THROWMODE.DEDUCT_FAILURES & M20E.THROWMODE.RESULT_CRITICAL
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
        const actor = document.isEmbedded ? document.parent : document;
        baseThrow.stats.forEach( stat => BaseThrow.validateStat(actor, stat));
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

    //Dice Pool
    this.data.dicePoolBase = this.getDicePoolBase();
    this.data.dicePoolMods['healthMod'] = this.getHealthMod();
    const dpModTotal = this.getDicePoolModTotal();
    this.data.dicePoolTotal = Math.max(this.data.dicePoolBase + dpModTotal, 0);

    //Difficulty
    this.data.difficultyMods['untrainedMod'] = this.getUntrainedMod();
    const diffModTotal = this.getDifficultyModTotal();
    this.data.difficultyTotal = this.data.difficultyOverride ?? 
      Math.clamped(this.data.difficultyBase + diffModTotal, 3, 9); //todo, have diff limits in config

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
   * @param {Boolean} ignoreHealthMod if true => doesn't add the healthmod
   * @returns {Number} sum of all relevant dice pool modifiers
   */
   getDicePoolModTotal(ignoreHealthMod = false) {
    let totalMod = 0;
    for( const mod in this.data.dicePoolMods) {
      if ( mod !== 'healthMod' || !ignoreHealthMod) {
        totalMod += this.data.dicePoolMods[mod];
      }
    }
    return totalMod;
  }

  /**
   * @returns {Number} sum of ALL Difficulty modifiers
   */
   getDifficultyModTotal() {
    let totalMod = 0;
    for( const mod in this.data.difficultyMods) {
        totalMod += this.data.difficultyMods[mod];
    }
    return totalMod;
  }

  /**
   * computes a positive modifier to the difficulty threshold
   * only 0 value abilities are concerned
   * actual malus depends on settings and ability subType
   * 
   * @returns {Number} a positive modifier
   */
   getUntrainedMod() {
    let untrainedMod = 0;
    const settings = game.settings.get("mage-fr", "untrainedMalus");
    if ( settings === "000" ) { return 0; }
    //settings is 3 digit string => first char for talents, second char for skills and third char for knowledges
    const subTypes = {talents: 0, skills: 1, knowledges: 2};
    //check if untrained ability
    this.stats.forEach( stat => {
      const { category, subType } = stat.split();
      if ( category === "abilities" && !stat.value) {
        //get specific game setting relative to untrained abilities
        const malus = settings.substr(subTypes[subType],1);
        if ( isNaN(malus) ) { throw {msg:'impossibleThrow'}; }
        untrainedMod += parseInt(malus);
      }
    })
    return untrainedMod;
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

  /**
   * @returns the document itself or it's parent if document is an owned item
   */
   get actor() {
    return this._document.isEmbedded ? this._document.parent : this._document;
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
    const rollOptions = {
      documentId: this._document.id,
      actorId: this.actor.id,
      stats: this.stats,
      data: this.data
    };
    //prepare the formula
    const {dicePoolTotal, difficultyTotal} = this.data;
    const tenXplodeSuccess = this.data.throwMode & M20E.THROWMODE.XPLODE_SUCCESS ? 'xs=10' : '';
    const deductFailures = this.data.throwMode & M20E.THROWMODE.DEDUCT_FAILURES ? 'df=1' : '';
    const formula = `${dicePoolTotal}d10${tenXplodeSuccess}cs>=${difficultyTotal}${deductFailures}`;
    
    return new CONFIG.Dice.MageRoll(formula, null, rollOptions);
  }

  /* -------------------------------------------- */
  /*  {DiceDialog} App Handlers                 */
  /* -------------------------------------------- */

  /**
   * Only non 0 mods
   */
  static getTooltipModsData(mods, invert=false) {
    let data = {};
    for( const mod in mods) {
      const value = mods[mod];
      if ( value ) {
        data[mod] = {
          name: game.i18n.localize(`M20E.throwMod.${mod}`),
          class: (invert ? -1 * value : value) < 0 ? 'red-thingy' : 'green-thingy',
          value: (value > 0) ? `+${value}` : `${value}`
        };
      }
    }
  }

  /* -------------------------------------------- */
  /*  Macro to and from                           */
  /* -------------------------------------------- */


}