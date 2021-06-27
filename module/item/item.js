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

  getLexiconEntry(relativePath) {
    if ( this.type !== 'paradigm' ) { return; }
    return getProperty(this.data.data.lexicon, relativePath);
  }

  async setLexiconEntry(relativePath, newValue) {
    if ( this.type !== 'paradigm') { return; }
    if ( newValue === '' ) { return; } // TODO ; maybe implement removal on empty string ? 
    let obj = {};
    obj[`data.lexicon.${relativePath}`] = newValue;
    return await this.update(obj);
  }
}

