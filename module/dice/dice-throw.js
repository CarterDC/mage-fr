// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, MageThrow } from '../dice/dice.js'

export const TROWSETTINGS_BLANDROLL = 1;
export const TROWSETTINGS_DEDUCTFAILURE = 2;
export const TROWSETTINGS_DFXPLODESUCCESS = 3;

/**
 * Manages everything dice throws related in mage-fr.
 * Can do standalone 'quick throw' or display it's own DiceDialog Application to drive throw options 
 */
export default class DiceThrow {

  /**
   * class DiceThrow takes either actor or item as document
   * and an array of {@link Trait} objects.
   * @param {Object} args {document, traits, throwIndex, options}
   */
  constructor(args) {
    const {document, traits=[], throwIndex=0, options={}} = args;
    if ( !document ) { throw 'M20E | Enable to create proper DiceThrow instance' }
    if ( document.isEmbedded && !document.isRollable ) { throw 'M20E | Enable to create proper DiceThrow instance' }

    this._app = null;
    this._document = document; //either an actor or owned item
    this._traits = traits;
    this._thowIndex = throwIndex;//todo : put throwindex in the options !
    this.options = options;
    this._initialized = false;
  }

  /**
   * intitialises the DiceThrow with options.properties || default
   * todo : add support for extended throws
   */
  initialize() {
    this.rollMode = this.options.rollMode !== undefined ? this.options.rollMode : game.settings.get("core", "rollMode");
    this.isItemThrow = this._document.isEmbedded === true;

    this.dicePoolMods = {
      userMod: 0,
      optionsMod: this.options.dicePoolMod || 0
    };

    this.thresholdBase = this.options.thresholdBase || game.settings.get("mage-fr", "baseRollThreshold");
    this.thresholdChosen = this.thresholdBase;
    this.thresholdMods = {
      optionsMod: this.options.thresholdMod || 0
    };

    this.throwSettings = this.options.throwSettings || TROWSETTINGS_DEDUCTFAILURE;

    this.initTraits();
    this.prepareData();
    this._initialized = true;
  }

  /**
   * Ask the document to extend the traits array with relevant values to execute/display the throw (name, specialisation, value, valueMax etc...) 
   * separate init for extended traits
   * since it's not meant to be redone unless actor has been updated
   */
  initTraits() {
    this._document.extendTraits(this._traits);
  }

