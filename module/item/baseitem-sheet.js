import {log} from "../utils.js";
import * as utils from '../utils.js'

//actor.update({"data.some.-=field": null})

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class M20eItemSheet extends ItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    const  itemSheetOptions = CONFIG.M20E.itemSheetOptions[this.object.data.type];
    if(itemSheetOptions){
      this.options.width = this.position.width = itemSheetOptions.width;
      this.options.height = this.position.height = itemSheetOptions.height;
      //todo : replace with para class if owned item
      this.options.classes.push(itemSheetOptions.classes);
      //todo : other things for sure
    }
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
     classes: ['m20e', 'sheet', 'item'],
     tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
   });
 }

   /** @override */
   get template () {
    return 'systems/mage-fr/templates/item/' + this.item.data.type + '-sheet.hbs'
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);

    const itemData = this.item.data.toObject(false);
    sheetData.item = itemData;
    sheetData.data = itemData.data;

    return sheetData;
  }


  /** @override */
  activateListeners (html) {


    if (this.options.editable) {
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      html.find('.listened-input').change(this._onInputChange.bind(this));
    }
    if(game.user.isGM){
      
    }

    super.activateListeners(html);
  }

  _onMiniButtonClick(event) {

  }

  async _onInputChange(event){
    const element = event.currentTarget;
    const dataset = element.dataset;
    event.preventDefault();
  }
}
