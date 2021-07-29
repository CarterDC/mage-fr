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
    this._document = document;
    this._traitsToRoll = traitsToRoll;
    this.options = options;
    this.initialize();
  }

  /**
   * intitialises the DiceThrow with option values || default
   */
  initialize() {
    this.isItemThrow = this._document.isEmbedded === true;

    //todo : use options to modify values / mods
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
    this.flavor = this.getFlavor();
  }

  update() {
    //recalc shit
    this.prepareData();
    //render
    this.render(true);
  }

  render(force=false) {
    this.app.render(force);
  }

  get app() {
    //todo add game setting to prevent players from editing their throws
    if ( !this._app ) {
      const cls = CONFIG.M20E.diceThrowApp;
      this._app = new cls (this, {
        editable: game.user.isGM || true 
      });
    }
    return this._app;
  }

  static fromMacro(macroParams) {
    //todo : create new instance from macro parameters
  }

  getMacroParameters() {
    //todo : return parameters needed to populate a macro
  }

  get actor() {
    return this._document.isEmbedded ? this._document.parent : this._document;
  }

  get isWonderThrow() {
    return this.isItemThrow && this._document.data.data.arete;
  }

  get dicePoolMalus() {
    return Object.values(this.dicePoolMods).reduce((acc, cur) => {
      return acc + ( cur < 0 ? cur : 0);
    }, 0);
  }

  get dicePoolBonus() {
    return Object.values(this.dicePoolMods).reduce((acc, cur) => {
      return acc + ( cur > 0 ? cur : 0);
    }, 0);
  }

  get dicePoolMod() {
    return Object.values(this.dicePoolMods).reduce((acc, cur) => {
      return acc + cur;
    }, 0);
  }

  removeTrait(index){
    this._traitsToRoll.splice(index, 1);
    this.xTraitsToRoll.splice(index, 1);
    this.update();
  }

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

  getHealthMod() {
    if ( this.isWonderThrow ) { return 0;} //wonders don't have a health malus
    let healthMod = 0;
    if ( game.settings.get("mage-fr", "useHealthMalus") ) {
      if ( this.isEffectRoll ) {
        healthMod = game.settings.get("mage-fr", "useHealthMalusForMagic") ? 
          this.actor.data.data.health.malus * -1 : 0;
      } else {
        healthMod = this.actor.data.data.health.malus * -1;
      }
    }
    return healthMod;
  }

  getUntrainedMod() {
    let untrainedMalus = 0;
    const settings = game.settings.get("mage-fr", "untrainedMalus");
    if ( settings === "000" ) { return 0; }
    const subTypes = {talent: 0, skill: 1, knowledge: 2};
    //check if untrained ability
    this.xTraitsToRoll.forEach( trait => {
      if ( trait.category === "abilities" && trait.value === 0 ) {
        //get specific game setting relative to untrained abilities
        const item = this.actor.items.get(trait.itemId);
        if ( !item ) {
          //todo : localize
          ui.notifications.error(`M20E | Can't find item with Id : ${trait.itemId} on actor ${this.actor.name} !`);
          return untrainedMalus;
        }
        untrainedMalus -= parseInt(settings.substr(subTypes[item.data.data.subType],1));
      }
    })
    return untrainedMalus;
  }

  rotateSetting(mod) {
    this.throwSettings += mod;
    if ( this.throwSettings < TROWSETTINGS_BLANDROLL ) {
      this.throwSettings = TROWSETTINGS_DFXPLODESUCCESS;
    } else if ( this.throwSettings > TROWSETTINGS_DFXPLODESUCCESS ) {
      this.throwSettings = TROWSETTINGS_BLANDROLL;
    }
    this.render(true);
  }

  getFlavor(useParadigm = false) {
    //ⓈⓊ🅢🅤
    if ( this.isItemThrow ) {
      return this._document.getThrowFlavor(this.xTraitsToRoll);
    }
    if ( this.isEffectRoll ) {
      const throwEffect = this.xTraitsToRoll.map(effect => 
        `${this.actor.locadigm(`spheres.${effect.key}`)} (${effect.value})`
        ).join(' + ');
      return `${this.actor.locadigm('diceThrows.areteThrow')} :<br>
        ${game.i18n.format('M20E.diceThrows.effect', {effect: throwEffect})}.`
    }
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

  getIsEffectRoll() {
    return this._traitsToRoll.length !== 0 && this._traitsToRoll.reduce((acc, cur) => {
      return acc && cur.category === 'spheres'
    }, true);
  }

  getExplodeSuccess(){
    if ( this.throwSettings === TROWSETTINGS_DFXPLODESUCCESS ) { return true; }
    if ( this._document.type === 'rote' && game.settings.get("mage-fr", "roteRule")) { return true; }
    return game.settings.get("mage-fr", "specialisationRule") && 
      this.xTraitsToRoll.length !== 0 &&
      this.xTraitsToRoll.reduce((acc, cur) => (acc || cur.useSpec), false);
  }

  async throwDice() {
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
      thresholdTotal: this.thresholdBase,//todo : change if ever needed
      flavor: this.flavor
    }
    const rollMode = this.rollMode || game.settings.get("core", "rollMode");
    const formula = `(@dicePoolTotal)d10${rollData.tenXplodeSuccess}cs>=(@thresholdTotal)${rollData.deductFailures}`;
    const mageRoll = new CONFIG.Dice.MageRoll(formula, rollData, rollData);

    //the async evaluation is gonna be done by the toMessage()
    //todo : use wonder's name as alias if relevant
    return await mageRoll.toMessage({
      speaker : ChatMessage.getSpeaker({actor: this.actor}),
      flavor : rollData.flavor
    }, {rollMode});
  }
}