// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait, MageThrow } from "../utils/classes.js";
import M20eItem from './baseitem.js'

/**
 * @extends {M20eItem}
 */
export default class M20eRoteItem extends M20eItem {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  /** @override */
  async _preCreate(data, options, user){
    await super._preCreate(data, options, user);
    const itemData = this.data;
    //check if item is from existing item (going in or out a compendium coll)
    if ( itemData.flags.core?.sourceId ) { return; }
    //update the throws array with one single entry
    const throws = [new MageThrow()];
    itemData.update({['data.throws']: throws});
  }

  /**
   * @override
   */
  _prepareOwnedItem() {
    super._prepareOwnedItem();
    const itemData = this.data;
    itemData.data.flavor = this._getFlavor();
    itemData.data.isActuallyRollable = this._isActuallyRollable();
  }

  /**
   * @override
   */
  getTraitsToRoll() {
    return this.data.data.throws[0].traitsToRoll;
  }

  /**
   * @override
   */
  getThrowFlavor() {
    const itemType = game.i18n.localize(`ITEM.Type${this.type.capitalize()}`);
    const effect = this._getFlavor();

    return `${itemType} ${this.name} : <br>
    ${game.i18n.format('M20E.diceThrows.effect', {effect: effect})}.`;
  }

  get roteEffects() {
    return this.data.data.throws[0].traitsToRoll.map(effect => effect.key);
  }

  _getFlavor() {
    return this.data.data.throws[0]?.traitsToRoll.map(effect => 
      `${this.actor.locadigm(`spheres.${effect.key}`)} (${effect.value})`
      ).join(' + ');
  }

  _isActuallyRollable(actor=null) {
    actor = actor || this.actor;
    //check if actor is able to use this rote's effects
    const spheres = actor.data.data.spheres;
    return this.data.data.throws[0].traitsToRoll.reduce((acc, cur) => {
      return acc && (spheres[cur.key].value >= cur.value);
    }, true);
  }

  async addEffect(availEffects) {
    //get the first truly avail effect
    const firstKey = availEffects.filter(effect => effect.disabled === '')[0]?.key;
    if ( !firstKey ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.noMoreAvailEffects'));
      return;
    }
    const newTrait = new Trait({category:'spheres', key: firstKey});
    newTrait.value = 1;
    const throws = duplicate(this.data.data.throws);
    throws[0].traitsToRoll.push(newTrait);
    return await this.update({['data.throws']: throws});
  }

  async updateEffectValue(effectIndex, value) {
    const throws = duplicate(this.data.data.throws);
    throws[0].traitsToRoll[effectIndex].value = value;
    return await this.update({['data.throws']: throws});
  }

  async updateEffectKey(effectIndex, key) {
    const throws = duplicate(this.data.data.throws);
    throws[0].traitsToRoll[effectIndex].key = key;
    return await this.update({['data.throws']: throws});
  }

  async removeEffect(effectIndex) {
    const throws = duplicate(this.data.data.throws);
    throws[0].traitsToRoll.splice(effectIndex, 1);
    return await this.update({['data.throws']: throws});
  }
}
