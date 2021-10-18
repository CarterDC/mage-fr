/**************************************************************
 * Classes and functions related to dice rolls                 
 * class DieSuccess extends Die
 * class MageRoll extends Roll
 * function registerInitiative()
 * function registerDieModifier() adds a new die modifier 'XS'
 */

// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";

/* -------------------------------------------- */
/*  DieSuccess die class                        */
/* -------------------------------------------- */

/**
 * A Die DiceTerm that only has 'S' faces
 * used solely by the 'xs' modifier with an actual result of 10
 * @extends {Die}
 */
export class DieSuccess extends Die {
  constructor(termData = {}) {
    termData.faces = 10;
    super(termData);
    if (termData.autoSuccess) {
      this.results = [...Array(termData.number)].map(() => {
        return { active: true, result: 10, "success": true, "count": 1 };
      });
      this._evaluated = true;
    }
  }

  /** @override */
  static DENOMINATION = "s";

  /** @override */
  getResultLabel(result) {
    return 'S';
  }
}

/* -------------------------------------------- */
/*  MageRoll Class                              */
/* -------------------------------------------- */

/**
 * Extension of the roll class, defines it's own templates, 
 * and management of die terms in case of XS modifiers.
 * also deals with mdofication of total score in case of willpower spending
 * @extends {Roll}
 */
export class M20eRoll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
  }

  static CHAT_TEMPLATE = "systems/mage-fr/templates/dice/m20e-roll.hbs";
  static TOOLTIP_TEMPLATE = "systems/mage-fr/templates/dice/m20e-tooltip.hbs";

  /**
   * Copy of the vanilla Foundry
   * Modify the roll that's passed to the chatMessage
   * if roll contains 'xs' dice adds new term
   * @override
   */
  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    // Perform the roll, if it has not yet been rolled
    if (!this._evaluated) await this.evaluate({ async: true });

    // Prepare chat data
    messageData = foundry.utils.mergeObject({
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: this.total,
      sound: CONFIG.sounds.dice,
    }, messageData);
    //get a modified roll stripped of the exploded dice
    //and replaced with success dice instead
    messageData.roll = this.getRollForMessage();

    // Either create the message or just return the chat data
    const cls = getDocumentClass("ChatMessage");
    const msg = new cls(messageData);
    if (rollMode) msg.applyRollMode(rollMode);

    // Either create or return the data
    if (create) return cls.create(msg.data, { rollMode: rollMode });
    else return msg.data;
  }

  //remove exploded dice from the first term
  //add a new term with success dice instead
  getRollForMessage() {
    const explosions = this.terms[0].explosions;
    if (!explosions) { return this; }

    const roll = this;
    //remove results of exploded dice
    roll.terms[0].results.splice(roll.terms[0].results.length - explosions, explosions);
    //add success dieterm
    roll.terms.push(new CONFIG.Dice.terms["s"]({
      number: explosions,
      autoSuccess: true
    }));
    return roll;
  }

  /**
   * Render the tooltip HTML for a Roll instance
   * @return {Promise<string>}      The rendered HTML tooltip as a string
   */
  async getTooltip() {
    const parts = this.dice.map(d => d.getTooltipData());

    const part = parts.reduce((acc, cur) => {
      return { total: acc.total + cur.total, rolls: [...acc.rolls, ...cur.rolls] };
    }, { total: 0, rolls: [] });

    part.data = {
      dpTotal: this.dice[0].number,
      diffTotal: this.getCsModifierValue(this.dice[0])
    };

    const data = this.options.data;
    if (data) {
      const dpTooltips = utils.getModsTooltipData(data.dicePoolMods);
      if ( dpTooltips.length ) {
        part.data.dpTooltips = [{
          name: game.i18n.localize(`M20E.throwMod.base`),
          class: 'underlined-thingy',// todo : underline !
          value: data.dicePoolBase
        }, ...dpTooltips];
      }
      const diffTooltips = utils.getModsTooltipData(data.difficultyMods, true);
      if ( diffTooltips.length ) {
        part.data.diffTooltips = [{
          name: game.i18n.localize(`M20E.throwMod.base`),
          class: 'underlined-thingy',// todo : underline !
          value: data.difficultyBase
        }, ...diffTooltips];
      }
      //attempts to extract success mods if any
      part.data = {...part.data, ...this.getNumericTerms()};
    } else {
      //attempts to extract success mods if any
      part.data = {...part.data, ...this.getNumericTerms()};
    }

    part.options = this.options;

    return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { part });
  }

  /**
   * not really numeric terms, only values that directly follows a + or - operator
   */
  getNumericTerms() {
    let positiveSum = 0, negativeSum = 0;
    for ( let i = 0; i < this.terms.length; i++ ) {
      if ( this.terms[i].operator === '+' ) {
        i++;
        positiveSum += this.terms[i].total;
      } else if ( this.terms[i].operator === '-' ) {
        i++;
        negativeSum += this.terms[i].total;
      } 
    }
    return {previousSuccesses: positiveSum, successThreshold: negativeSum };
  }

  /**
   * Returns the value of the Count Success modifier as if it were 'cs>='.
   * @param  {} dice
   */
  getCsModifierValue(dice) {
    for (let i = 0; i < dice.modifiers.length; i++) {
      let match = dice.modifiers[i].match(/cs?([<>=]+)?([0-9]+)?/i);
      if (match) {
        const [comparison, target] = match.splice(1);
        return comparison === '>=' ? parseInt(target) : parseInt(target) + 1;
      }
    }
    return null
  }

  /**
   * Render a Roll instance to HTML
   * @param {object} [chatOptions]      An object configuring the behavior of the resulting chat message.
   * @return {Promise<string>}          The rendered HTML template as a string
   */
  async render(chatOptions = {}) {
    chatOptions = foundry.utils.mergeObject({
      user: game.user.id,
      flavor: null,
      template: this.constructor.CHAT_TEMPLATE,
      blind: false
    }, chatOptions);
    const isPrivate = chatOptions.isPrivate;

    // Execute the roll, if needed
    if (!this._evaluated) this.evaluate();

    const total = Math.round(this.total * 100) / 100;

    // Define chat data
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : chatOptions.flavor,
      user: chatOptions.user,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : total,
      totalExtras: isPrivate ? "?" : this.getTotalExtras()
    };

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }

  get isCritFailure() {
    //sum up cuz there might be a regular dice + a success dice in there
    const diceTotal = this.dice.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);

    //in the abscence of a valid throwMode, roll is considered critAble by default
    const isCritAble = this.options?.data ? 
      this.options?.data.throwMode & CONFIG.M20E.THROWMODE.RESULT_CRITICAL : true;

    //determine if crit failure based on diceTotal and not roll total !
    return isCritAble && diceTotal < 0;
  }

  /**
   */
  getTotalExtras() {
    const extras = {
      class: '',
      label: ''
    };
    const rollRotal = Math.round(this.total * 100) / 100;
    const {previousSuccesses = 0, successThreshold = 0} = this.getNumericTerms();
    const totalString = successThreshold ? 
      `${rollRotal + successThreshold}/${successThreshold}` : 
      ( rollRotal !== 0 ? `${rollRotal}` : '');

    if ( this.isCritFailure ) {
      extras.class = 'red-thingy';
      extras.label = game.i18n.format('M20E.throwresult.critfailure', { total: totalString });
    } else if ( rollRotal <= 0 ) {
      //regular failure
      extras.label = game.i18n.format('M20E.throwresult.failure', { total: totalString });
    } else {
      //success
      extras.class = 'green-thingy';
      extras.label = game.i18n.format('M20E.throwresult.success', { total: totalString });
    }
    return extras;
  }
}

