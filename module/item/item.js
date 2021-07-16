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
    switch (data.type) {
      case 'paradigm':
        if ( context?.isSubClassed ) {
          super(data, context);
        } else {
          return new CONFIG.Item.documentClasses['paradigm'](data,{...{isSubClassed: true}, ...context});
        }
        break;
      default:
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
/*
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

