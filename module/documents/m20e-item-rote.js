// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";
import Trait from '../trait.js'
import M20eThrow from '../throw.js'
import M20eRollableItem from './m20e-item-rollable.js'

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
    
    //double check if ever needed 
    if ( itemData.data.throws.length === 0 ) {
      //update the throws array with one single entry

      const throws = [new M20eThrow([
        //stats
      ], {
        //data
        name: game.i18n.localize('M20E.new.throw'),
        type: itemData.type
      }, {
        //options
        
      })];
      itemData.update({['data.throws']: throws});
    }
  }

  _isActuallyRollable(actor) {
    return this.data.data.throws[0].isAbleToThrow(actor);
  }

  //get that's displayed on the actorsheet
  getMiniFlavor() {
    if ( !this.actor ) { return null; }
    const itemData = this.data;
    
    let miniFlavor = itemData.data.throws[0].stats.map( stat => {
      return `${stat.getLocalizedName(this.actor)} (${stat.value})`;
    }).join(' + ');

     return miniFlavor.length < 40 ? miniFlavor : miniFlavor.substring(0, 37) + "...";;
  }

  /**
   * @override
   */
  getThrowFlavor() {
    if ( !this.actor ) { return null; }
    const itemData = this.data;

    const itemType = game.i18n.localize(`ITEM.Type${this.type.capitalize()}`);
    const effect = itemData.data.throws[0].stats.map( stat => {
      return `${stat.getLocalizedName(this.actor)} (${stat.value})`;
    }).join(' + ');

    return `${itemType} ${this.name} : <br>
      ${game.i18n.format('M20E.diceThrows.effect', {effect: effect})}.`;
  }

  get roteEffects() {
    return this.data.data.throws[0].stats.map(effect => effect.key);
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
    throws[0].stats.push(newTrait);
    return await this.update({['data.throws']: throws});
  }

  async updateEffectValue(effectIndex, value) {
    const throws = duplicate(this.data.data.throws);
    throws[0].stats[effectIndex].data.valueOverride = value;
    return await this.update({['data.throws']: throws});
  }

  async updateEffectKey(effectIndex, key) {
    const throws = duplicate(this.data.data.throws);
    throws[0].stats[effectIndex].path = `spheres.${key}`;
    return await this.update({['data.throws']: throws});
  }

  async removeEffect(effectIndex) {
    const throws = duplicate(this.data.data.throws);
    throws[0].stats.splice(effectIndex, 1);
    return await this.update({['data.throws']: throws});
  }
}
