// Import Helpers
import { MageThrow, Trait } from '../utils/classes.js';
import { TraitSelect } from './trait-select-dialog.js'
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * @extends {DocumentSheet}
 */
export class ThrowSheet extends DocumentSheet {

  /** @override */
  constructor(item, throwIndex = 0, options={}) {
    super(item, options);
    this.throwIndex = throwIndex;
    this.locks = {traits: true};

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
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      width: 400,
      height: 'auto',
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
    });
  }

  /** @inheritdoc */
  get id() {
    return `item-${this.object.id}-throw-${this.throwIndex}`;
  }

   /** @inheritdoc */
   get template() {
    return 'systems/mage-fr/templates/apps/throw-sheet.hbs';
  }

  /** @inheritdoc */
  get title() {
    return `${this.object.name} - ${game.i18n.localize('ITEM.TypeThrow')} : ${this.mageThrow.name}`;
  }

  get item() {
    return this.object;
  }

  get mageThrow() {
    return this.item.data.data.throws[this.throwIndex];
  }

  /** @override */
  getData() {
    const isEditable = this.isEditable;
    const sheetData = {
      cssClass: isEditable ? "editable" : "locked",
      editable: isEditable,
      document: this.document,
      limited: this.document.limited,
      options: this.options,
      owner: this.document.isOwner,
      title: this.title
    };

    sheetData.data = duplicate(this.mageThrow);
    sheetData.data.throwOptions = JSON.stringify(sheetData.data.options) || {};
    sheetData.locks = this.locks;
    sheetData.isGM = game.user.isGM;

    log(sheetData)
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
    super.activateListeners(html);
  }

  async _onInlineEditChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const inputElem = event.currentTarget;
    if ( ! utils.isValidUpdate(inputElem) ) {
      return this.render();
    }
    //value has been validated => update the item
    const updatePath = inputElem.dataset.updatePath || 'data.value';
    let updateValue = inputElem.value;

    let currThrow = duplicate(this.mageThrow);
    if ( updatePath === 'options' ) {
      currThrow.options = {...currThrow.options, ...JSON.parse(inputElem.value)}
    } else {
      foundry.utils.setProperty(currThrow, updatePath, updateValue);
    }

    const throws = duplicate(this.item.data.data.throws);
    throws[this.throwIndex] = currThrow;
    return await this.item.update({['data.throws']: throws});
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if ( !this.object.id ) return;
    let dirty = false;
    let currThrow = duplicate(this.mageThrow);
    for ( let [fieldName, value] of Object.entries(foundry.utils.flattenObject(formData)) ) {
      if ( foundry.utils.getProperty(currThrow, fieldName) !== value ) {
        //log({index, propertyName, value});
        foundry.utils.setProperty(currThrow, fieldName, value);
        dirty = dirty || true;
      }
    }
    if ( dirty ) {
      const throws = duplicate(this.item.data.data.throws);
      throws[this.throwIndex] = currThrow;
      return await this.item.update({['data.throws']: throws});
    }
  }

  /** @override */
  async _onChangeInput(event) {
    const element = event.target;
    if ( ! utils.isValidUpdate(element) ) {
      event.preventDefault();
      return this.render();
    }
    super._onChangeInput(event);
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
  async addItem(buttonElem) {
    const throws = duplicate(this.item.data.data.throws);
    throws[this.throwIndex].traitsToRoll.push(new Trait({path: 'attributes.stre'}));
    return await this.item.update({['data.throws']: throws});
  }

  //to be implemented by subClasses
  async editItem(buttonElem) {
    const traitIndex = buttonElem.closest(".trait").dataset.index;
    const throws = duplicate(this.item.data.data.throws);
    const currPath = throws[this.throwIndex].traitsToRoll[traitIndex].path;

    const newTraitPath = await TraitSelect.prompt({
      name: throws[this.throwIndex].name,
      key: currPath
    });
    if ( !newTraitPath || newTraitPath === currPath ) { return; }

    throws[this.throwIndex].traitsToRoll[traitIndex].path = newTraitPath;
    return await this.item.update({['data.throws']: throws});
  }

  //to be implemented by subClasses
  async removeItem(buttonElem) {
    const traitIndex = buttonElem.closest(".trait").dataset.index;
    const throws = duplicate(this.item.data.data.throws);
    throws[this.throwIndex].traitsToRoll.splice(traitIndex, 1);
    return await this.item.update({['data.throws']: throws});
  }

  async close(options) {
    return super.close(options);
  }

}