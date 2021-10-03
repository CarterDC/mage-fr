// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";
//import { Trait, M20eThrow } from '../dice-helpers.js'

const MAGICK_TYPE_COINCIDENTAL = 0;
const MAGICK_TYPE_VULGAR = 1;
const MAGICK_TYPE_VULGAR_WITNESS = 2;

/**
 * @extends {Application}
 */
export default class ParadoxDialog extends Application {

  /** @override */
  constructor(actor, roll, options={}) {
    super(options);
    this.document = actor;
    this.rollTotal = roll.total;
    this.maxLevel = roll.options.traits.reduce((acc, cur) => (Math.max(acc, cur.value)), 0);
    this.magickType = MAGICK_TYPE_COINCIDENTAL;
    this.rollResult = this.rollTotal === 0 ? 'failure' : 
      (this.rollTotal > 0 ? 'success' : 'critFailure');
    this.paradoxGain = 0;
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      width: 400,
      height: 'auto',
      title: game.i18n.localize('M20E.prompts.paradoxTitle'),
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: false
    });
  }

   /** @inheritdoc */
   get template() {
    return 'systems/mage-fr/templates/apps/paradox-dlg.hbs';
  }

  /** @override */
  getData() {
    this.calculateParadoxGain();
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
    sheetData.paradoxGain = this.paradoxGain;
    sheetData.prompt = this.getPromptString();
    sheetData.magickType = this.magickType;
    sheetData.isGM = game.user.isGM;

    log(sheetData)
    return sheetData;
  }

  getPromptString() {
    const result = this.rollTotal === 0 ? game.i18n.localize('M20E.throwresult.fail') :
      (this.rollTotal > 0 ? game.i18n.localize('M20E.throwresult.succ') : 
        game.i18n.localize('M20E.throwresult.crit'));
    return game.i18n.format("M20E.prompts.paradoxContent", {
      result: result,
      rollTotal: this.rollTotal,
      maxLevel: this.maxLevel
    });
  }

  calculateParadoxGain() {
    if ( this.rollResult === 'critFailure' ) {
      this.paradoxGain = this.magickType === MAGICK_TYPE_COINCIDENTAL ? this.maxLevel :
        (this.maxLevel * this.magickType) + this.magickType;
    } else {
      this.paradoxGain = this.magickType === MAGICK_TYPE_COINCIDENTAL ? 0 : 1;
    }
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
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if ( !this.object.id ) { return; }

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
      case 'add':
        
        break;

      case 'edit':
        
        break;

      case 'remove':
        
        break;
    }
  }

  async close(options) {
    return super.close(options);
  }

}