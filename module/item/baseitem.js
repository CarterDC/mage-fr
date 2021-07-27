// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";


/**
 * Implements M20eItem as an extension of the Item class
 * Adds new methods for all items and for specific item types.
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /** @override */
  constructor(data, context) {
    //useless in the present case but cool
    //creates a derived class for specific item types
    if ( data.type in CONFIG.Item.documentClasses && !context?.isExtendedClass) {
        // specify our custom item subclass here
        // when the constructor for the new class will call it's super(),
        // the isExtendedClass flag will be true, thus bypassing this whole process
        // and resume default behavior
        return new CONFIG.Item.documentClasses[data.type](data,{...{isExtendedClass: true}, ...context});
    }    
    //default behavior, just call super and do random item inits.
    super(data, context);
  }

  /**
   * adds image path and systemDescription before sending the whole thing to the database
   *  @override
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const itemData = this.data;
    
    //check if item is from existing item (going in or out a compendium coll)
    if ( itemData.flags.core?.sourceId ) { return; }

    //get specific type (subtype if any otherwise base type)
    const specificType = itemData.data.subType || itemData.type;

    const updateData = {data: {}};
    //deal with default image
    updateData.img = CONFIG.M20E.defaultImg[specificType] || CONFIG.M20E.defaultImg[itemData.type] || CONFIG.M20E.defaultImg['default'];
    //deal with systemDescription
    if ( itemData.data.systemDescription === '') {
      updateData.data.systemDescription = await utils.getDefaultDescription(specificType);
    }
    itemData.update( updateData );
  }
  /**
   * 
   * @return {Object} data needed to populate an ExtendedTrait
   */
  getExtendedTraitData() {
    if ( !this.data.data.isTrait ) { return null; }
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
  // could have been in a subClass but it's just 3 functions anyway

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

