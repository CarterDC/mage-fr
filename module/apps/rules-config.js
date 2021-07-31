// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * Allows edition of a list of rules that are stored as an array in a game setting
 * Not used atm
 * @extends {FormApplication}
 */
export class RulesConfig extends FormApplication {

  /** @override */
  constructor() {
    super(null, {
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      title: game.i18n.localize('SETTINGS.rulesConfig')
     });
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet'],
      template: 'systems/mage-fr/templates/apps/rules-config.hbs',
      width: 600,
      height: 'auto',
      resizable: false
    });
  }

  /** @override */
  getData() {
    const sheetData = {
      rules: game.settings.get('mage-fr', 'rules'),
      config: CONFIG.M20E
    };

    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    super.activateListeners(html);
  }

  _onMiniButtonClick(event) {
    event.preventDefault();
    const buttonElem = event.currentTarget;
    const dataset = buttonElem.dataset;

    switch ( dataset.action ) {
      case 'add':
        this._addItem();
        break;
      case 'remove':
        const rowIndex = buttonElem.closest(".flexrow").dataset.index;
        this._removeItem(rowIndex);
        break;
    }
  }

  async _addItem() {
    const curRules = game.settings.get('mage-fr', 'rules');
    curRules.push({type: 'talent', value: 0});
    await game.settings.set('mage-fr', 'rules', curRules);
    this.render();
  }

  async _removeItem(rowIndex) {
    const curRules = game.settings.get('mage-fr', 'rules');
    curRules.splice(rowIndex, 1);
    await game.settings.set('mage-fr', 'rules', curRules);
    this.render();
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const curRules = game.settings.get('mage-fr', 'rules');
    let dirty = false;
    for ( let [fieldName, value] of Object.entries(foundry.utils.flattenObject(formData)) ) {
      const [index, propertyName] = fieldName.split('.');
      if ( curRules[index][propertyName] !== value ) {
        //log({index, propertyName, value});
        curRules[index][propertyName] = value;
        dirty = dirty || true;
      }
      if ( dirty ) {
        await game.settings.set('mage-fr', 'rules', curRules);
      }
    }
  }
}