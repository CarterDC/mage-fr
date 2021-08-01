// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait, MageThrow } from "../utils/classes.js";
import M20eItem from './base-item.js'

/**
 * @extends {M20eItem}
 */
export default class M20eRollableItem extends M20eItem {

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
 

  }

  /**
   * @override
   */
  _prepareOwnedItem() {
    super._prepareOwnedItem();
    const itemData = this.data;

  }

  /**
   * @override
   */
  getTraitsToRoll() {
    return [];
  }

  /**
   * @override
   */
  getThrowFlavor() {
    return '';
  }


  _getFlavor() {
    return '';
  }

  _isActuallyRollable(actor=null) {
    actor = actor || this.actor;
    //check if actor is able to use this rote's effects
    const spheres = actor.data.data.spheres;
    return true;
  }

  async addEffect(availEffects) {
 
 
  }

  async updateEffectValue(effectIndex, value) {

  }

  async updateEffectKey(effectIndex, key) {

  }

  async removeEffect(effectIndex) {

  }
}