  /**
   * Calculates and store some relevant data for display / roll
   * also called by every update method call in order to display accurate values in case diceThrow has an App
   */
  prepareData() {
    this.isEffectRoll = DiceThrow.getIsEffectRoll(this._traits);

    //dice pool
    this.dicePoolBase = this.getDicePoolBase();
    this.dicePoolMods.healthMod = this.getHealthMod();
    this.dicePoolTotal = Math.max(this.dicePoolBase + this.dicePoolMod, 1);

    //threshold
    this.thresholdMods.untrainedMod = this.getUntrainedMod();
    this.thresholdTotal = Math.clamped(this.thresholdChosen + this.thresholdMod, 2, 10);
    //flavor
    this.flavor = this._document.getThrowFlavor(this._traits, this._thowIndex);
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
    if ( this.isWonderThrow ) {
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
    const rollData = {
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
    }
    //rollData is also passed in the roll options, so as to be avail later
    const formula = `(@dicePoolTotal)d10${rollData.tenXplodeSuccess}cs>=(@thresholdTotal)${rollData.deductFailures}`;
    return new CONFIG.Dice.MageRoll(formula, rollData, rollData);
  }

  /**
   * @returns the document itself or it's parent is document is an owned item
   */
  get actor() {
    return this._document.isEmbedded ? this._document.parent : this._document;
  }

  /**
   * @returns whether document is an item with an arete score, ie a wonder/talisman
   */
  get isWonderThrow() {
    return this.isItemThrow && this._document.data.data.arete;
  }

  /**
   * @returns {Number} sum of negative dice pool modifiers
   */
  get dicePoolMalus() {
    return Object.values(this.dicePoolMods).reduce((acc, cur) => {
      return acc + ( cur < 0 ? cur : 0);
    }, 0);
  }

  /**
   * @returns {Number} sum of positive dice pool modifiers
   */
  get dicePoolBonus() {
    return Object.values(this.dicePoolMods).reduce((acc, cur) => {
      return acc + ( cur > 0 ? cur : 0);
    }, 0);
  }

  /**
   * @returns {Number} sum of ALL dice pool modifiers
   */
  get dicePoolMod() {
    return Object.values(this.dicePoolMods).reduce((acc, cur) => {
      return acc + cur;
    }, 0);
  }

  /**
   * @returns {Number} sum of ALL difficulty threshold modifiers capped at -3/+3
   */
   get thresholdMod() {
    return Math.clamped(Object.values(this.thresholdMods).reduce((acc, cur) => {
      return acc + cur;
    }, 0), -3, 3);
  }

  /**
   * computes the base dice pool
   * arete score for magic throws, or sum of the traits values
   * 
   * @returns {Number} the base dice pool for this throw
   */
  getDicePoolBase() {
    if ( this.isEffectRoll ) {
      //dice pool base is just arete
      //items might have an arete score (ie Wonders, Talismans...)
      return this._document.data.data.arete || this.actor.data.stats.magick.arete.value;
    } else {
      //dice pool base is sum of all values
      return this._traits.reduce((acc, cur) => {
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
    if ( this.isWonderThrow ) { return 0;} //wonders don't have a health malus
    let healthMod = 0;
    if ( game.settings.get("mage-fr", "useHealthMalus") ) {
      if ( this.isEffectRoll || this._traits[0]?.category === 'arete' ) {
        //throw is pure magic check for specific setting
        healthMod = game.settings.get("mage-fr", "useHealthMalusForMagic") ? 
          this.actor.data.data.resources.health.malus * -1 : 0;
      } else {
        healthMod = this.actor.data.data.resources.health.malus * -1;
      }
    }
    return healthMod;
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
    this._traits.forEach( trait => {
      if ( trait.category === "abilities" && trait.value === 0 ) {
        //get specific game setting relative to untrained abilities
        const malus = settings.substr(subTypes[trait.subType],1);
        if ( isNaN(malus) ) { throw 'impossibleThrow'; }
        untrainedMod += parseInt(malus);
      }
    })
    return untrainedMod;
  }

  /**
   * magical effect is defined by there being only 'spheres' in the throw
   * @param {Array} an array of either Traits or ExtendedTraits
   * 
   * @returns {Boolean} whether every Trait in the throw constitutes a magical effect
   */
  static getIsEffectRoll(traits) {
    return traits.length !== 0 && traits.every( trait => trait.category === "spheres" );
  }

  /**
   * if the xs=10 modifier should be applied to this roll
   * given game settings and throw type (rote or specialisation activated by user)
   * @returns {Boolean} whether or not to apply the modifier
   */
  getExplodeSuccess() {
    if ( this.throwSettings === TROWSETTINGS_DFXPLODESUCCESS ) { return true; }
    if ( this._document.type === 'rote' && game.settings.get("mage-fr", "roteRule")) { return true; }
    return game.settings.get("mage-fr", "specialisationRule") &&
      this._traits.some( trait => trait.useSpec);
  }

  /* -------------------------------------------- */
  /*  {DiceDialog} App Handlers                 */
  /* -------------------------------------------- */

  /**
   * returns the (optionnal) application that drives the diceTrow
   * create an instance if needed
   * 
   * @returns {DiceDialogue} an instance of a DiceDialogue Application
   */
   get app() {
    //todo : maybe add game setting to prevent players from editing their throws ?
    if ( !this._app ) {
      const cls = CONFIG.M20E.diceThrowApp;
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
      this.initTraits();
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
    if ( !this._initialized || options.reInit ) {
      try {
        this.initialize();
      } catch (e) {
        ui.notifications.error(game.i18n.localize(`M20E.notifications.${e}`));
        return;
      }
    }
    this.app.render(force);
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
        macroData = foundry.utils.mergeObject(macroData, actor.getMacroData(dropedData.data));
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
    let document = null;
    let traits = [];
    let throwIndex =0;
    switch ( macroParams.type ) {
      case 'm20e-roll':
        document = actor;
        traits = macroParams.data.map(obj => new Trait(obj));
        break;
      case 'Item':
        const item = actor.getItemFromId(macroParams.data.itemId);
        throwIndex = parseInt(macroParams.data.throwIndex);
        if ( !item ) { return false; }
        //todo : add throwindex in that function
        if ( !item._isActuallyRollable(actor) ) { return false; } //todo add localized notification error
        document = item;
        traits = item.getTraitsToRoll(throwIndex);
        break;
      default:
        return;
    }
    if ( traits === [] ) { return; }
    
    //at last create our diceThrow
    const diceThrow = new DiceThrow({document, traits, throwIndex});
    if ( shiftKey ) {
      //throw right away
      diceThrow.throwDice();
    } else {
      //display dice throw dialog
      diceThrow.render(true);
    }
  }
}