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

  //todo : have a prepareData to add some nice values like isActuallyRollable

  /**
   * @override
   */
  getExtendedTraitData() {
    
    return {};
  }

  async addEffect(availEffects) {
    const firstKey = availEffects[0]?.key;
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

  async removeEffect(index) {

  }

  async updateEffect(index, value) {

  }
}
