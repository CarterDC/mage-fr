
/**
 * Uniquely defines a Trait object by it's category,
 * it's key (if referencing a trait from actor's template)
 * or itemId (if referencing a trait that's actually an item)
 */
export class Trait {

  constructor(obj) {
    const dataset = obj.dataset;
    if ( dataset ) {
      const traitElement = obj.closest(".trait");
      this.category = traitElement.closest(".category").dataset.category || '';
      this.key = traitElement.dataset.key || '';
      this.itemId = traitElement.dataset.itemId || '';
    } else {
      this.category = obj.category || '';
      this.key = obj.key || '';
      this.itemId = obj.itemId || '';
    }
  }

  get isItem() {
    return this.category !== '' && this.itemId !== '' && this.key === '';
  }
}

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
      this._displayName ? this._displayName : this._name;
  }

  get specName() {
    return this.useSpec ? this._name : this._specName;
  }
}

export class MageThrow {
  constructor(obj={}) {
    this.name = obj.name || '';
    this.description = obj.description || '';
    this.traitsToRoll = obj.traitsToRoll || [];
    this.options = obj.options || {};
  }
}

/**
 * 
 */
export class PromptData {
  constructor(obj) {
    this.title = obj.title || null;
    this.name = obj.name || null;
    this.currentValue = obj.currentValue || '';
    this.placeHolder = obj.placeHolder || '';
    this._promptContent = obj.promptContent || null;
  }

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