// Import Helpers
import * as utils from '..//utils/utils.js'
import { log } from "../utils/utils.js";

//TODO : mettre les meme sécurités d'édition que sur une fiche normale
// (pas de modif de la valeur apès la créa)
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {FormApplication}
 */
export class FakeItem extends FormApplication {

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
      template: 'systems/mage-fr/templates/item/fakeitem-sheet.hbs',
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
    const traitData = foundry.utils.getProperty(actorData, `data.${this.itemData.category}.${this.itemData.key}`);

    const sheetData = {...superData, ...this.itemData, ...traitData};
    sheetData.owner = this.actor.isOwner;
    sheetData.valuesEditLock = ( actorData.data.creationDone && !game.user.isGM );


    return sheetData;
  }

  /** @override */
  activateListeners(html) {
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

  async close(options) {
    const html = $(this.element);
    const newValue = html.find(".name")[0].value;
    const lexiconEntry = this.actor.getLexiconEntry(this.itemData.relativePath) || '';
    if ( newValue !== lexiconEntry ) {
      //last update before closing
      this.actor.setLexiconEntry(this.itemData.relativePath, newValue);
    }
    super.close(options);
  }
}