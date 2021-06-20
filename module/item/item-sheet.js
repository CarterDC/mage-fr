/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class M20eItemSheet extends ItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
  }

  /** @override */
  static get defaultOptions () {
     return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      width: 400,//todo : height according to itemType
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
