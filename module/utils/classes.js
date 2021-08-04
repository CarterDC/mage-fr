
/**
 * Helper class : Uniquely defines a Trait object by it's category,
 * it's key (if referencing a trait from actor's template)
 * or itemId (if referencing a trait that's actually an item)
 */
export class Trait {

  /**
   * @param  {Object} obj {categrory='', key='', itemId=''}
   */
  constructor(obj) {
      this.category = obj.category;
      this.key = obj.key || '';
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
    if ( !htmlElem.dataset ) { return null; }
    
    const traitElem = htmlElem.closest(".trait");
    const category = traitElem.closest(".category").dataset.category || null;
    if ( !category ) { return null; }
    return new Trait({
      category: category,
      key: traitElem.dataset.key || '',
      itemId: traitElem.dataset.itemId || ''
    });
  }

  get isItem() {
    return this.category !== '' && this.itemId !== '' && this.key === '';
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
    this._specName = obj.specName || '';
    this.value = obj.value;
    this.valueMax = obj.value;
    this._useSpec = obj.useSpec || false;
  }

  get canUseSpec() {
    return this.value >= 4 && this._specName !== '';
  }

  get useSpec() {
    return this.canUseSpec && this._useSpec;
  }

  get name() {
    return this.useSpec ? this._specName : 
      (this._displayName ? this._displayName : this._name);
  }

  get specName() {
    return this.useSpec ? this._name : this._specName;
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