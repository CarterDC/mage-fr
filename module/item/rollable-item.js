// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import DiceThrow from '../dice/dice-throw.js'
import { Trait, MageThrow } from "../utils/classes.js";
import M20eItem from './m20e-item.js'

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
    //recast each throw into a MageThrow instance.
    this.data.data.throws = this.data.data.throws.map( throwData => {
      throwData.traits = throwData.traits.map( traitData => {
        return Trait.fromData(traitData.path, traitData.data, traitData.itemId);
      });
      return new MageThrow(throwData);
    });
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

    /* -------------------------------------------- */
  /*  Roll related                                */
  /* -------------------------------------------- */

  getTraitsToRoll(throwIndex) {
    return this.data.data.throws[throwIndex].traits;
  }

  getThrowFlavor(throwIndex=0) {
    return '';
  }

  _getFlavor(throwIndex=0) {
    return '';
  }

  _isActuallyRollable(actor=null) {
    actor = actor || this.actor;
    return this.data.data.throws.some( mageThrow => mageThrow.isRollable(actor));
  }

   getMacroData(data) {
     const itemType = game.i18n.localize(`ITEM.Type${this.type.capitalize()}`);
     return {
       name : `${itemType} ${this.name}`,
       img: this.img,
       commandParameters : {
         data: {
           itemId: this.id,
           throwIndex: data.throwIndex
         }
       }
     }
   }

   /**
    * Extends an array of {@link Trait} with relevant values to Throw dices
    * called by a DiceThrow when item is the main document (instead of an actor)
    */
   extendTraits(traits) {//todo : overrride for talismans to use own traits
     traits.map(trait => {
      trait.data = {...trait.data, ...this.actor.getExtendedTraitData(trait)};
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
     if ( !this.isRollable ) { return null; }
 
     //retrieve traits to roll
     const traits = this.getTraitsToRoll(throwIndex);
     const diceThrow = new DiceThrow({
       document: this,
       traits: traits,
       throwIndex: throwIndex,
       options: this.data.data.throws[throwIndex].options
     });
     if ( shiftKey ) {
       //throw right away
       diceThrow.throwDice();
     } else {
       //display dice throw dialog
       diceThrow.render(true);
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
