// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, BaseThrow } from '../dice/dice-helpers.js'
import M20eRollableItem from './rollable-item.js'

/**
 * @extends {M20eRollableItem}
 */
export default class M20eRoteItem extends M20eRollableItem {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  /** @override */
  async _preCreate(data, options, user){
    await super._preCreate(data, options, user);
    const itemData = this.data;
    //check if item is from existing item (going in or out a compendiumColl or drag from actorSheet)
    if ( itemData.flags.core?.sourceId || itemData._id ) { return; }
    //update the throws array with one single entry
    const throws = [new BaseThrow()];
    itemData.update({['data.throws']: throws});
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
    return this.data.data.throws[0].traits.map(effect => effect.key);
  }

  _getFlavor() {
    return this.data.data.throws[0]?.traits.map(effect => 
      `${this.actor.locadigm(`traits.spheres.${effect.key}`)} (${effect.value})`
      ).join(' + ');
  }

  async addEffect(availEffects) {
    //get the first truly avail effect
    const firstKey = availEffects.filter(effect => effect.disabled === '')[0]?.key;
    if ( !firstKey ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.noMoreAvailEffects'));
      return;
    }
    const newTrait = new Trait({
      path: `spheres.${firstKey}`,
      data: {valueOverride:1}
    });
    const throws = duplicate(this.data.data.throws);
    throws[0].traits.push(newTrait);
    return await this.update({['data.throws']: throws});
  }

  async updateEffectValue(effectIndex, value) {
    const throws = duplicate(this.data.data.throws);
    throws[0].traits[effectIndex].data.valueOverride = value;
    return await this.update({['data.throws']: throws});
  }

  async updateEffectKey(effectIndex, key) {
    const throws = duplicate(this.data.data.throws);
    throws[0].traits[effectIndex].path = `spheres.${key}`;
    return await this.update({['data.throws']: throws});
  }

  async removeEffect(effectIndex) {
    const throws = duplicate(this.data.data.throws);
    throws[0].traits.splice(effectIndex, 1);
    return await this.update({['data.throws']: throws});
  }
}
