// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";

const TROWSETTINGS_BLANDROLL = 1;
const TROWSETTINGS_DEDUCTFAILURE = 2;
const TROWSETTINGS_DFXPLODESUCCESS = 3;

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
    //todo : use options to modify values / mods
    this.dicePoolMods = {
      userMod: 0
    };
    this.thresholdBase = game.settings.get("mage-fr", "baseRollThreshold");
    this.thresholdMods = {//not so sure about that
      userMod: 0,
    };
    this.throwSettings = TROWSETTINGS_DEDUCTFAILURE;
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
    this.dicePoolBase = this.getDicePoolBase();
    this.dicePoolMods.healthMod = this.getHealthMod(),
    this.dicePoolMods.untrainedMMod = this.getUntrainedMod()
    this.dicePoolTotal = Math.max(this.dicePoolBase + this.dicePoolMod, 1);
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
    if ( this.isEffectRoll() ) {
      //dice pool base is just arete
      return this._document.data.data.arete;
    } else {
      //dice pool base is sum of all values
      return this.xTraitsToRoll.reduce((acc, cur) => {
        return acc + cur.value;
      }, 0);
    }
  }

  getHealthMod() {
    return game.settings.get("mage-fr", "useHealthMalus") ?
      (this.actor.data.data.health.malus * -1) : 0;
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

  get flavor() {
    return this._getFlavor(true);
  }

  _getFlavor(useParadigm = false) {
    //ⓈⓊ🅢🅤
  }

  isEffectRoll(){
    return this._traitsToRoll.length !== 0 && this._traitsToRoll.reduce((acc, cur) => {
      return acc && cur.category === 'spheres'
    }, true);
  }

  getExplodeSuccess(){
    if ( this.throwSettings === TROWSETTINGS_DFXPLODESUCCESS ) { return true; }
    return true;
    /*
    (this.throwSettings === TROWSETTINGS_DFXPLODESUCCESS)
    let xplodeSuccess = false;
    //xplodeSuccess = xplodeSuccess || (game.settings.get("mage-fr", "roteRule") && isRote);
    if(game.settings.get("mage-fr", "specialisationRule")){
      this.xTraitsToRoll.forEach(function (xTrait) {
          xplodeSuccess = xplodeSuccess || (xTrait.useSpec === true);
      })
    }
    return xplodeSuccess;*/
  }

  async throwDice() {
    //change formula according to throwSettings
    const deductFailures = (this.throwSettings === TROWSETTINGS_BLANDROLL) ? '' :  'df=1';
    //check if rote or spé or throwSettings to apply xs modifier
    const tenXplodeSuccess = this.getExplodeSuccess() ? "xs=10" : "";
    //nicely pack everything we gonna need for our roll and our message
    const rollData = {
      documentId: this._document.id,
      actorId: this.actor.id,
      traitsToRoll: this._traitsToRoll,
      option: this.options,
      dicePoolBase: this.dicePoolBase,
      dicePoolMods: this.dicePoolMods,
      dicePoolTotal: this.dicePoolTotal,
      thresholdBase: this.thresholdBase,
      thresholdMods: this.thresholdMods,
      thresholdTotal: this.thresholdBase,
      flavor: '',
      explodeSuccess: this.getExplodeSuccess() ? 'xs=10' : '',
      deductFailures: (this.throwSettings === TROWSETTINGS_BLANDROLL) ? '' :  'df=1'
    }
    const rollMode = this.rollMode || game.settings.get("core", "rollMode");
    const formula = `(@dicePoolTotal)d10${tenXplodeSuccess}cs>=(@thresholdTotal)${deductFailures}`;
    const mageRoll = new CONFIG.Dice.MageRoll(formula, rollData, rollData);
    //the async evaluation is gonna be done by the toMessage()
    return await mageRoll.toMessage({
      speaker : ChatMessage.getSpeaker({actor: this.actor}),
      flavor : rollData.flavor
    }, {rollMode});
  }
}