// Import Documents
import M20eItemSheet from './baseitem-sheet.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * Implementation of M20eParadigmSheet as an extension of the M20eItemSheet class
 * used exclusively by paradigm type items
 * @extends {M20eItemSheet}
 */
export default class M20eParadigmSheet extends M20eItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    this.locks = {lexicon: true};
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    sheetData.locks = this.locks;
    //update our local version of the lexicon array
    this.lexicon = utils.propertiesToArray(this.item.data.data.lexicon);
    //alpha sort the lexicon array on the 'path' property
    this.lexicon.sort(utils.alphaSort('path'));
    sheetData.lexicon = this.lexicon

    return sheetData;
  }

  /** @override */
  activateListeners(html) {

    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {
      //hack for a context menu on the image
      html.find('.sheetLogo').mousedown(this._onImgMousedown.bind(this));
    }
    super.activateListeners(html);
  }

  /**
   * Forces a contextMenu on right mousebutton
   * menu is relocated to the label for accessibility purposes 
   * note : filepicker seems to prevent regular trigger of contextmenu
   * @param  {Event} event the mousedown event that triggered (from '.sheetLogo')
   */
  _onImgMousedown(event) {
    if ( event.which === 3 ) { //mouse right
      const labelElement = event.currentTarget.previousElementSibling;
      const menu = new ContextMenu($(this.element), '', this._getImgContextOptions());
      menu.render($(labelElement));
    }
  }

  /* -------------------------------------------- */
  /*  Context Menus                               */
  /* -------------------------------------------- */

  /**
   * @return the context menu options for the '.sheetLogo' element
   */
  _getImgContextOptions() {
    return [
      {
        name: game.i18n.localize('M20E.context.removeImage'),
        icon: '<i class="fas fa-trash"></i>',
        callback: () => {
          this.item.update({['data.sheetLogo']: ''});
        },
        condition: () => {
          return this.item.data.data.sheetLogo !== ''; 
        }
      }
    ];
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Note : In this context 'Item' refers to a Lexicon Entry
   *  @override
   */
  async addItem(buttonElement) {
    //edit without parameter actually does an 'edit'
    this._editLexiconEntry(null);
  }

  /**
   * Note : In this context 'Item' refers to a Lexicon Entry
   *  @override
   */
  async editItem(buttonElement) {
    this._editLexiconEntry(buttonElement.closest(".trait").dataset.key);
  }

  /**
   * Note : In this context 'Item' refers to a Lexicon Entry
   *  @override
   */
  async removeItem(buttonElement) {
    this._removeLexiconEntry(buttonElement.closest(".trait").dataset.key);
  }

  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */

  /**
   * Prompts the user for a new lexicon entry or the edition of its value
   * Updates the item's lexicon with validated value
   * refresh the all sheet
   * If key is null prompt will ask for both path AND value
   * @param  {Integer|null} key the index of the entry in the lexicon array
   */
  async _editLexiconEntry(key) {
    const lexiconEntry = {path: '', value: ''};
    if ( key ) {
      lexiconEntry.path = this.lexicon[key].path;
      lexiconEntry.value = this.lexicon[key].value;
    }
    //prompts for entry.value or entry.path AND .value
    const newEntry = await this.lexiconPrompt(lexiconEntry);

    //checks before updating
    if ( !this._isValidEntry(lexiconEntry, newEntry) ) { return; }
    await this.item.setLexiconEntry(newEntry.path, newEntry.value);
  }

  /**
   * Prompts user for confirmation before removing a lexicon entry
   *
   * @param  {Integer|null} key the index of the entry in the lexicon array
   */
  async _removeLexiconEntry(key) {
    const path = this.lexicon[key].path;

    let confirmation = await Dialog.confirm({
      title: game.i18n.format("M20E.prompts.deleteTitle", {name: path}),
      content: `<p style='text-align:center;'>
        ${game.i18n.format("M20E.prompts.deleteContent", {name: path})}
        </p>`
    });
    if ( confirmation ) {
      await this.item.removeLexiconEntry(path);
    }
  }

  /**
   * Note that '' would be valid for newEntry.value since the paradigm item would remove the entry
   * but we do have a remove button for that, that actually has a warning prompt ^^
   * 
   * @param  {Object} currEntry the current {path, value} pair
   * @param  {Object} newEntry the new {path, value} pair to be checked
   * 
   * @return {Boolean} whether the entry has been validated against every checks or not
   */
  _isValidEntry(currEntry, newEntry) {
    if ( newEntry === null ) { return false; } //prompt was escaped
    if ( newEntry.path === '' || newEntry.value === '' ) { return false; }
    if ( newEntry.value === currEntry.value ) { return false; }
    
    const translation = game.i18n.localize(`M20E.${newEntry.path}`);
    if ( translation === `M20E.${newEntry.path}` ) {
      //if localize return the same thing that was passed to it in the first place, 
      //then this entry does not exist in the localization file
      ui.notifications.error(game.i18n.format("M20E.notifications.notLocalized", {path: newEntry.path}));
      return false;
    }
    return true;
  }

  /**
   * Prompts for either edition of value or new path & value
   * @param  {Object} lexiconEntry a {path, value} pair
   * 
   * @return {Object|null} the edited {path, value} pair
   */
  async lexiconPrompt(lexiconEntry) {
    const editMode = (lexiconEntry.path !== '');
    const prompt = editMode ? 
      game.i18n.localize("M20E.prompts.lexiconContentEdit") :
      game.i18n.localize("M20E.prompts.lexiconContentAdd");
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
      rejectClose: false //prompt will return 'null' if escaped
    })
  }
}
