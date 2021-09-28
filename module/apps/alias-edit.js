// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * FormApp with actor as object
 * allows the edition of actor's aliases and choice of new name.
 * @extends {DocumentSheet}
 */
export class AliasEditor extends DocumentSheet {

  /** @override */
  constructor(actor, itemData) {
    super(actor, {
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true
     });

    this.actor = actor;

    //add the paradigm css class if any to the default options.
    const paraItem = this.actor.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      template: 'systems/mage-fr/templates/apps/alias-edit.hbs',
      width: 400,
      height: 'auto',
      resizable: true,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'aliases' }]
    });
  }

  /** @inheritdoc */
  get title() {
    return game.i18n.format("M20E.prompts.aliasesTitle", {actorName: this.actor.data.name });
  }

  /** @override */
  getData() {
    const sheetData = super.getData();
    sheetData.aliases = this.actor.data.data.aliases.list;
    sheetData.owner = this.actor.isOwner;
    sheetData.config = CONFIG.M20E;
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
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

      case 'add':
        this.addItem(buttonElem);
        break;

      case 'remove':
        this.removeItem(buttonElem);
        break;

      case 'switch':
        this.switchItem(buttonElem);
        break;
    }
  }

  async switchItem(buttonElem) {
    const aliasIndex = buttonElem.closest(".trait").dataset.index;
    const aliases = duplicate(this.actor.data.data.aliases.list);
    const currentAlias = aliases[aliasIndex];
    aliases[aliasIndex] = this.actor.data.name;
    return await this.actor.update({
      'name': currentAlias,
      'data.aliases.list': aliases
    });
  }

  async addItem(buttonElem) {
    const aliases = duplicate(this.actor.data.data.aliases.list);
    aliases.push(game.i18n.localize('M20E.new.alias'));
    return await this.actor.update({'data.aliases.list': aliases});
  }

  async removeItem(buttonElem) {
    const aliasIndex = buttonElem.closest(".trait").dataset.index;
    const aliases = duplicate(this.actor.data.data.aliases.list);
    aliases.splice(aliasIndex, 1);
    return await this.actor.update({'data.aliases.list': aliases});
  }

  async _onInlineEditChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const inputElem = event.currentTarget;
    const aliasIndex = inputElem.closest(".trait").dataset.index;

    const aliases = duplicate(this.actor.data.data.aliases.list);
    aliases[aliasIndex] = inputElem.value;
    return await this.actor.update({'data.aliases.list': aliases});
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
}