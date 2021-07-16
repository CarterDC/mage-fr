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

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    //get specific type (subtype if any otherwise base type)
    const specificType = this.data.data.subType || this.data.type;

    const obj = {data: {}};
    //deal with default image
    obj.img = CONFIG.M20E.defaultImg[specificType] || CONFIG.M20E.defaultImg[this.data.type] || CONFIG.M20E.defaultImg['default'];
    //deal with systemDescription
    if ( this.data.data.systemDescription === '') {
      obj.data.systemDescription = await utils.getDefaultDescription(specificType);
    }
    this.data.update( obj );
  }

  /* theses functions are now in the class specific file para-item.js

  getLexiconEntry(relativePath) {
    if ( this.type !== 'paradigm' ) { return; }
    return foundry.utils.getProperty(this.data.data.lexicon, relativePath);
  }

  async setLexiconEntry(relativePath, newValue) {
    if ( this.type !== 'paradigm') { return; }
    if ( newValue === '' ) { return; } // TODO ; maybe implement removal on empty string ? 
    let obj = {};
    obj[`data.lexicon.${relativePath}`] = newValue;
    return await this.update(obj);
  }*/
}

