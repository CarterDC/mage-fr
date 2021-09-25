// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait } from '../dice/dice.js'
import * as chat from "../chat.js";

/**
 * Item class for base items (items that just contain data), 
 * also provides base functions for all derived item class
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /**
   * creates a derived class for specific item types
   * @override 
   */
  constructor(data, context) {
    if ( data.type in CONFIG.Item.documentClasses && !context?.isExtendedClass) {
        // instanciate our custom item subclass here
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

  /**
   * returns a pair {path, data} to populate the actor's stats in the _prepateItemStats()
   */
   getStatData() {
    const itemData = this.data;
    const cat = CONFIG.M20E.traitToCat[itemData.type];
    const subType = CONFIG.M20E.traitToCat[itemData.data.subType];
    const key = utils.sanitize(itemData.name);
    return {
      path: `${cat}.${subType ? subType + '.' : ''}${key}`,
      name: itemData.name,
      statData: {
        value: parseInt(itemData.data.value),
        itemId: itemData._id
      }
    }
  }

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
    return this.data.data.isRollable === true;
  }

  get isStat() {
    return this.data.data.isStat === true;
  }

  get isActive() { // todo : not sure atm
    return this.data.data.effects?.length > 0;
  }
}

