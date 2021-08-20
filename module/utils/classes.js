
/**
 * Helper class : Uniquely defines a Trait object by it's path relative to data.traits,
 * or itemId (if referencing a trait that's actually an item)
 */
export class Trait {

  /**
   * @param  {Object} obj {path='', itemId=''}
   */
  constructor(obj) {
      this.path = obj.path;
      this.itemId = obj.itemId || '';
  }

  /**
   * Creates a new instance of Trait by getting infos from an html element's parents (.trait and .category)
   * 
   * @param  {HTMLElement} htmlElem an html element inside a '.trait' inside a '.category'
   * 
   * @returns {Trait|null} a Trait object made from the aquired info or null
   */
  static fromElement(htmlElem) {
    const traitElem = htmlElem.closest(".trait");
    const path = traitElem.dataset.path;

    if ( !path ) { return null; }
    return new Trait({
      path: path,
      itemId: traitElem.dataset.itemId || ''
    });
  }

  static fromPath(path) {
    if ( !path ) { return null; }
    return new Trait({path: path});
  }

  static splitPath(path) {
    const propKeys = path.split('.');
    return {
      category: propKeys[0],
      subType: propKeys.length === 3 ? propKeys[1] : null,
      key: propKeys.length === 3 ? propKeys[2] : (propKeys[1] || null)
    };
  }

  split() {
    return {...Trait.splitPath(this.path), itemId: this.itemId};
  }

  get key() {
    const propKeys = this.path.split('.');
    return propKeys[propKeys.length - 1];
  }

  get isItem() {
    return this.itemId !== ''; //todo can do better in some circumstances
  }

  get isExtended() {
    return false;
  }

}

/**
 * Helper class that stores relevant data to make a dice throw
 * stores specialisation state, if spec is autorized and can return 'name' accordingly
 */
export class ExtendedTrait extends Trait {

  constructor(obj) {
    super(obj?.trait || obj);
    this._name = obj.name || '';
    this._displayName = obj.displayName || '';
    this._specialisation = obj.specialisation || '';
    this.value = parseInt(obj.value);
    this.valueMax = parseInt(obj.value);
    this._useSpec = obj.useSpec || false;
  }

  get isExtended() {
    return true;
  }

  get canUseSpec() {
    return this.value >= 4 && this._specialisation !== '';
  }

  get useSpec() {
    return this.canUseSpec && this._useSpec;
  }

  get name() {
    return this.useSpec ? this._specialisation : 
      (this._displayName ? this._displayName : this._name);
  }

  get specName() {
    return this.useSpec ? this._name : this._specialisation;
  }
}

/**
 * helper class 
 */
export class MageThrow {
  constructor(obj={}) {
    this.name = obj.name || '';
    this.description = obj.description || '';
    this.traitsToRoll = obj.traitsToRoll || [];
    this.options = obj.options || {};
  }
}

/**
 * helper class to be used by utils.prompts functions
 */
export class PromptData {
  constructor(obj) {
    this.title = obj.title || null;
    this.name = obj.name || null;
    this.currentValue = obj.currentValue || '';
    this.placeHolder = obj.placeHolder || '';
    this._promptContent = obj.promptContent || null;
  }

  /**
   * retruns the actual _promptContent or generates a basic 'prompt new value' one.
   * @returns {String} 
   */
  get promptContent() {
    if ( this._promptContent ) {
      return this._promptContent;
    } else {
      if ( this.name ) {
        return game.i18n.format("M20E.prompts.newValue", {name : this.name});
      } else {
        return '';
      }
    }
  }
}