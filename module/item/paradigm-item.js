// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import M20eItem from './m20e-item.js'

/**
 * Paradigm Item Specific
 * could have been in base Class since it's just 4 specific functions
 * and there are no overrides
 * @extends {M20eItem}
 */
export default class M20eParadigmItem extends M20eItem {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  /**
   * get the system translation for M20E.relativePath or user lexiconEntry if axists
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
   * Removes a lexicon entry,
   * actually removes as many depths in the tree as necessary by calling itself recursively
   * @param  {String} relativePath a property path relative to the item's lexicon object
   */
  async removeLexiconEntry(relativePath) {

    const props = relativePath.split(".");
    const key = props.pop();
    const path = props.join('.') || null;
    const lexiconEntry = foundry.utils.getProperty(this.data.data.lexicon,`${path}`);
    
    if ( props.length !== 0  && Object.keys(lexiconEntry).length <= 1 ) {
        //this branch of the prop tree contains only one property, it should be removed too
        this.removeLexiconEntry(path);
    } else {
      const deletePath = path ? `data.lexicon.${path}.-=${key}` : `data.lexicon.-=${key}`;
      return await this.update({[deletePath]: null});
    }
  }
}
