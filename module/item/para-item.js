// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import M20eItem from './item.js'

/**
 * Implements M20eParadigmItem as an extension of the M20eItem class
 * Adds specific methods for paradigm items only.
 * @extends {M20eItem}
 */
export default class M20eParadigmItem extends M20eItem {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  /** @override */
  async _preCreate(data, options, user){
    log(this.constructor.name);
    await super._preCreate(data, options, user);
  }

  getLexiconEntry(relativePath) {
    return foundry.utils.getProperty(this.data.data.lexicon, relativePath);
  }

  async setLexiconEntry(relativePath, newValue) {
    if ( newValue === '' ) { return; } // TODO ; maybe implement removal on empty string ? 
    return await this.update({[`data.lexicon.${relativePath}`]: newValue});
  }
}
