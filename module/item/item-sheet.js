import {log} from "../utils.js";

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
    return 'systems/mage-fr/templates/item/' + this.item.data.type + '-sheet.html'
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    log({options : options});
    const sheetData = super.getData(options);

    const itemData = this.item.data.toObject(false);
    sheetData.item = itemData;
    sheetData.data = itemData.data;

    return sheetData;
  }


  /** @override */
  activateListeners (html) {
    super.activateListeners(html)

  }

}
