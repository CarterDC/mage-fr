/**************************************************************
 * Classes and functions related to dice rolls                 
 * 
 */


// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";


/**
 * Helper class
 * Uniquely defines a Trait object by it's path relative to ActorData.data.traits.
 * Traits can be 'extended' storing roll necessary infos in the 'data' property.
 * can also contain an itemId associated to the trait path.
 */
 export class Trait {

  /**
   * @param  {Object} obj {path, itemId, data}
   */
  constructor(obj) {
      this.path = obj.path;
      this.itemId = obj.itemId || '';
      this.data = obj.data || null;
  }

  /**
   * Creates a new instance of Trait by getting infos from an html element's parents (.trait and .category)
   * Use as a convenient way to create and transport a path and or itemId
   * from a html element with dataset to any function that uses either a trait path or itemId
   * 
   * @param  {HTMLElement} htmlElem an html element inside a '.trait' inside a '.category'
   * 
   * @returns {Trait|null} a Trait object made from the aquired info or null
   */
  static fromElement(htmlElem) {
    const traitElem = htmlElem.closest(".trait");
    const path = traitElem.dataset.path;
    const itemId = traitElem.dataset.itemId

    if ( !path && !itemId) { return null; }
    return new Trait({
      path: path || '',
      itemId: itemId || ''
    });
  }

  /**
   * Returns an instance of a Trait created from arguments
   * not sure it's usefull to do this that way, might drop it.
   * @param  {String} path
   * @param  {Object} data={} 
   * @param  {String} itemId='' super optionnal
   * 
   * @returns {Trait|null} a Trait object made from the arguments or null
   */
  static fromData(path, data={}, itemId='') { 
    if ( !path ) { return null; }
    return new Trait({path: path, data: data, itemId: itemId});
  }

  /* -------------------------------------------- */
  /*  Path related                                */
  /* -------------------------------------------- */

  /**
   * Parses a path into an object containing category, subType and key
   * @param  {String} path a path relative to data.traits
   * 
   * @returns {object} {category, subType|null, key|null}
   */
  static splitPath(path) {
    const propKeys = path.split('.');
    return {
      category: propKeys[0],
      subType: propKeys.length === 3 ? propKeys[1] : null,
      key: propKeys.length === 3 ? propKeys[2] : (propKeys[1] || null)
    };
  }

  /**
   * Parses the trait's own path into an object containing cat, subType, key
   * @returns {object} {category, subType|null, key|null}
   */
  split() {
    return {...Trait.splitPath(this.path), itemId: this.itemId};
  }

  get category() {
    const propKeys = this.path.split('.');
    return propKeys[0];
  }

  get subType() {
    const propKeys = this.path.split('.');
    return propKeys.length === 3 ? propKeys[1] : null;
  }

  get key() {
    const propKeys = this.path.split('.');
    return propKeys.length > 1 ? propKeys[propKeys.length - 1] : null;
  }

  /* -------------------------------------------- */
  /*  data related                                */
  /* -------------------------------------------- */

  /**
   * Returns the Trait value or its overriden value (ie: in the case of rote effects)
   */
  get value() {
    return this.data.valueOverride >= 0 ? this.data.valueOverride : this.data.value;
  }

  /**
   * Returns whether user is allowed to use 
   */
  get canUseSpec() {
    return this.value >= 4 && this.data.specialisation !== '';
  }

  get useSpec() {
    return this.canUseSpec && this.data.useSpec;
  }

  get name() {
    return this.useSpec ? this.data.specialisation : 
      (this.data.displayName ? this.data.displayName : this.data.name);
  }

  get specName() {
    return this.useSpec ? this.name : this.data.specialisation;
  }


  get isItem() {
    return this.itemId !== ''; //todo can do better in some circumstances
  }

  get isExtended() {
    return this.data.value >= 0;
  }
}


