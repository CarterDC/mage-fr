// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * Implements M20eItemSheet as an extension of the ItemSheet class
 * used by most regular item-types
 * advanced item-types use their own item sheets extended from this one.
 * @extends {ItemSheet}
 */
export default class M20eItemSheet extends ItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    /*const itemSheetOptions = CONFIG.M20E.itemSheetOptions[this.object.data.type];
    if( itemSheetOptions ) {
      this.options.width = this.position.width = itemSheetOptions.width;
      this.options.height = this.position.height = itemSheetOptions.height;
    }*/
    if ( this.item.isOwned ) {
      //add the paradigm css class (if any) to the default options.
      const paraItem = this.item.actor.paradigm;
      if ( paraItem ) {
        this.options.classes.push(paraItem.data.data.cssClass);
      }
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject( super.defaultOptions, {
     classes: ['m20e', 'sheet', 'item'],
     width: 400,
     height: 'auto',
     tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
   });
  }

   /** @override */
   get template() {
    return `systems/mage-fr/templates/item/${this.item.data.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);

    //the item's data
    const itemData = this.item.data.toObject(false);
    sheetData.item = itemData;
    sheetData.data = itemData.data;

    //other usefull data
    sheetData.config = CONFIG.M20E;
    sheetData.isGM = game.user.isGM;
    sheetData.isOwner = this.item.isOwner;
    sheetData.valuesEditLock = this.item.isOwned ?
      ( this.item.actor.data.data.creationDone && !game.user.isGM ) :
      false;

    log({item : sheetData.item.name, sheetData : sheetData});
    return sheetData;
  }


  /** @override */
  activateListeners(html) {
    //actions for everyone
    

    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      html.find('.meritflaw select').change(this._onSubtypeChange.bind(this));

    }
    if ( game.user.isGM ) {
      
    }
    super.activateListeners(html);
  }

  /**
  * Dispatches mini-buttons clicks according to their dataset.action
  * Note that base item sheets don't have mini-buttons
  * But this used by all subClasses of M20eItemSheet which MUST override the add, edit and remove functions
  * 
  * @param {object} event the event that triggered (from div '.mini-button')
  */
  _onMiniButtonClick(event) {
    event.preventDefault();
    const buttonElem = event.currentTarget;
    const dataset = buttonElem.dataset;

    switch (dataset.action) {
      case 'lock':
        let category = dataset.category;
        let toggle = this.locks[category];
        this.locks[category] = !toggle;
        this.render();
        break;

      case 'add':
        this.addItem(buttonElem);
        break;

      case 'edit':
        this.editItem(buttonElem);
        break;

      case 'remove':
        this.removeItem(buttonElem);
        break;
    }
  }

  //to be implemented by subClasses
  async addItem(buttonElem) {}
  //to be implemented by subClasses
  async editItem(buttonElem) {}
  //to be implemented by subClasses
  async removeItem(buttonElem) {}

  /**
  *  @override
  * added validation against dtype and MIN/MAX before updating
  * re-renders the sheet to display the previous value if update is invalid
  * note: though data are validated against dtype by foundry,
  * updating a number with a string leaves the input blank
  */
  async _onChangeInput(event) {
    const element = event.target;
    if ( ! utils.isValidUpdate(element) ) {
      event.preventDefault();
      return this.render();
    }
    super._onChangeInput(event);
  }

  /**
   * Changes a meritflaw img in accordance to the selected meritflaw subtype
   * Since we're updating the image, might as well update the subtype as well in one call
   * hence the 'stopPropagation'
   * @param  {} event the event that triggered ('.meritflaw select')
   */
  async _onSubtypeChange(event) {
    event.stopPropagation();
    const element = event.currentTarget;
    const newSubType = element.options[element.selectedIndex].value;
    const newImg = CONFIG.M20E.defaultImg[newSubType];

    let updateObj = {['img']: newImg};
    updateObj['data.subType'] = newSubType;
    return this.item.update(updateObj);
  }
}
