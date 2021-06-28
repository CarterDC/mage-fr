import M20eItemSheet from './baseitem-sheet.js'
import {log} from "../utils.js";
import * as utils from '../utils.js'

/**
 * Implements M20eParadigmSheet as an extension of the M20eItemSheet class
 * used specifically by paradigm type items
 * @extends {M20eItemSheet}
 */
export default class M20eParadigmSheet extends M20eItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    this.locks = {lexicon: true};
    this.lexicon =  utils.propertiesToArray(this.item.data.data.lexicon);
  }

   /** @override */
   get template () {
    return `systems/mage-fr/templates/item/paradigm-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    sheetData.locks = this.locks;
    sheetData.lexicon = this.lexicon;
    sheetData.lexicon.sort(function (a, b) {
      let aName = a.path.toUpperCase();
      let bName = b.path.toUpperCase();
      return (aName < bName) ? -1 : ((aName > bName) ? 1 : 0);
    });
    return sheetData;
  }

  _onMiniButtonClick(event) {
    event.preventDefault();
    const buttonElement = event.currentTarget;
    const dataset = buttonElement.dataset;

    switch (dataset.action) {
      case 'lock':
        let category = dataset.category;
        let toggle = this.locks[category];
        this.locks[category] = !toggle;
        this.render();
        break;

      case 'add':
        this.editItem();//edit without parameter actually does a add
        break;

      case 'edit':
        this.editItem(buttonElement.closest(".trait").dataset.key);
        break;

      case 'remove':
        this.removeItem(buttonElement.closest(".trait").dataset.key);
        break;
    }
  }

  async removeItem(key){
    const path = this.lexicon[key].path;

    let confirmation = await Dialog.confirm({
      title: game.i18n.format("M20E.prompts.deleteTitle", {name: path}),
      content: `<p style='text-align:center;'>
        ${game.i18n.format("M20E.prompts.deleteContent", {name: path})}
        </p>`
    });
    if ( confirmation ) {
      //the following assumes that all entries in the lexicon are valid in the first place
      let deletePath = "";
      const keys = path.split(".");
      const lexiconEntry = duplicate(this.item.data.data.lexicon[keys[0]]);
      if ( Object.keys(lexiconEntry).length > 1 ) {
        deletePath = `data.lexicon.${keys[0]}.-=${keys[1]}`;
      } else {
        deletePath = `data.lexicon.-=${keys[0]}`;
      }

      await this.item.update({[deletePath]: null},{render:false});

      //populate array with updated values & refresh
      this.lexicon =  utils.propertiesToArray(this.item.data.data.lexicon);
      this.render();
    }
  }

  async editItem(key) {
    const lexiconEntry = {path: '', value: ''};
    if ( key ) {
      lexiconEntry.path = this.lexicon[key].path;
      lexiconEntry.value = this.lexicon[key].value;
    }
    let newEntry = await this.lexiconPrompt(lexiconEntry);
    const validEntry = this._getValidEntry(lexiconEntry, newEntry);

    if ( validEntry === undefined ) { return; }
    await this.item.setLexiconEntry(validEntry.path, validEntry.value);

    this.lexicon =  utils.propertiesToArray(this.item.data.data.lexicon);
    this.render();
  }

  _getValidEntry(currEntry, newEntry) {
    if ( newEntry === null ) { return; }
    if ( newEntry.path === '' || newEntry.value === '' ) { return; }
    if ( newEntry.value === currEntry.value ) { return; }
    
    const translation = game.i18n.localize(`M20E.${newEntry.path}`);
    if ( translation === `M20E.${newEntry.path}` ) {
      ui.notifications.error(game.i18n.format("M20E.notifications.notLocalized", {path: newEntry.path}));
      return;
    }
    return newEntry;
  }

  //prompts for either edition of value or new path & value
  async lexiconPrompt(lexiconEntry) {
    const editMode = (lexiconEntry.path !== '');
    const prompt = editMode ? game.i18n.localize("M20E.prompts.lexiconContentEdit") : game.i18n.localize("M20E.prompts.lexiconContentAdd");
    const disabled = editMode ? 'disabled' : '';
    
    return await Dialog.prompt({
      title: game.i18n.localize("M20E.prompts.lexiconTitle"),
      content: `<p style="text-align:center;">${prompt}</p>
        <input type="text" value="${lexiconEntry.path}" ${disabled} title="${game.i18n.localize('M20E.hints.lexiconPath')}"/>
        <br><br>
        <input type="text" value="${lexiconEntry.value}"  title="${game.i18n.localize('M20E.hints.lexiconValue')}"/>
        <br><br>`,
      callback: (html) => {
        const inputs = html.find('input');
        return {path: inputs[0].value, value: inputs[1].value};
      },
      rejectClose: false
    })
  }
}
