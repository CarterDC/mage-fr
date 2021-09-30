//
import M20eItem from './m20e-item.js'

// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, BaseThrow } from '../dice/dice-helpers.js'
import DiceThrower from '../dice/dice-thrower.js'

/**
 * @extends {M20eItem}
 */
export default class M20eRollableItem extends M20eItem {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  /** @override */
  prepareData() {
    super.prepareData();
    //recast each throw into a BaseThrow instance.(it will recast traitDatas into Traits as well)
    this.data.data.throws = this.data.data.throws.map( throwData => {
      return throwData instanceof BaseThrow ? throwData : BaseThrow.fromData(throwData);
    });
  }

  /**
   * @override
   */
   _prepareOwnedItem() {
    super._prepareOwnedItem();
    const itemData = this.data;
    //itemData.data.flavor = this._getFlavor();
    //itemData.data.isActuallyRollable = this._isActuallyRollable();
  }

    /* -------------------------------------------- */
  /*  Roll related                                */
  /* -------------------------------------------- */

  getStats(throwIndex) {
    return this.data.data.throws[throwIndex].stats;
  }

  getThrowFlavor(throwIndex=0) {
    return '';
  }

  _getFlavor(throwIndex=0) {
    return '';
  }

  /*_isActuallyRollable(actor=null) {
    actor = actor || this.actor;
    return this.data.data.throws.some( mageThrow => mageThrow.isRollable(actor));
  }*/




  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   */
  getExtendedStats(stats) {
    return stats.map( trait => {
      const xData = trait.isItem ? 
        this.actor.getItemFromId(trait.itemId).getExtendedTraitData(trait.path) :
        this.actor.getExtendedTraitData(trait.path);
      return new Trait({
        path: trait.path,
        itemId: trait.itemId,
        data: {...trait.data, ...xData}
      });
    });
  }

   /**
    * get traits from a rollable item for the specific throw index (ie rotes only have 1 throw so it's index 0)
    * create a new {@link DiceThrow} from traitsToRoll and either throw or open config App based on shiftkey status
    * 
    * @param  {Boolean} shiftKey
    * @param  {Number} throwIndex=0 
    */
   roll(shiftKey, throwIndex = 0) {
    debugger
    const baseThrow = BaseThrow.fromData(this.data.data.throws[throwIndex]);
    baseThrow.options.throwIndex = throwIndex;
    const diceThrower = DiceThrower.create(this, baseThrow);
    if ( !diceThrower ) { return; }
    if ( shiftKey ) {
      //throw right away
      diceThrower.throwDice();
    } else {
      //display dice throw dialog
      diceThrower.render(true);
    }
  }

  getMacroData(data) {
    const itemType = game.i18n.localize(`ITEM.Type${this.type.capitalize()}`);
    return {
      name : `${itemType} ${this.name}`,
      img: this.img,
      commandParameters : {
        data: {
          itemId: this.id,
          throwIndex: data.throwIndex || 0
        }
      }
    }
  }
}
