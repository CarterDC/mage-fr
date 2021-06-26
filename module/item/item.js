/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /** @override */
  constructor(...args) {
    super(...args);
  }

  _getLexiconEntry(relativePath){
    if(this.type !== 'paradigm') return;
    return getProperty(this.data.data.lexicon, relativePath);
  }
}
