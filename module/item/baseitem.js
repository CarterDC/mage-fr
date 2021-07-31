// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";


/**
 * Implements M20eItem as an extension of the Item class
 * Adds new methods for all items and for specific item types.
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /** @override */
  constructor(data, context) {
    //creates a derived class for specific item types
    if ( data.type in CONFIG.Item.documentClasses && !context?.isExtendedClass) {
        // specify our custom item subclass here
        // when the constructor for the new class will call it's super(),
        // the isExtendedClass flag will be true, thus bypassing this whole process
        // and resume default behavior
        return new CONFIG.Item.documentClasses[data.type](data,{...{isExtendedClass: true}, ...context});
    }    
    //default behavior, just call super and do all the default Item inits.
    super(data, context);

    //check if protected type
    const protectedTypes = CONFIG.M20E.protectedCategories.reduce( (acc, cur) => {
      const itemType = CONFIG.M20E.categoryToType[cur]
      return itemType ? [...acc, itemType] : acc;
    }, []);
    this.protectedType = protectedTypes.includes(this.type);
  }

  get isProtected() {
    return this.protectedType && this.actor?.data.data.creationDone;
  }

  get isRollable() {
    return this.data.data.isRollable;
  }

  get isTrait() {
    return this.data.data.isTrait;
  }

  /**
   * adds image path and systemDescription before sending the whole thing to the database
   * prompts for subType if that particular item type does require one.
   * in order to get the matching img and systemDesc.
   *  @override
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const itemData = this.data;
    
    //check if item is from existing item (going in or out a compendium coll)
    if ( itemData.flags.core?.sourceId ) { return; }

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

  /**
   * called at the end of actor._prepareData to deal with owned items whose data depend on the actor.
   * Implemented in subClasses
   */
  _prepareOwnedItem() {}

  getTraitsToRoll(throwIndex=0) {}

  getThrowFlavor(xTraitsToRoll=[]) {}

  get isActive() {
    return this.data.data.effects?.length > 0;
  }

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
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

  /* -------------------------------------------- */
  /*  Paradigm Item Specific                      */
  /* -------------------------------------------- */
  // could have been in a subClass but it's just 4 functions anyway

  /**
   * @param  {String} relativePath a localization path relative to the M20E root.
   */
  locadigm(relativePath) {
    const lexiconValue = this.getLexiconEntry(relativePath);
    return lexiconValue ? lexiconValue : game.i18n.localize(`M20E.${relativePath}`);
  }

  /**
   * @param  {String} relativePath a property path relative to the item's lexicon object
   * 
   * @return {String|null} the value of the corresponding property or null if not found
   */
  getLexiconEntry(relativePath) {
    return foundry.utils.getProperty(this.data.data.lexicon, relativePath) || null;
  }

  /**
   * @param  {String} relativePath a property path relative to the item's lexicon object
   * @param  {String} newValue the new value to be updated or '' for a removal of the property
   */
  async setLexiconEntry(relativePath, newValue) {
    if ( newValue !== '' ) {
      return await this.update({[`data.lexicon.${relativePath}`]: newValue});
    } else {
      //we've been passed an empty string => remove entry from lexicon
      return await this.removeLexiconEntry(relativePath);
    } 
  }

  /**
   * Removes a lexicon entry
   * @param  {String} relativePath a property path relative to the item's lexicon object
   */
  async removeLexiconEntry(relativePath) {
    //the following assumes that all entries in the lexicon are valid in the first place ^^
    //i guess it also assumes that relativePath aren't more than 2 levels deep
    //otherwise function would have to be reccursive at some point ^^
    let deletePath = "";
    const keys = relativePath.split(".");
    const lexiconEntry = duplicate(this.data.data.lexicon[keys[0]]);

    if ( Object.keys(lexiconEntry).length > 1 ) {
      //entry contain multiple 'properties' => just remove the one
      deletePath = `data.lexicon.${keys[0]}.-=${keys[1]}`;
    } else {
      //entry contain only one 'property' => remove the entire entry
      deletePath = `data.lexicon.-=${keys[0]}`;
    }

    return await this.update({[deletePath]: null});
  }

}