/**
 * todo : extend the whole combat class instead to deal with custom message template, tie breakers etc...
 */
export function registerInitiative() {
  Combatant.prototype._getInitiativeFormula = function () {

    const actorData = this.actor.data;
    const initiative = actorData.stats.secondary.initiative.value;

    const formula = `1d10 + ${initiative}`;
    return formula;
  }
}

/**
 * Adds the custom die modifier 'xs' explodeSuccess, that allows for added auto success on a 10 roll
 */
export function registerDieModifier() {
  Die.prototype.constructor.MODIFIERS["xs"] = "explodeSuccess";
  //modified copy of Foundry's Die.explode()
  Die.prototype.explodeSuccess = function (modifier) {

    // Match the explode or "explode once" modifier
    const rgx = /xo?([0-9]+)?([<>=]+)?([0-9]+)?/i;
    const match = modifier.match(rgx);
    if (!match) return false;
    let [max, comparison, target] = match.slice(1);

    // If no comparison or target are provided, treat the max as the target
    if (max && !(target || comparison)) {
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
    while (checked < this.results.length) {
      let r = this.results[checked];
      checked++;
      if (!r.active) continue;

      // Maybe we have run out of explosions
      if ((max !== null) && (max <= 0)) break;

      // Determine whether to explode the result and roll again!
      if (DiceTerm.compareResult(r.result, comparison, target)) {
        r.exploded = true;
        //register one more success & add a die
        this.explosions = (this.explosions || 0) + 1;
        this.results.push({ result: this.faces, active: true, autoSuccess: true });
        if (max !== null) max -= 1;
      }
      if (checked >= initial) checked = this.results.length;
    }
  }
}