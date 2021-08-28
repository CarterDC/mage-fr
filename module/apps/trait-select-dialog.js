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
    return `${this.data.name} : Select Trait`; //todo : localize
  }

  /** @override */
  getData () {
    const appData = super.getData();
    appData.data = this.data;
    this.keys = this.data.key.split('.');

    appData.key2 = this.keys[2];
    appData.keys2 = this.getKeys(2);

    appData.key3 = this.keys[3];
    appData.keys3 = this.getKeys(3);

    appData.key4= this.keys[4];
    appData.keys4 = this.getKeys(4);
    
    appData.config = CONFIG.M20E;
    appData.isGM = game.user.isGM;
    appData.options = this.options;
    log({appData})
    return appData;
  }

  getKeys(keyIndex) {
    if ( keyIndex >= (this.keys.length - 1) || this.keys[keyIndex] === 'value') { return null; }
    const relativePath = this.keys.filter((element, index) => index>0 && index < keyIndex).join('.');
    const obj = foundry.utils.getProperty(CONFIG.M20E, relativePath);
    return Object.keys(obj).reduce((acc, cur) => {
      const value = typeof obj[cur] === 'string' ? obj[cur] : cur;
      return {...acc, [cur]: value};
    },{});
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html);
    html.find(".dialog-button").click(this._onClickButton.bind(this));
    html.find("input").change(this._onInputChange.bind(this));
    html.find("select").change(this._onSelectChange.bind(this));
  }

  _onClickButton(event) {
    event.preventDefault();
    this.data.callback(this.data.key);
    this.close({resolved: true});
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
    keys.shift(); //remove 'data'
    keys.length = index;
    let tmp = Object.keys(foundry.utils.getProperty(CONFIG.M20E, keys.join('.')));
    if ( tmp[0] !== '0' ) {
      keys.push(tmp[0]);
      tmp = Object.keys(foundry.utils.getProperty(CONFIG.M20E, keys.join('.')));
      if ( tmp[0] !== '0' ) {
        keys.push(tmp[0]);
      }
    }
    keys.push('value');
    this.data.key = ['data', ...keys].join('.');
    this.render(true);
  }

  static async prompt({key, name, options={}}={}) {
    return new Promise((resolve, reject) => {
      const traitSelect = new this({
        name: name,
        key: key,
        callback: (result) => resolve(result)
      }, options);
      traitSelect.render(true);
    });
  }

  async close(options = {}) {
    if ( !options.resolved ) {
      this.data.callback(null);
    }
    return super.close(options);
  }

}