/**
 * helper class 
 */
 export class MageThrow {
  constructor(obj={}) {
    this.name = obj.name || '';
    this.description = obj.description || '';
    this.traits = obj.traits || [];
    this.options = obj.options || {};
  }
  /**
   * Check whether actor is able to/allowed to perform this throw according to the rules
   * @param  {M20eActor} actor
   */
  isRollable(actor) {
    if( this.traits.every( trait => trait.category === "spheres" ) ) {
      //throw is a magical effect => actor MUST have all spheres at the requiered level
      return this.traits.every( trait => {
        const actorValue = foundry.utils.getProperty(actor.data.data.traits, `${trait.path}.value`);
        return actorValue >= trait.value;
      });
    } else {
      const settings = game.settings.get("mage-fr", "untrainedMalus");
      const abilities = this.traits.filter( trait => trait.category === 'abilities');
      if ( !settings.includes('X') || abilities.length === 0 ) { return true; }
      //if throw constains a 0 level ability => check settings regarding ability subType
      const subTypes = {talents: 0, skills: 1, knowledges: 2};
      return !abilities.some( ability => {
        const actorValue = foundry.utils.getProperty(actor.data.data.traits, `${ability.path}.value`);
        return actorValue === 0 && settings.substr(subTypes[ability.subType],1) === 'X';
      });
    }
  }

  getFlavor(actor) {
    let flavor = '';
    if ( actor ) {
      flavor = this.traits.map(trait => {
        const {name, displayName} = actor.getExtendedTraitData(trait);
        return displayName || name;
      }).join(' + ');
    } else {
      flavor = this.traits.map(trait => 
      `${foundry.utils.getProperty(CONFIG.M20E.traits, trait.path)}`
      ).join(' + ');
    }
    const thresholdBase = this.options.thresholdBase || game.settings.get("mage-fr", "baseRollThreshold");
    const thresholdMod = this.options.thresholdMod || 0;
    const thresholdTotal = parseInt(thresholdBase) + parseInt(thresholdMod);
    return `(${flavor} ${game.i18n.localize('M20E.labels.thrsh')}${thresholdTotal})`;
  }
}


/**
 * A Die DiceTerm that only has 'S' faces
 * used solely by the 'xs' modifier with an actual result of 10
 * @extends {Die}
 */
export class DieSuccess extends Die {
  constructor(termData={}) {
    termData.faces=10;
    super(termData);
    if ( termData.autoSuccess ) {
      this.results = [...Array(termData.number)].map(() => {
        return {active: true, result:10, "success": true, "count": 1};
      });
      this._evaluated = true;
    }
  }

  /** @override */
  static DENOMINATION = "s" ;

  /** @override */
  getResultLabel(result) {
    return {
      "1": 'S',
      "2": 'S',
      "3": 'S',
      "4": 'S',
      "5": 'S',
      "6": 'S',
      "7": 'S',
      "8": 'S',
      "9": 'S',
      "10": 'S'
    }[result.result];
  }
}

