// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * 
 * @extends {Application}
 */
 export class TraitSelect extends Application {
  
  constructor(data, options) {
    super(options);
    this.data = data;
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialog', 'dialogue'],
      template: 'systems/mage-fr/templates/apps/trait-select.hbs',
      width: 400,
      height: 'fit-content',
      resizable: false
    });
  }

  get title() {
    return game.i18n.format( 'M20E.prompts.selectTraitTitle', {name : this.data.name});
  }

  /** @override */
  getData () {
    const appData = super.getData();
    appData.data = this.data;
    this.keys = this.data.key.split('.');

    appData.key0 = this.keys[0];
    appData.keys0 = this.getKeys(0);

    appData.key1 = this.keys[1];
    appData.keys1 = this.getKeys(1);

    appData.key2= this.keys[2];
    appData.keys2 = this.getKeys(2);
    
    appData.config = CONFIG.M20E;
    appData.isGM = game.user.isGM;
    appData.options = this.options;
    log({appData})
    return appData;
  }

  getKeys(keyIndex) {
    if ( keyIndex >= this.keys.length ) { return null; }
    const locaPrefix = ['category', 'subType'];
    const relativePath = ['stats', ...this.keys.filter((element, index) => index < keyIndex)].join('.');
    const obj = foundry.utils.getProperty(CONFIG.M20E, relativePath);
    return Object.keys(obj).reduce((acc, cur) => {
      const value = typeof obj[cur] === 'string' ? obj[cur] : game.i18n.localize(`M20E.${locaPrefix[keyIndex]}.${cur}`);
      return {...acc, [cur]: value};
    },{});
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html);
    html.find(".dialog-button").click(this._onClickButton.bind(this));
    html.find("input").change(this._onInputChange.bind(this));
    html.find("select").change(this._onSelectChange.bind(this));
    $(document).on('keydown', this._onKeyDown.bind(this));
  }

  _onInputChange(event) {
    event.preventDefault();
    const inputElem = event.currentTarget;
    this.data.key = inputElem.value;
    this.render(true);
  }

  _onSelectChange(event) {
    event.preventDefault();
    const selectElem = event.currentTarget;
    const value = selectElem.options[selectElem.selectedIndex].value;
    const index = parseInt(selectElem.name);
    const keys = this.data.key.split('.');
    keys[index] = value;
    keys.length = index + 1;
    let tmp = Object.keys(foundry.utils.getProperty(CONFIG.M20E, ['stats', ...keys].join('.')));
    if ( tmp[0] !== '0' ) {
      keys.push(tmp[0]);
      tmp = Object.keys(foundry.utils.getProperty(CONFIG.M20E, ['stats', ...keys].join('.')));
      if ( tmp[0] !== '0' ) {
        keys.push(tmp[0]);
      }
    }
    this.data.key = keys.join('.');
    this.render(true);
  }

  /**
   * Creates a new instance of TraitSelect,
   * instanciated with current Trait key.
   * pass a promise resolve as callback
   * @param {Object} appData 
   * @param {String} [appData.key] key defining the current Trait
   * @param {String} [appData.name] prefix name of the App
   * @param {Object} [appData.options] regular app options
   */
  static async prompt({key, name, keyPrefix, keySuffix, options={}}={}) {
    return new Promise((resolve, reject) => {
      const traitSelect = new this({
        name: name,
        key: key,
        keyPrefix: keyPrefix,
        keySuffix: keySuffix,
        callback: (result) => resolve(result)
      }, options);
      traitSelect.render(true);
    });
  }

  /**
   * add delimiters ('.') between prefix key and suffix if relevant
   */
  getFormatedKey() {
    let formatedKey = this.data.keyPrefix ? `${this.data.keyPrefix}.${this.data.key}` : this.data.key;
    formatedKey = this.data.keySuffix ? `${formatedKey}.${this.data.keySuffix}` : formatedKey;
    return formatedKey;
  }

  /**
   * Resolve the Promise by using the callback function with formatedKey as an argument
   * then closes the App
   * @param  {} event
   */
  _onClickButton(event) {
    event.preventDefault();
    this.data.callback(this.data.key);
    this.close({resolved: true});
  }

  /**
   * From Foundry.js class Dialog
   * Handle a keydown event while the dialog is active
   * @param {KeyboardEvent} event   The keydown event
   * @private
   */
  _onKeyDown(event) {
    // Close dialog
    if ( event.key === "Escape" ) {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }
    // Confirm default choice
    if ( (event.key === "Enter") ) {
      event.preventDefault();
      event.stopPropagation();
      this.data.callback(this.data.key);
      this.close({resolved: true});
    }
  }

  async close(options = {}) {
    if ( !options?.resolved ) {
      this.data.callback(null);
    }
    $(document).off('keydown');
    return super.close(options);
  }
}