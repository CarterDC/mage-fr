import Trait from './trait.js'
import M20eThrow from './throw.js'
import { M20E } from './config.js'

// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";


/**
 * Manages everything dice throws related in mage-fr.
 * Can do standalone 'quick throw' or display it's own DiceThrowerApp Application to drive throw options 
 * TODO : decide whether or not to have it be an extension of Throw ?
 * TODO : maybe get rid of _throw altogether and store stats directly ?
 */
export default class DiceThrower {

  /**
   * @param {M20eActor} document an Actor or Item
   * @param {M20eThrow}
   */
  constructor(actor) {
    this.actor = actor;
    this._throw = this.getNewFreeThrow();
    this.data = DiceThrower.defaultData; //todo : go for something else when extended !
    this._app = null;

    Hooks.on('updateCoreRollMode', this.onUpdateCoreRollMode);
  }

  /**
   * returns the (optionnal) application that drives the diceTrower
   * create an instance if needed
   * 
   * @returns {DiceThrowerApp} an instance of a DiceThrowerApp Application
   */
   get app() {
    //todo : maybe add game setting to prevent players from editing their throws ?
    if (!this._app) {
      const cls = CONFIG.M20E.DiceThrower.appClass;
      this._app = new cls(this, {
        editable: game.user.isGM || true
      });
    }
    return this._app;
  }

  static get defaultData() {
    return {
      difficultyBase: game.settings.get("mage-fr", "difficultyBase"),
      difficultyMods: {
        userMod: 0,
        untrainedMod: 0
      },
      dicePoolBase: 0,
      dicePoolMods: {
        userMod: 0,
        healthMod: 0
      },
      successMods: {
        userMod: 0,
        willpowerMod: 0
      },
      rollMode: game.settings.get("core", "rollMode"),
      isMagickThrow: false,
      throwIndex: 0,
      ignoreHealthMod: false, //todo: use special mod willpower in dicePoolMods
      throwMode: M20E.THROWMODE.DEFAULT
    };
  }

  /* -------------------------------------------- */
  /*  Stats Management                            */
  /* -------------------------------------------- */

