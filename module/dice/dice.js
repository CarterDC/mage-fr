// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";


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
    const dext = parseInt(foundry.utils.getProperty(actorData,'data.attributes.dext.value'));
    const wits = parseInt(foundry.utils.getProperty(actorData,'data.attributes.wits.value'));
    const initiative = dext + wits;

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