// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";

export const TROWSETTINGS_BLANDROLL = 1;
export const TROWSETTINGS_DEDUCTFAILURE = 2;
export const TROWSETTINGS_DFXPLODESUCCESS = 3;

/**
 * 
 * 
 */
export class DiceThrow {

  /** @override */
  constructor(args) {
    const {document=null, traitsToRoll=[], options={}} = args;
    if ( !document ) { return; }
    if ( document.isEmbedded && !document.isRollable ) { return; }

    this._app = null;
    this._document = document; //either an actor or owned item
    this._traitsToRoll = traitsToRoll;
    this.options = options;
    this.initialize();
  }

  /**
   * intitialises the DiceThrow with option values || default
   */
  initialize() {
    this.rollMode = this.options.rollMode !== undefined ? this.options.rollMode : game.settings.get("core", "rollMode");
    this.isItemThrow = this._document.isEmbedded === true;

    //todo : use options to modify values / mods ? for failed extended rolls maybe
    this.dicePoolMods = {
      userMod: 0
    };
    this.thresholdBase = this.options.thresholdBase || game.settings.get("mage-fr", "baseRollThreshold");
    this.thresholdMods = {//not so sure about that
      userMod: 0,
    };
    this.throwSettings = this.options.throwSettings || TROWSETTINGS_DEDUCTFAILURE;
    //todo : maybe have a success mods array + extended rolls

    this.initTraits();
    this.prepareData();
  }

  /**
   * separate init for extended traits
   */
  initTraits() {
    this.xTraitsToRoll = this._document.extendTraits(this._traitsToRoll);
  }

  /**
   * Calculates and store some relevant data for display / roll
   */
  prepareData() {
    this.isEffectRoll = this.getIsEffectRoll();
    this.dicePoolBase = this.getDicePoolBase();
    this.dicePoolMods.healthMod = this.getHealthMod(),
    this.dicePoolMods.untrainedMMod = this.getUntrainedMod()
    this.dicePoolTotal = Math.max(this.dicePoolBase + this.dicePoolMod, 1);
    //TODO : change that if ever a use for threshold modifiers
    this.thresholdTotal = this.thresholdBase;
    this.flavor = this.getFlavor();
  }
  
  static fromMacro(macroParams) {
    //todo : create new instance from macro parameters
  }

