// Import Helpers
import * as utils from '..//utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * FormApp with actor as object
 * allows the edition of some actor's traits as well as it's lexicon.
 * @extends {FormApplication}
 */
export class FakeItem extends DocumentSheet {

  /** @override */
  constructor(actor, itemData) {
    super(actor, {
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      title: actor.name
     });

    this.actor = actor;
    this.itemData = itemData;

    /*const  itemSheetOptions = CONFIG.M20E.itemSheetOptions['fakeitem'];
    if ( itemSheetOptions ) {
      this.options.width = this.position.width = itemSheetOptions.width;
      this.options.height = this.position.height = itemSheetOptions.height;
    }*/
    //add the paradigm css class if any to the default options.
    const paraItem = this.actor.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      template: 'systems/mage-fr/templates/apps/fakeitem-sheet.hbs',
      width: 400,
      height: 'auto',
      resizable: true,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
    });
  }

  /** @override */
  getData() {
    const superData = super.getData();
    const actorData = this.actor.data.toObject(false);
    const traitData = foundry.utils.getProperty(actorData, `data.traits.${this.itemData.category}.${this.itemData.key}`);

    const sheetData = {...superData, ...this.itemData, ...traitData};
    sheetData.owner = this.actor.isOwner;
    log('ça passe')
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    //disable buttons/inputs given their 'protection status'
    if ( this.actor.data.data.creationDone && !game.user.isGM ) {
      this._protectElements(html);
    }
    super.activateListeners(html);
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if ( !this.object.id ) return;
    return this.object.update(formData);
  }

  /** @override */
  async _onChangeInput(event) {
    const element = event.target;
    if ( ! utils.isValidUpdate(element) ) {
      event.preventDefault();
      return this.render();
    }
    if ( element.name === 'lexiconName' ) {
      this._onChangeLexiconName(element);
    } else {
      super._onChangeInput(event);
    }
  }

  async _onChangeLexiconName(inputElem) {
    const inputValue = inputElem.value;
    //update our fakeitem's name (to be rerendered)
    this.itemData.lexiconName = inputValue;
    //change the name in the paradigm lexicon
    this.actor.setLexiconEntry(this.itemData.relativePath, inputValue);
  }

  /**
   * 'disables' some elements (input/buttons) for actors whose creation phase is over.
   * a bit similar to Foundry's disableFields
   * @param {HTMLElement} html sheet.element
   */
   _protectElements(html) {
    const elements = html.find(`input`);
    for ( let el of elements) {
      if ( el.name?.includes('value') ) {
        el.setAttribute("disabled", "");
      }
    }
  }

  async close(options) {
    const html = $(this.element);
    const newValue = html.find(".name")[0].value;
    const lexiconEntry = this.actor.getLexiconEntry(this.itemData.relativePath) || '';
    if ( newValue !== lexiconEntry ) {
      //last update before closing
      this.actor.setLexiconEntry(this.itemData.relativePath, newValue);
    }
    this.actor = null;
    this.itemData = null;
    return super.close(options);
  }
}