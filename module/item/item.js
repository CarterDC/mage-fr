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
    //useless but cool
    //creates a derived class for specific item types
    switch (data.type) {
      case 'paradigm':
        if ( context?.isSubClassed ) {
          super(data, context);
        } else {
          //specify our custom item class here
          //when the constructor for the new class calls it's super(), the isSubClassed flag will be true
          //thus by passing this whole process and just calling for super (which is Item)
          return new CONFIG.Item.documentClasses['paradigm'](data,{...{isSubClassed: true}, ...context});
        }
        break;
      default:
        //default behavior, just call super.
        super(data, context);
    }
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