  getMacroParameters() {
    //todo : return parameters needed to populate a macro
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
    //nicely pack everything we gonna need for our roll and our message
    const rollData = {
      documentId: this._document.id,
      actorId: this.actor.id,
      traitsToRoll: this._traitsToRoll,
      options: this.options,
      deductFailures: (this.throwSettings === TROWSETTINGS_BLANDROLL) ? '' :  'df=1',
      tenXplodeSuccess: this.getExplodeSuccess() ? "xs=10" : "",
      dicePoolBase: this.dicePoolBase,
      dicePoolMods: this.dicePoolMods,
      dicePoolTotal: this.dicePoolTotal,
      thresholdBase: this.thresholdBase,
      thresholdMods: this.thresholdMods,
      thresholdTotal: this.thresholdTotal,
      flavor: this.flavor
    }

    const formula = `(@dicePoolTotal)d10${rollData.tenXplodeSuccess}cs>=(@thresholdTotal)${rollData.deductFailures}`;
    const mageRoll = new CONFIG.Dice.MageRoll(formula, rollData, rollData);

    //the async evaluation is gonna be done by the toMessage()
    //todo : use wonder's name as alias if relevant
    //TODO : check how rollmode has been fixed in 0.8.9
    await mageRoll.toMessage({
      speaker : ChatMessage.getSpeaker({actor: this.actor}),
      flavor : rollData.flavor
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
   * computes the base dice pool
   * arete score for magic throws, or sum of the traits values
   * 
   * @returns {Number} the base dice pool for this throw
   */
  getDicePoolBase() {
    if ( this.isEffectRoll ) {
      //dice pool base is just arete
      //items might have an arete score (ie Wonders, Talismans...)
      return this._document.data.data.arete || this.actor.data.data.arete;
    } else {
      //dice pool base is sum of all values
      return this.xTraitsToRoll.reduce((acc, cur) => {
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
      if ( this.isEffectRoll || this.xTraitsToRoll[0].category === 'arete' ) {
        //throw is pure magic check for specific setting
        healthMod = game.settings.get("mage-fr", "useHealthMalusForMagic") ? 
          this.actor.data.data.health.malus * -1 : 0;
      } else {
        healthMod = this.actor.data.data.health.malus * -1;
      }
    }
    return healthMod;
  }

  /**
   * computes a negative modifier to the dicePool
   * only 0 value abilities are concerned
   * actual malus depends on setting and ability subType
   * 
   * @returns {Number} a negative modifier
   */
  getUntrainedMod() {
    let untrainedMod = 0;
    const settings = game.settings.get("mage-fr", "untrainedMalus");
    if ( settings === "000" ) { return 0; }
    //settings is 3 digit string => first char for talents, second char for skills and third char for knowledges
    const subTypes = {talent: 0, skill: 1, knowledge: 2};
    //check if untrained ability
    this.xTraitsToRoll.forEach( trait => {
      if ( trait.category === "abilities" && trait.value === 0 ) {
        const item = this.actor.items.get(trait.itemId);
        if ( !item ) {
          //todo : localize
          ui.notifications.error(`M20E | Can't find item with Id : ${trait.itemId} on actor ${this.actor.name} !`);
          return untrainedMod;
        }
        //get specific game setting relative to untrained abilities
        untrainedMod -= parseInt(settings.substr(subTypes[item.data.data.subType],1));
      }
    })
    return untrainedMod;
  }

  /**
   * Creates the flavor string (or delegate that task to the item responsible)
   * 
   * @param  {Boolean} useParadigm unused atm
   * @returns {String} the roll flavor ready to be added tothe messageData
   */
  getFlavor(useParadigm = false) {
    if ( this.isItemThrow ) {
      //let the item deal with it !
      return this._document.getThrowFlavor(this.xTraitsToRoll);
    }
    if ( this.isEffectRoll ) {
      //pure magical throw => arete roll + all spheres with value in the effect 
      const throwEffect = this.xTraitsToRoll.map(effect => 
        `${this.actor.locadigm(`spheres.${effect.key}`)} (${effect.value})`
        ).join(' + ');
      return `${this.actor.locadigm('diceThrows.areteThrow')} :<br>
        ${game.i18n.format('M20E.diceThrows.effect', {effect: throwEffect})}.`
    }
    //regular roll (non item, non magical) compute flavor based on the number of traits inside the throw
    switch ( this.xTraitsToRoll.length ) {
      case 0: //no trait was selected
        return `${game.i18n.localize("M20E.diceThrows.freeThrow")}.`;
        break;
      case 1: //only one trait roll
      case 2: //classic (or not) 2 traits
        const throwTrait = this.xTraitsToRoll.map(trait => {
          return trait.useSpec ? `${trait.name}(S)` :
            ( trait.value === 0 ? `<span class= "red-thingy">${trait.name}</span>` : trait.name) ;
        }).join(' + ');
        return `${game.i18n.format("M20E.diceThrows.throwFor", {trait: throwTrait})}.`;
        break;
      default: //too many traits => don't bother
        return `${game.i18n.localize("M20E.diceThrows.mixedThrow")}.`;
    }
  }

  /**
   * magical effect is defined by there being only 'spheres' in the throw
   * @returns {Boolean} whether every Trait in the throw constitutes a magical effect
   */
  getIsEffectRoll() {
    return this._traitsToRoll.length !== 0 && this._traitsToRoll.reduce((acc, cur) => {
      return acc && cur.category === 'spheres'
    }, true);
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
      this.xTraitsToRoll.length !== 0 &&
      this.xTraitsToRoll.reduce((acc, cur) => (acc || cur.useSpec), false);
  }

  /* -------------------------------------------- */
  /*  {DiceDialogue} App Handlers                 */
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
   * @param  {Number} index
   */
  removeTrait(index) {
    this._traitsToRoll.splice(index, 1);
    this.xTraitsToRoll.splice(index, 1);
    this.update();
  }
  
  /**
   * updates the value of a trait from the extended traits array
   * from user interaction with clickable bullets on the DiceDialog App
   * note only allowed on actor magical effect throw
   * 
   * @param  {Number} index
   */
  updateTraitValue(index, newValue) {
    this.xTraitsToRoll[index].value = newValue;
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
  render(force=false) {
    this.app.render(force);
  }
}