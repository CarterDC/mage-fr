// Import Helpers
//import { Trait, M20eThrow } from '../dice-helpers.js'
import { TraitSelect } from './trait-select-dlg.js'
import * as utils from '../utils.js'
import { log } from "../utils.js";

/**
 * @extends {DocumentSheet}
 */
export class ThrowSheet extends DocumentSheet {

  /** @override */
  constructor(item, throwIndex = 0, options={}) {
    super(item, options);
    this.throwIndex = throwIndex;
    this.locks = {stats: true};

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
    return `${this.object.name} - ${game.i18n.localize('ITEM.TypeThrow')} : ${this.m20eThrow.data.name}`;
  }

  get item() {
    return this.object;
  }

  /**
   * The Actor instance which owns this item.
   * might be null if item is not owned
   * @type {Actor}
   */
  get actor() {
  return this.object.isOwned ? this.object.actor : null;
  }

  get m20eThrow() {
    return this.item.data.data.throws[this.throwIndex];
  }

  /** @override */
  getData() {
    const isEditable = this.isEditable;
    const sheetData = {
      cssClass: isEditable ? "editable" : "locked",
      editable: isEditable,
      document: this.document,
      data: duplicate(this.m20eThrow),
      limited: this.document.limited,
      options: this.options,
      owner: this.document.isOwner,
      title: this.title
    };

    sheetData.data.stats.forEach( stat => {
      stat.localizedName = this.actor?.locadigm(stat.path) || game.i18n.localize(`M20E.${stat.path}`);
      if ( stat.localizedName === `M20E.${stat.path}` ) {
        stat.localizedName = foundry.utils.getProperty(CONFIG.M20E.stats, stat.path);
      }
    });

    sheetData.data.throwOptions = JSON.stringify(sheetData.data.options) || {};

    sheetData.addButtonDisabled = this.m20eThrow.stats.length >= 9;
    sheetData.locks = this.locks;
    sheetData.isGM = game.user.isGM;

    log(sheetData)
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
    new ContextMenu(html, '.trait', this._getTraitContextOptions());
    super.activateListeners(html);
  }

    /**
   * @return the context menu options for the '.trait' elements
   * link trait in chat, edit trait, remove JE link from trait that have one
   */
    _getTraitContextOptions() {
    return [
      {//edit actor trait in fakeitem sheet or edit item (in itemSheet)
        name: game.i18n.localize('M20E.context.editTrait'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: element => {
          this.editItem(element[0].closest(".trait").dataset.index);
        }
      }
    ]
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
    let updateValue = utils.isNumeric(inputElem.value) ? parseInt(inputElem.value) : inputElem.value;

    let currThrow = duplicate(this.m20eThrow);
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
    let currThrow = duplicate(this.m20eThrow);
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
    //todo cast basediff in a number if needed !
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
        this.addItem();
        break;

      case 'edit':
        this.editItem(buttonElem.closest(".trait").dataset.index);
        break;

      case 'remove':
        this.removeItem(buttonElem.closest(".trait").dataset.index);
        break;

        case 'moveup':
          this.moveUpItem(buttonElem.closest(".trait").dataset.index);
          break;
    }
  }

  /**
   * Note : In this context 'Item' refers to a stat (Trait instance)
   * in the throw's stats array
   */
  async addItem() {
    if ( this.m20eThrow.addStat() ) {
      const throws = duplicate(this.item.data.data.throws);
      return await this.item.update({['data.throws']: throws});
    }
  }

  /**
   * Note : In this context 'Item' refers to a stat (Trait instance)
   * in the throw's stats array
   */
  async editItem(traitIndex) {
    const throws = duplicate(this.item.data.data.throws);
    const currPath = throws[this.throwIndex].stats[traitIndex].path;

    const newTraitPath = await TraitSelect.prompt({
      name: throws[this.throwIndex].data.name,
      key: currPath
    });
    if ( !newTraitPath || newTraitPath === currPath ) { return; }

    throws[this.throwIndex].stats[traitIndex].path = newTraitPath;
    return await this.item.update({['data.throws']: throws});
  }

  /**
   * Note : In this context 'Item' refers to a stat (Trait instance)
   * in the throw's stats array
   */
  async removeItem(traitIndex) {
    if ( this.m20eThrow.removeStat(traitIndex) ) {
      const throws = duplicate(this.item.data.data.throws);
      return await this.item.update({['data.throws']: throws});
    }
  }

  /**
   * Note : In this context 'Item' refers to a stat (Trait instance)
   * in the throw's stats array
   */
  async moveUpItem(traitIndex) {
    if ( this.m20eThrow.moveUpStat(traitIndex) ) {
      const throws = duplicate(this.item.data.data.throws);
      return await this.item.update({['data.throws']: throws});
    }
  }

  async close(options) {
    return super.close(options);
  }
}