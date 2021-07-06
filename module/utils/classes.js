
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