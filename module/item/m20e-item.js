// Import Helpers
import * as utils from '../utils/utils.js'
import DiceThrow from '../dice/dice-throw.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";
import * as chat from "../chat.js";

/**
 * Item class for base items (items that just contain data), 
 * also provides base functions for all derived item class
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /** @override */
  constructor(data, context) {
    //creates a derived class for specific item types
    if ( data.type in CONFIG.Item.documentClasses && !context?.isExtendedClass) {
        // specify our custom item subclass here
        return new CONFIG.Item.documentClasses[data.type](data,{...{isExtendedClass: true}, ...context});
    }    
    //default behavior, just call super and do all the default Item inits.
    super(data, context);
  }

  /* -------------------------------------------- */
  /*  New Item Creation                           */
  /* -------------------------------------------- */

  /**
   * adds image path and systemDescription before sending the whole thing to the database
   * prompts for subType if that particular item type does require one,
   * in order to get the matching img and systemDesc.
   *  @override
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const itemData = this.data;
    
    //check if item is from existing item (going in or out a compendiumColl or drag from actorSheet)
    if ( itemData.flags.core?.sourceId || itemData._id ) { return; }

    //item is brand new => set some default values before sending it to the database
    const updateData = {data: {}};
    // prompt for subtype if relevant
    if ( itemData.data.subType && !options.fromActorSheet ) {
      const newSubType = await this.promptForSubType(itemData);
      updateData.data.subType = newSubType || itemData.data.subType;
    }
    //get specific type (subtype if any, otherwise base type)
    const specificType = updateData.data.subType || itemData.data.subType || itemData.type;
    //get appropriate default image
    updateData.img = CONFIG.M20E.defaultImg[specificType] || CONFIG.M20E.defaultImg[itemData.type] || CONFIG.M20E.defaultImg['default'];
    //get appropriate systemDescription
    if ( itemData.data.systemDescription === '') {
      updateData.data.systemDescription = await utils.getDefaultDescription(specificType);
    }
    itemData.update( updateData );
  }

  /**
   * Prompts the user for a subType from dropDown list of available subtypes for this particular itemType
   * @param {ItemData} itemData an instance of ItemData
   * 
   * @returns {Promise<String|null>} selected subType or null if user escaped the prompt
   */
  async promptForSubType(itemData) {
    const itemType = itemData.type;
    //build list of subTypes to be fed to the promptSelect()
    const subTypes = Object.entries(
      foundry.utils.getProperty(CONFIG.M20E, `${itemType}SubTypes`))
      .map(([key, value]) => {
        return {value: key, name: game.i18n.localize(value)};
    });

    return utils.promptSelect({
      title: itemData.name,
      promptString: game.i18n.format('M20E.prompts.subTypeContent', {
        type: game.i18n.localize(`ITEM.Type${itemType.capitalize()}`)
      }),
      curValue: subTypes[0].key,
      options: subTypes
    });
  }

  /* -------------------------------------------- */
  /*  Item Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
    //check if item type is amongst protected types
    const protectedTypes = CONFIG.M20E.protectedCategories.reduce( (acc, cur) => {
      const itemType = CONFIG.M20E.categoryToType[cur]
      return itemType ? [...acc, itemType] : acc;
    }, []);
    this.data.protectedType = protectedTypes.includes(this.type);
  }

  /**
   * called at the end of actor._prepareData to deal with owned items whose data depend on the actor.
   * Implemented in subClasses
   */
   _prepareOwnedItem() {}

  /* -------------------------------------------- */
  /*  Shorthands                                  */
  /* -------------------------------------------- */

  get isRollable() {
    return this.data.data.isRollable;
  }

  get isTrait() {
    return this.data.data.isTrait;
  }

  get isActive() { // todo : not sure atm
    return this.data.data.effects?.length > 0;
  }

  /* -------------------------------------------- */
  /*  Roll related                                */
  /* -------------------------------------------- */

  /**
   * Implemented in every rollable subClasses
   */
  getTraitsToRoll(throwIndex=0) {}

  /**
   * Implemented in every rollable subClasses
   */
  getThrowFlavor(xTraitsToRoll=[]) {}

  getMacroData(data) {
    const itemType = game.i18n.localize(`ITEM.Type${this.type.capitalize()}`);
    return {
      name : `${itemType} ${this.name}`,
      img: this.img,
      commandParameters : {
        data: {
          itemId: this.id
        }
      }
    }
  }

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   * called by a DiceThrow when item is the main document (instead of an actor)
   * 
   * @return {Array} an array of {@link ExtendedTrait} 
   */
  extendTraits(traitsToRoll) {
    return traitsToRoll.map(trait => {
      const extendedData = this.actor.getExtendedTraitData(trait);
      
      return new ExtendedTrait({...extendedData, ...trait});
    });
  }

  /**
   * 
   * @return {Object} data needed to populate an ExtendedTrait
   */
  getExtendedTraitData() {
    if ( !this.isTrait ) { return null; }
    return {
      name: this.name,
      displayName: this.data.data.displayName,
      value: parseInt(this.data.data.value),
      specName:  this.data.data.specialisation
    }
  }

  getTraitData() {
    return {
      cat: CONFIG.M20E.traitToCat[this.data.type],
      subType: CONFIG.M20E.traitToCat[this.data.data.subType] || null,
      key: utils.sanitize(this.data.name),
      data: {
        name: this.data.name,
        displayName: this.data.data.displayName || '',
        value: parseInt(this.data.data.value),
        specName:  this.data.data.specialisation || '',
        itemId: this.data._id
      }
    }
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
    const traitsToRoll = this.getTraitsToRoll(throwIndex);
    const diceThrow = new DiceThrow({
      document: this,
      traitsToRoll: traitsToRoll
    });
    if ( shiftKey ) {
      //throw right away
      diceThrow.throwDice();
    } else {
      //display dice throw dialog
      diceThrow.render(true);
    }
  }
}

