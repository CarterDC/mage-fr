// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import M20eItem from './item.js'

/**
 * Implements M20eParadigmItem as an extension of the M20eItem class
 * Adds specific methods for paradigm items only.:
 * @extends {M20eItem}
 */
export default class M20eParadigmItem extends M20eItem {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  /** @override */
  async _preCreate(data, options, user){
    log("Je suis un item de paradigme !");
    await super._preCreate(data, options, user);
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
