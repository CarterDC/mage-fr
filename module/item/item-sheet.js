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
      this.options.classes.push(itemSheetOptions.classes);
      //todo : other things for sure
    }
    let itemType = this.object.data.type;
    switch(itemType){
      case 'rote':
        this.locks = {"rotes": true};
        this.sphereList = undefined;
        break;
      case 'paradigm':
        this.locks ={lexicon: true};
        this.lexicon =  utils.propertiesToArray(this.item.data.data.lexicon);
        break;
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
    sheetData.locks = this.locks;

    switch(this.item.type){
      case 'rote':

        break;
      case 'paradigm':
        sheetData.lexicon = this.lexicon;
        sheetData.lexicon.sort(function (a, b) {
          let aName = a.path.toUpperCase();
          let bName = b.path.toUpperCase();
          return (aName < bName) ? -1 : ((aName > bName) ? 1 : 0);
        });
        break;
    }

    return sheetData;
  }


  /** @override */
  activateListeners (html) {


    if (this.options.editable) {
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    }
    if(game.user.isGM){
      
    }

    super.activateListeners(html);
  }

  _onMiniButtonClick(event) {
    event.preventDefault()
    const element = event.currentTarget
    const dataset = element.dataset

    switch (dataset.action) {
      case 'lock':
        let category = dataset.category;
        let toggle = this.locks[category];
        this.locks[category] = !toggle;
        this.render();
        break;

      case 'add':
        this.addItem();
        break;

      case 'edit':

        break;

      case 'remove':
        const key = element.closest(".stat").dataset.key;
        this.removeItem(key);
        break;
    }
  }

  addItem(){
    switch(this.item.type){
      case 'rote':

        break;
      case 'paradigm':

        this.lexicon.push({path:"", value:""});
        log(this.lexicon);
        this.render();
        break;
    }
  }
  removeItem(key){
    let itemName = "";
    switch(this.item.type){
      case 'rote':

        break;
      case 'paradigm':
        itemName = this.lexicon[key].path;
        break;
    }
    let confirmation = await Dialog.confirm({
      title: "Suppression de " + itemName, //TODO : Localisation !
      content: "<p style='text-align:center;'>La suppression de '" + itemName + "' est <b>définitive</b>.<br>Confirmez ?</p>"
    });
    if (confirmation) {
      switch(this.item.type){
        case 'rote':
          break;
        case 'paradigm':
          itemName = this.lexicon[key].path;
          break;
      }
    }
  }

}
