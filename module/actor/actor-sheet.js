import {log} from "../utils.js";
import * as utils from '../utils.js'
import { FakeItem } from '../item/fake-item-sheet.js'
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class M20eActorSheet extends ActorSheet {

  /** @override */
  constructor(...args) {
    super(...args);

    //creates the 'locks' object like {attributes: true, } from an array of categories
    this.locks = CONFIG.M20E.categoriesWithLocks.reduce((acc, cur) =>
      ({...acc, [cur]: true}),{});
    
    //add the paradigm css class if any to the default options.
    const paraItem = this.actor.paradigm;
    if(paraItem){
      this.options.classes.push(paraItem.data.data.cssClass);
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'actor'],
      template: 'systems/mage-fr/templates/actor/actor-sheet.hbs',
      width: 500,
      height: 720,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'stats' }],
      dragDrop: [{ dragSelector: ".dice-button" }]
    })
  }

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);

    // The Actor's data
    const actorData = this.actor.data.toObject(false);
    sheetData.actor = actorData;
    sheetData.data = actorData.data;

    //other usefull data
    sheetData.isGM = game.user.isGM;
    sheetData.locks = this.locks;
    sheetData.canSeeParadox = utils.canSeeParadox();

    const paradigm = this.actor.paradigm;
    if(paradigm) {
      sheetData.paraData = paradigm.data.data;
    }
    
    log({actor : sheetData.actor.name, sheet: sheetData});
    return sheetData
  }

  /** @override */
  activateListeners(html) {

    //actions for everyone
    //(dice thows & stat link)
    html.find('a.stat-label').click(this._onstatLabelClick.bind(this));

    //editable only (roughly equals 'isOwner')
    if ( this.isEditable ) {
      //interactions & editions
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      html.find('.resource-panel .box[data-clickable="true"]').mousedown(this._onResourceBoxClick.bind(this)); //todo maybe add clickable ?
    }

    if(game.user.isGM){
      
    }
    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  _onResourceBoxClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const index = parseInt(element.dataset.index);
    const resourceName = element.closest('.resource-panel').dataset.resource;

    switch (event.which) {
      case 1://left button
        if(resourceName === 'magepower'){
          this.actor._increaseMagepower(index);
        } else {
          this.actor._decreaseResource(resourceName, index);
        }
        break;
      case 3://right button
        if(resourceName === 'magepower'){
          this.actor._decreaseMagepower(index);
        } else {
          this.actor._increaseResource(resourceName, index);
        }
        break;
      default:
        break;
    };
  }

  async _onChangeInput(event) {
    const element = event.target;
    if(! utils.isValidUpdate(element)){
      event.preventDefault();
      return this.render();
    }
    super._onChangeInput(event);
  }

  _onstatLabelClick(event) {
    event.preventDefault()
    const statElement = this.getStatElement(event);
    const toggle = (statElement.dataset.active === 'true');
    statElement.dataset.active = !toggle;
  }

  _onMiniButtonClick(event) {
    event.preventDefault()
    const element = event.currentTarget
    const dataset = element.dataset

    switch (dataset.action) {
      case 'lock':
        const category = dataset.category;
        const toggle = this.locks[category];
        this.locks[category] = !toggle;
        //enable / disable drag&drop for this specific category
        //this.dragDropManager(category);
        this.render()
        break;

      case 'add':
        //this.addItem(element, dataset);
        break;

      case 'edit':
        this.editItem(element);
        break;

      case 'remove':
        //let itemId = element.closest(".stat").dataset.itemId;
        //this.removeItem(itemId);
        break;

      case 'roll':
        this.rollItem(element, dataset);
        break;

      case 'expand':
        this.expandDescription(element);
        break;
    }
  }

  //utile ?
  getStatElement(event){
    const element = event.currentTarget;
    return element.closest(".stat");
  }

  editItem(element) {
    const category = element.closest(".category").dataset.category;
    if (category === 'attributes' || category === 'spheres') {
      const key = element.closest(".stat").dataset.key;
      //use a fakeItem dialog to edit attribute (or sphere)
      this.editFakeItem(category, key);
    } else {
      // regular item edit
      let itemId = element.closest(".stat").dataset.itemId;
      let item = this.actor.items.get(itemId);
      item.sheet.render(true);
    }
  }

  async editFakeItem(category, key){
    //systemDescription provided by compendium given key.
    let dialogData = {
      category: category,
      key: key,
      actor: this.actor,
      item: {
        type: game.i18n.localize(`M20E.category.${category}`),
        name: game.i18n.localize(`M20E.${category}.${key}`),
        data: {
          data: getProperty(this.actor.data, `data.${category}.${key}`)
        }
      }
    }
    //add compendium description to stat.systemDescription
    let packName = `mage-fr.${category}-desc`;
    utils.getCompendiumDocumentByName(
      packName,
      dialogData.key
    ).then(packItem => {
      dialogData.item.data.data.systemDescription = packItem.data.content;
      let fakeItem = new FakeItem(dialogData);
      fakeItem.render(true);
    });
  }
}