// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";

/* -------------------------------------------- */
/*  Trait Class                                 */
/* -------------------------------------------- */

/**
 * Helper class
 * Uniquely defines a Trait object by it's path and/or itemId
 * they can be used relative to actorData.data or actorData.stats depending on the context
 */
 export default class Trait {

  /**
   * @param  {Object} obj {path, itemId, data}
   */
  constructor(obj) {
    this.path = obj.path;
    this.itemId = obj.itemId || '';
    this.data = obj.data || null;
  }

  /**
   * Creates a new instance of Trait by getting infos from an html element's parents (.trait and .category)
   * Use as a convenient way to create and transport a path and or itemId
   * from a html element with dataset to any function that uses either a trait path or itemId
   * 
   * @param  {HTMLElement} htmlElem an html element inside a '.trait' inside a '.category'
   * 
   * @returns {Trait|null} a Trait object made from the aquired info or null
   */
  static fromElement(htmlElem) {
    const traitElem = htmlElem.closest(".trait");
    if (!traitElem) { return null; }
    const path = traitElem.dataset.path;
    const itemId = traitElem.dataset.itemId

    if (!path && !itemId) { return null; }
    return new Trait({
      path: path || '',
      itemId: itemId || ''
    });
  }

  /**
   * Returns an instance of a Trait created from arguments
   * checks for truthy path property
   * usually called from M20eThrow.fromData()
   * @param  {Object} obj {path, data={}, itemId=''}
   * 
   * @returns {Trait|null} a Trait object made from the arguments or null
   */
  static fromData(obj) {
    const { path, data = {}, itemId = '' } = obj;
    if (!path) { return null; }
    return new Trait({ path: path, data: data, itemId: itemId });
  }

  /* -------------------------------------------- */
  /*  Path related                                */
  /* -------------------------------------------- */

  /**
   * Parses a path into an object containing category, subType and key
   * @param  {String} path a path relative to data.traits
   * 
   * @returns {object} {category, subType|null, key|null}
   */
  static splitPath(path) {
    const propKeys = path.split('.');
    return {
      category: propKeys[0],
      subType: propKeys.length === 3 ? propKeys[1] : null,
      key: propKeys.length === 3 ? propKeys[2] : (propKeys[1] || null)
    };
  }

  /**
   * Parses the trait's own path into an object containing cat, subType, key
   * @returns {object} {category, subType|null, key|null}
   */
  split() {
    return { ...Trait.splitPath(this.path), itemId: this.itemId };
  }

  /**
   * returns the first property key in the path
   */
  get category() {
    const propKeys = this.path.split('.');
    return propKeys[0];
  }

  /**
   * returns the second key in the path only if path contains 3 property keys
   */
  get subType() {
    const propKeys = this.path.split('.');
    return propKeys.length === 3 ? propKeys[1] : null;
  }

  /**
   * returns the last property key in the path (unless path only contains 1 property key, it being the category)
   */
  get key() {
    const propKeys = this.path.split('.');
    return propKeys.length > 1 ? propKeys[propKeys.length - 1] : null;
  }

  /* -------------------------------------------- */
  /*  data related                                */
  /* -------------------------------------------- */

  /**
   * Returns the Trait value or its overriden value (ie: in the case of rote effects)
   */
  get value() {
    return this.data.valueOverride >= 0 ? this.data.valueOverride : this.data.value;
  }

  /**
   * Returns whether user is allowed to use a specialisation
   */
  get canUseSpec() {
    return this.value >= 4 && this.data.specialisation && this.data.specialisation !== '';
  }

  /**
   * Returns whether this trait should use it's specialisation (with extra check)
   */
  get useSpec() {
    return this.canUseSpec && this.data.useSpec;
  }

  /**
   * returns traits name, displayName or specialisation depending on circumstances
   */
  get name() {
    return this.useSpec ? this.data.specialisation :
      (this.data.displayName ? this.data.displayName : this.data.name);
  }

  /**
   * returns value that will be displayed in the tooltip of the name
   */
  get specName() {
    return this.useSpec ? this.name : this.data.specialisation;
  }


  get isItem() {
    return this.itemId !== '';
  }

  get isExtended() {
    return this.data.value >= 0;
  }

  getLocalizedName(actor) {
    let localizedName = '';
    if ( actor ) {
      const item = actor.items.get(actor._getStat(this.path, 'itemId'));
      if ( item ) {
        localizedName = item.data.data.displayName || item.data.name;
      } else {
        localizedName = actor.locadigm(this.path);
      }
    } else {
      localizedName = foundry.utils.getProperty(CONFIG.M20E.stats, this.path) || game.i18n.localize(`M20E.${this.path}`);
    }
    if ( localizedName === `M20E.${this.path}` ) {
      localizedName = this.key;
    }
    return localizedName;
  }
}