  addStatByPath(path) {
    try {
      //safe add, check it's not already in the stats array
      if (this._throw.stats.some(stat => stat.path === path)) {
        throw { msg: 'alreadyAdded' };
      }
      const stat = new Trait({ path: path });
      this.addStat(stat);
    } catch (e) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      return;
    }
  }

  addStat(stat) {
    try {
      if (this.data.statLock === true) {
        throw { msg: 'statLocked' };
      }

      M20eThrow.validateStat(this.actor, stat);
      this._throw.addStat(stat);

      this.prepareStats();

      //render actor's sheet in order to refresh the highlighted stats
      this.actor.sheet.render();

    } catch (e) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      return;
    }
  }

  removeStatByPath(path) {
    const statIndex = this._throw.stats.findIndex(stat => stat.path === path);
    if (statIndex !== -1) {
      this.removeStatByIndex(statIndex);
    }
  }

  removeStatByIndex(statIndex) {
    try {
      if (this.data.statLock === true) {
        throw { msg: 'statLocked' };
      }
      this._throw.removeStat(statIndex);
      this.prepareStats();
      //render actor's sheet in order to refresh the highlighted stats
      this.actor.sheet.render();
      
    } catch (e) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      return;
    }
  }

  /**
   * @param {Number} index index of the stat in the throw's stat array
   * @param {String} propertyPath the stat's property to be updated
   * @param {} newValue 
   */
  updateStatProperty(index, propertyPath, newValue) {
    try {
      if (this.data.statLock === true) {
        throw { msg: 'statLocked' };
      }
      foundry.utils.setProperty(this._throw.stats[index], propertyPath, newValue);
      this.prepareStats();
    } catch (e) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      return;
    }
  }

  prepareStats() {
    this._throw.stats = this.actor.getExtendedStats(this._throw.stats);
    this.flavor = this._throw.getStatsLocalizedNames(this.actor).join(' + ');

    if ( M20eThrow.isSpecialtyRoll(this._throw.stats) ) {
      this.data.throwMode |= M20E.THROWMODE.XPLODE_SUCCESS;
    } else {
      this.data.throwMode &= M20E.THROWMODE.DEFAULT;
    }

    this.prepareData();
  }

  /* -------------------------------------------- */
  /*  Data Management                             */
  /* -------------------------------------------- */
  
  updateData(propertyPath, newValue, options= {silent:false}) {
    foundry.utils.setProperty(this.data, propertyPath, newValue);

    this.prepareData(options);
  }

  /**
   * Calculates the relevant data for display / roll
   * also called by every update method call in order to display accurate values in case diceThrow has an App
   */
   prepareData(options) {
    this.data.isMagickThrow = M20eThrow.isMagickThrow(this._throw.stats);

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

    //todo : get flavor from item
    this.flavor = this.getFlavor();
    //this._throw.getStatsLocalizedNames(this.actor).join(' + ');

    this._render(options);
  }

  _render(options) {
    if ( options?.silent === true ) { return; }

    if (this._app) {
      if (this._app._state !== -1) {
        this._app.render();
      }
    }
  }

  getNewFreeThrow() {
    return new M20eThrow([
      //stats
    ], {
      //data
      name: '',
      type: 'manual'
    }, {
      //options

    });
  }

  resetAll() {
    this._throw = this.getNewFreeThrow();
    this.statsLock = false;
    this.flavor = '';
    this.data = DiceThrower.defaultData;
    this.actor.sheet.render();

    ui.notifications.info('DiceThrower reset to default.');

    this.prepareStats();
  }

  /* -------------------------------------------- */
  /*  Throw implementation                        */
  /* -------------------------------------------- */

  /**
   * 
   */
  async throwDice(m20eThrow, options) {
    // do the init (might throw an error if throw is actually impossible)
    try {
      this.processThrow(m20eThrow, options);
      if (this.data.dicePoolTotal <= 0) { throw { msg: 'cannotThrow0Dice' }; }
    } catch (e) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      return;
    }

    this.roll();
  }

  /**
   * Called by ActorSheet or macro to display the DiceThrowerApp Application
   */
   render(m20eThrow, options) {
    // do the init (might throw an error if throw is actually impossible)
    try {
      this.processThrow(m20eThrow, options);
      //if ( this.data.dicePoolTotal <= 0 ) { throw {msg: 'cannotThrow0Dice'}; }
    } catch (e) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      return;
    }
    //render actor's sheet in order to refresh the highlighted stats
    this.actor.sheet.render();
    //render the driver app
    this.app.render(true);
  }

  processThrow(m20eThrow, options) {
    if ( m20eThrow ) {
      //first check if throw is feasible 
      m20eThrow.stats.forEach(stat => M20eThrow.validateStat(this.actor, stat, true));

      //process the throw data, stats and options
      this._throw = m20eThrow;
      if (this._throw.stats.length > 0) {
        this._throw.stats = this.actor.getExtendedStats(this._throw.stats);
      }
      //sanitize the options before merging (we wouldn't want a 0 diff)
      if (m20eThrow.options.difficultyBase === 0) {
        delete m20eThrow.options['difficultyBase'];
      }
      //check for special options to apply
      if ( options.throwOwner ) { //throw comes from an item 
        //todo : maybe put that in the roll method for rotes
        if ( options.throwOwner.type === 'rote' && game.settings.get("mage-fr", "roteRule")) {
          options.throwMode = M20E.THROWMODE.XTRA;
        }
      }
      //merge data & options
      this.data = foundry.utils.mergeObject(this.constructor.defaultData, {
        ...m20eThrow.options,
        ...options
      });

    } else {
      //no actual throw was passed as parameter, still use the options
      this.data = foundry.utils.mergeObject(this.constructor.defaultData, {
        ...options
      });
    }

    this.prepareData();
  }

  async roll(options = {closeOnRoll: true, resetOnRoll: true}) {
    // get the m20eRoll instance
    const m20eRoll = this.getRoll();
    // send the message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    //todo : use alias is is wonder throw

    //the async evaluation is gonna be done by the toMessage()
    await m20eRoll.toMessage({
      speaker: speaker,
      flavor: this.flavor //todo : have flavor be a complex html with tooltip
    }, { rollMode: this.data.rollMode });

    //check whether to rerender or close the app and wheter to reset the DT or not
    if ( this._app ) {
      if ( this._app._state !== -1 ) {
        if( options.closeOnRoll ) {
          this._app.close();
        }
      }
    }
    if( options.resetOnRoll ) {
      this.resetAll();
    }
  }

  getRoll() {
    //nicely pack everything we gonna need for our roll and our message
    const rollOptions = {
      actorId: this.actor.id,
      stats: this._throw.stats,
      data: { ...this.data, throwOwnerId: this.data.throwOwner?.id },
      flavor: this.flavor
    }

    //prepare the formula parameters
    const { dicePoolTotal, difficultyTotal } = this.data;
    const tenXplodeSuccess = (this.data.throwMode & M20E.THROWMODE.XPLODE_SUCCESS) ? 'xs=10' : '';
    const deductFailures = (this.data.throwMode & M20E.THROWMODE.DEDUCT_FAILURES) ? 'df=1' : '';
    //preparation of the success mods
    const {bonus, malus} = Object.values(this.data.successMods).reduce((acc, cur) => {
      return cur < 0 ? {...acc, malus: acc.malus + parseInt(cur)} : {...acc, bonus: acc.bonus + parseInt(cur)}
    },{bonus: 0, malus: 0});
    let successString = ''; //basic concatenation of every successMod
    if ( bonus ) { successString += `+${bonus}`; }
    if ( malus ) { successString += ` ${malus}`; }

    const formula = `${dicePoolTotal}d10${tenXplodeSuccess}cs>=${difficultyTotal}${deductFailures}${successString}`;
    //todo: have Roll class be specific to DT class
    const cls = CONFIG.Dice.M20eRoll;
    return new cls(formula, null, rollOptions);
  }

  /* -------------------------------------------- */
  /*  Calculations                                */
  /* -------------------------------------------- */

  getFlavor() {
    if (this.data.throwOwner) {
      return this.data.throwOwner.getThrowFlavor(this.data.throwIndex);
    } else {
      return this.actor.getThrowFlavor(this._throw.stats);
    }
  }

  /**
   * computes the base dice pool
   * arete score for magic throws, or sum of the stats values
   * 
   * @returns {Number} the base dice pool for this throw
   */
  getDicePoolBase() {
    if (this.data.isMagickThrow) {
      //dice pool base is just arete
      //items might have an arete score (ie Wonders, Talismans...)
      return this.actor.data.stats.magick.arete.value;
    } else {
      //dice pool base is sum of all values
      return this._throw.stats.reduce((acc, cur) => {
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
    // TODO : Some other throws might not require health malus (like willpower, resonance, contacts, etc)
    //if ( DiceThrower.isItemThrow(document) ) { return 0;} //wonders don't have a health malus
    const healthMalus = this.actor.data.data.resources.health.malus;

    if (game.settings.get("mage-fr", "useHealthMalus")) {
      if (this.data.isMagickThrow) {
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
    for (const mod in this.data.dicePoolMods) {
      if (mod !== 'healthMod' || !ignoreHealthMod) {
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
    for (const mod in this.data.difficultyMods) {
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
    if (settings === "000") { return 0; }
    //settings is 3 digit string => first char for talents, second char for skills and third char for knowledges
    const subTypes = { talents: 0, skills: 1, knowledges: 2 };
    //check if untrained ability
    this._throw.stats.forEach(stat => {
      const { category, subType } = stat.split();
      if (category === "abilities" && !stat.value) {
        //get specific game setting relative to untrained abilities
        const malus = settings.substr(subTypes[subType], 1);
        if (isNaN(malus)) { throw { msg: 'impossibleThrow' }; }
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
    if (document.isEmbedded) {//idem .isOwned
      return ['wonder'].includes(document.type);
    }
    return false;
  }


  static useCritical(throwMode) {
    return !!(throwMode & M20E.THROWMODE.RESULT_CRITICAL)
  }


  /* -------------------------------------------- */
  /*  Hooks                                       */
  /* -------------------------------------------- */

  /**
 * callback for custom hooks on updateCoreRollMode
 * update the DT current rollmode
 */
  onUpdateCoreRollMode = (newRollMode) => {
    this.updateData('rollMode', newRollMode);
  }

  /* -------------------------------------------- */
  /*  Macro to and from                           */
  /* -------------------------------------------- */

  /**
   * Called by hook on hotbarDrop with prepared dropedData from a onDragStart event
   * Populates a macro slot with relevant script to make a throw
   */
   static async toMacro(bar, dropedData, slot) {
    if ( dropedData.data === [] ) { return false; }
    const actor = utils.actorFromData(dropedData);
    if ( !actor ) { return; }

    //construct our macroData
    let macroData = {
      commandParameters : {...dropedData, data: {}},
      name : '',
      img: 'systems/mage-fr/assets/icons/d10.svg',
      type: 'script',
      scope: 'actor',
      flags: {"shiftKey": false}
    };
    //get name, img and proper 'data' from actor or item
    switch ( dropedData.type ) {
      case 'm20e-roll':
        const stats = actor.diceThrower._throw.stats;
        macroData.name = actor.getThrowFlavor(stats);
        macroData.commandParameters.data.stats = stats.map( stat => ({path: stat.path}));
        macroData.commandParameters.data.options = {}; //todo add options at some point
        //reset the actor's dt
        actor.diceThrower.resetAll();
        break;
      case 'Item':
        const item = actor.getItemFromId(dropedData.data._id);
        if ( !item ) { return false; }
        if ( !item.isRollable ) { return false; }
        macroData = foundry.utils.mergeObject(macroData, item.getMacroData(dropedData.data));
        break;
      default:
        //like when you dragdrop an existing macro onto another slot
        return false;
    }
    //construct our command
    const stringified = JSON.stringify(macroData.commandParameters);
    macroData.command = `game.m20e.mageMacro(${stringified},
      this.data.flags['shiftKey']);`;
  
    //actually create the macro in the desired slot
    const macro = await Macro.create({...macroData});
    return await game.user.assignHotbarMacro(macro, slot);
  }

  /**
   * Called by a macro click (or shift click)
   * Creates an Instance of DiceThrow from the macro parameters
   * either throwor open the app depending on shiftKey
   * @param  {Object} macroParams 
   * @param  {Boolean} shiftKey status of the shift key in the click event
   */
  static fromMacro(macroParams, shiftKey) {
    const actor = utils.actorFromData(macroParams);
    if ( !actor ) { return; }
    //todo : maybe add options in macro parameters ?
    let m20eThrow = null;
    let options = {};
    switch ( macroParams.type ) {
      case 'm20e-roll':
        m20eThrow = M20eThrow.fromData({stats: macroParams.data.stats});
        options = { //add shit later when we store options in the macro
        };
        break;
      case 'Item': //todo maybe use some other identifier ?
        const item = actor.getItemFromId(macroParams.data.itemId);
        const throwIndex = parseInt(macroParams.data.throwIndex);
        if ( !item ) { return false; }
        m20eThrow = item.data.data.throws[throwIndex];
        options = {...options,
          throwOwner: item,
          throwIndex: throwIndex,
          statLock: true
        };
        break;
      default:
        return;
    }
    if ( !m20eThrow ) { return ;}

    if ( shiftKey ) {
      //throw right away
      actor.diceThrower.throwDice(m20eThrow, options);
    } else {
      //display dice throw dialog
      actor.diceThrower.render(m20eThrow, options);
    }
  }
}