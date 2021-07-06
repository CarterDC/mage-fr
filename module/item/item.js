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
  constructor(...args) {
    super(...args);
  }

  async _preCreate(data, options, user) {
    //deal with img against type/subType
    //deal with systemDescription
    log({"_preCreate Data": data});
  }

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
  }
}

