import Trait from './trait.js'
import M20eThrow from './throw.js'
import { M20E } from './config.js'

// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";


/**
 * Manages everything dice throws related in mage-fr.
 * Can do standalone 'quick throw' or display it's own DiceDialog Application to drive throw options 
 */
export default class DiceThrower {

  /**
   * @param {M20eActor|M20eItem} document an Actor or Item
   * @param {M20eThrow}
   */
  constructor(document, m20eThrow) {

    this._document = document; //either an actor or owned item
    this._throw = m20eThrow;
    this.stats = m20eThrow.stats;
    this.data = foundry.utils.mergeObject(this.constructor.defaultData, m20eThrow.options);

    this._app = null;
    this._initialized = false;
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
      throwMode : M20E.THROWMODE.DEDUCT_FAILURES | M20E.THROWMODE.RESULT_CRITICAL
    };
  }

  /**
   * Attemps to create a new DiceThrower instance with some checks
   * @param  {M20eActor|M20eItem} document an Actor or Item
   * @param {M20eThrow}
   * 
   * @returns {DiceThrow|null} the new DiceThrower instance or null if validation failed
   */
  static create(document, m20eThrow) {

    try {
      if (!document) { throw { msg: 'noDocument' }; }
      if (!m20eThrow || !m20eThrow instanceof M20eThrow ) { throw { msg: 'invalidThrow' }; }
 
      if ( !DiceThrower.isItemThrow(document) ) {
        //only check actor thrown stats
        const actor = document.isEmbedded ? document.parent : document;
        m20eThrow.stats.forEach( stat => M20eThrow.validateStat(actor, stat));
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
    return new DiceThrower(document, m20eThrow);
  }

  /* -------------------------------------------- */
  /*  Initialisation                              */
  /* -------------------------------------------- */

  initialize() {
    this.prepareStats();
    this.prepareData();
    this._initialized = true;
  }

  prepareStats() {
    if ( DiceThrower.isItemThrow(document) ) {
    
    } else {
      this.stats = this.actor.getExtendedStats(this.stats);
    }
  }

  /**
   * Calculates the relevant data for display / roll
   * also called by every update method call in order to display accurate values in case diceThrow has an App
   */
  prepareData() {
    this.data.isMagickThrow = M20eThrow.isMagickThrow(this.stats);

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
    if ( !this._initialized ) {
      try {
        this.initialize();
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
    this.data.throwMode = this.data.throwMode | M20E.THROWMODE.XPLODE_SUCCESS
    const tenXplodeSuccess = (this.data.throwMode & M20E.THROWMODE.XPLODE_SUCCESS) ? 'xs=10' : '';
    const deductFailures = (this.data.throwMode & M20E.THROWMODE.DEDUCT_FAILURES) ? 'df=1' : '';
    const formula = `${dicePoolTotal}d10${tenXplodeSuccess}cs>=${difficultyTotal}${deductFailures}`;
    
    const cls = CONFIG.Dice.M20eRoll;
    return new cls(formula, null, rollOptions);
  }

  static useCritical(throwMode) {
    return !!(throwMode &  M20E.THROWMODE.RESULT_CRITICAL)
  }

  /* -------------------------------------------- */
  /*  {DiceThrowerApp} App Handlers               */
  /* -------------------------------------------- */

  /**
   * returns the (optionnal) application that drives the diceTrower
   * create an instance if needed
   * 
   * @returns {DiceThrowerApp} an instance of a DiceThrowerApp Application
   */
   get app() {
    //todo : maybe add game setting to prevent players from editing their throws ?
    if ( !this._app ) {
      const cls = CONFIG.M20E.DiceThrower.appClass;
      this._app = new cls (this, {
        editable: game.user.isGM || true 
      });
    }
    return this._app;
  }

  /**
   * remove a trait from both the traitToRoll array an it's extended counterpart
   * from user interaction with an indexed remove button on the DiceDialog App
   * 
   * @param  {Number} index index of the trait in the throw's traits array
   */
  removeTrait(index) {
    this._traits.splice(index, 1);
    this.update();
  }

  /**
   * updates the value of a trait from the extended traits array
   * from user interaction with clickable bullets on the DiceDialog App
   * note only allowed on actor magical effect throw
   * 
   * @param  {Number} index index of the trait in the throw's traits array
   * @param  {Number} newValue 
   */
  updateTraitValue(index, newValue) {
    this._traits[index].data.valueOverride = newValue;
    this.update();
  }

  /**
   * Updates the chosen threshold (it will be used for the roll)
   * 
   * @param  {Number} newValue
   */
   updateChosenThreshold(newValue) {
    this.thresholdChosen = newValue;
    //this.thresholdMods.userMod = this.thresholdChosen - this.thresholdBase;

    this.update();
  }

  /**
   * switch between the 3 throw settings in one way or the other (depending on mouse button)
   * from user interaction with the throw settings button on the DiceDialog App
   * 
   * @param  {Number} mod either -1 or +1
   */
  rotateSetting(mod) {
    this.throwSettings += mod;
    if ( this.throwSettings < TROWSETTINGS_BLANDROLL ) {
      this.throwSettings = TROWSETTINGS_DFXPLODESUCCESS;
    } else if ( this.throwSettings > TROWSETTINGS_DFXPLODESUCCESS ) {
      this.throwSettings = TROWSETTINGS_BLANDROLL;
    }
    this.render(true);
  }

  /**
   * Reevaluates most of the diceThrow values and rerender the app
   * 
   * @param  {Boolean} fullUpdate forces the reevaluation of the traits too
   */
  update(fullUpdate=false) {
    if ( fullUpdate ) {
      //happens usually when actor is updated
      this.prepareStats();
    }
    //recalc shit
    this.prepareData();
    //render
    this.render(true);
  }

  /**
   * called by ActorSheet or macro to display the DiceDialogue Application
   * @param  {Boolean} force=false
   */
  render(force=false, options={}) {
    // do the init (might throw an error if throw is actually impossible)
    if ( !this._initialized ) {
      try {
        this.initialize();
      } catch (e) {
        ui.notifications.error(game.i18n.localize(`M20E.notifications.${e}`));
        return;
      }
    }
    this.app.render(force);
  }


  /**
   * Only non 0 mods
   */
  static getModsTooltipData(mods, invert=false) {
    let data = {};
    for( const mod in mods) {
      const value = mods[mod];
      if ( value ) {
        data[mod] = {
          name: utils.safeLocalize(`M20E.throwMod.${mod}`, mod),
          class: (invert ? -1 * value : value) < 0 ? 'red-thingy' : 'green-thingy',
          value: (value > 0) ? `+${value}` : `${value}`
        };
      }
    }
    return data;
  }

  /* -------------------------------------------- */
  /*  Macro to and from                           */
  /* -------------------------------------------- */


}