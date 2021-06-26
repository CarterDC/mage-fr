import {log} from "../utils.js";
import * as utils from '../utils.js'

//TODO : mettre les meme sécurités d'édition que sur une fiche normale
// (pas de modif delavaleur apès la créa)
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {Application}
 */
export class FakeItem extends Application {

  /** @override */
  constructor(dialogData) {
    super({ title: dialogData.item.data.data.displayName });

    this.actor = dialogData.actor;
    this.category = dialogData.category;
    this.key = dialogData.key;
    this.item = dialogData.item;

    const  itemSheetOptions = CONFIG.M20E.itemSheetOptions['fakeitem'];
    if(itemSheetOptions){
      this.options.width = this.position.width = itemSheetOptions.width;
      this.options.height = this.position.height = itemSheetOptions.height;
      //todo add paradigm class
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      template: 'systems/mage-fr/templates/item/fakeitem-sheet.hbs',
      resizable: true,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
    });
  }

  /** @override */
  getData() {
    const sheetData = super.getData();
    sheetData.item = this.item;
    sheetData.data = this.item.data.data;
    sheetData.category = this.category;
    sheetData.key = this.key;
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    html.find('input').change(this._onChangeInput.bind(this));
    $(document).on('keydown', this.onKeyDown.bind(this));
    super.activateListeners(html);
  }

  async _onChangeInput(event) {
    const inputElement = event.target;
    if(! utils.isValidUpdate(inputElement)){
      return this.render();
    }
    const inputValue = inputElement.value;
    if(inputElement.name === 'name'){
      if(inputValue === ''){
        return this.render();
      }
      //update our fakeitem's name (to be rerendered)
      this.item.name = inputValue;
      //change the name in the paradigm lexicon
      const paraItem = this.actor.paradigm;
      let obj = {};
      obj[`data.lexicon.${this.category}.${this.key}`] = inputValue;
      paraItem.update(obj)
      .then(result => this.render());
    } else {
      const inputName = inputElement.name.substring(5); //get rid of 'data.'
      //update our fakeitem's data (to be rerendered)
      this.item.data.data[inputName] = inputValue;
      //update the actor with new value
      this.actor._safeUpdateProperty(
        `${this.category}.${this.key}.${inputName}`,
        inputValue)
        .then(result => this.render());
    }
  }

  onKeyDown(event) {
    // Close dialog
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      //throw a random thing in the close function to prevent an update
      return this.close({statUpdate: false});
    }
  }

  /** @inheritdoc */
  async close(options) {
    
    /*if(!options){
      //update stat if necessary
      
      let html = this.element;
      let entryToUpdate = undefined;
      html.find('input')
      .toArray()
      .forEach(input =>{
        //there con only be one field to update, at the most
        let entryName = input.name.substring(5);
        if(input.value !== this.item.data.data[entryName]){
          entryToUpdate = {name : entryName, value: input.value};
        }
      });
      if(entryToUpdate){
        await this.actor._safeUpdateProperty(
          `${this.category}.${this.key}.${entryToUpdate.name}`,
          entryToUpdate.value);
      }
    }*/
    return super.close();
  }
}