export class MageRoll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
  }

  static CHAT_TEMPLATE = "systems/mage-fr/templates/dice/mage-roll.hbs";
  static TOOLTIP_TEMPLATE = "systems/mage-fr/templates/dice/mage-tooltip.hbs";

  /**
   * Copy of the vanilla Foundry
   * Modify the roll that's passed to the chatMessage
   * if roll contains 'xs' dice adds new term
   * todo : put that in function
   * @override
   */
  async toMessage(messageData={}, {rollMode, create=true}={}) {
      // Perform the roll, if it has not yet been rolled
      if (!this._evaluated) await this.evaluate({async: true});
  
      // Prepare chat data
      messageData = foundry.utils.mergeObject({
        user: game.user.id,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        content: this.total,
        sound: CONFIG.sounds.dice,
      }, messageData);
      messageData.roll = this.getRollForMessage();
      
      // Either create the message or just return the chat data
      const cls = getDocumentClass("ChatMessage");
      const msg = new cls(messageData);
      if ( rollMode ) msg.applyRollMode(rollMode);
      
      // Either create or return the data
      if ( create ) return cls.create(msg.data, {rollMode: rollMode});
      else return msg.data;
  }

  getRollForMessage() {
    const explosions = this.terms[0].explosions;
    if ( !explosions ) { return this; }

    const roll = this;
    //remove results of exploded dice
    roll.terms[0].results.splice(roll.terms[0].results.length - explosions, explosions);
    //add success dieterm
    roll.terms.push(new CONFIG.Dice.terms["s"]({
      number: explosions,
      autoSuccess: true}));
    return roll;
  }

  /**
   * Render the tooltip HTML for a Roll instance
   * @return {Promise<string>}      The rendered HTML tooltip as a string
   */
  async getTooltip() {
    const parts = this.dice.map(d => d.getTooltipData());
    const part = parts.reduce((acc, cur) => {
        return {total: acc.total + cur.total, rolls: [...acc.rolls, ...cur.rolls]};
      },{total: 0, rolls:[]});
      part.options= this.options;
    return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { part });
  }

  /**
   * Render a Roll instance to HTML
   * @param {object} [chatOptions]      An object configuring the behavior of the resulting chat message.
   * @return {Promise<string>}          The rendered HTML template as a string
   */
  async render(chatOptions={}) {
    chatOptions = foundry.utils.mergeObject({
      user: game.user.id,
      flavor: null,
      template: this.constructor.CHAT_TEMPLATE,
      blind: false
    }, chatOptions);
    const isPrivate = chatOptions.isPrivate;

    // Execute the roll, if needed
    if ( !this._evaluated ) this.evaluate();
    let newTotal = Math.round(this.total * 100) / 100;
    //todo : change real total value instead of that
    if (chatOptions.doUpgrade){
        newTotal +=1;
        this.options.isUpgraded = true;
    }

    const totalString = newTotal === 0 ? game.i18n.localize('M20E.throwresult.failure') :
      (newTotal > 0 ? game.i18n.format('M20E.throwresult.success', {total: newTotal}) : 
        game.i18n.format('M20E.throwresult.critfailure', {total: newTotal}));

    // Define chat data
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : chatOptions.flavor,
      user: chatOptions.user,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : newTotal,
      totalString : isPrivate ? "?" : totalString
    };

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }
}

//todo ; do that with a mageroll and custom message !
export function registerInitiative() {
  Combatant.prototype._getInitiativeFormula = function () {

    const actorData = this.actor.data;
    const initiative = foundry.utils.getProperty(actorData.data.traits, 'initiative.value');

    const formula = `1d10 + ${initiative}`;
    return formula;
  }
}

export function registerDieModifier(){
  Die.prototype.constructor.MODIFIERS["xs"] = "explodeSuccess";
  //modified copy of Foundry's Die.explode()
  Die.prototype.explodeSuccess = function(modifier) {

    // Match the explode or "explode once" modifier
    const rgx = /xo?([0-9]+)?([<>=]+)?([0-9]+)?/i;
    const match = modifier.match(rgx);
    if ( !match ) return false;
    let [max, comparison, target] = match.slice(1);

    // If no comparison or target are provided, treat the max as the target
    if ( max && !(target || comparison) ) {
      target = max;
      max = null;
    }

    // Determine target values
    target = Number.isNumeric(target) ? parseInt(target) : this.faces;
    comparison = comparison || "=";
    max = Number.isNumeric(max) ? parseInt(max) : null;

    // Recursively explode until there are no remaining results to explode
    let checked = 0;
    let initial = this.results.length;
    while ( checked < this.results.length ) {
      let r = this.results[checked];
      checked++;
      if (!r.active) continue;

      // Maybe we have run out of explosions
      if ( (max !== null) && (max <= 0) ) break;

      // Determine whether to explode the result and roll again!
      if ( DiceTerm.compareResult(r.result, comparison, target) ) {
        r.exploded = true;
        //register one more success & add a die
        this.explosions = (this.explosions || 0) + 1;
        this.results.push({result: this.faces, active: true, autoSuccess: true});
        if ( max !== null ) max -= 1;
      }
      if ( checked >= initial ) checked = this.results.length;
    }
  }
}