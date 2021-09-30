// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * 
 * @extends {Application}
 */
 export class GMUI extends Application {
  
  constructor(options) {
    super(options);
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialog', 'dialog'],
      template: 'systems/mage-fr/templates/apps/trait-select.hbs',
      width: 400,
      height: 'fit-content',
      resizable: false
    });
  }

  get title() {
    return 'GM Panel';
  }

  /** @override */
  getData () {
    const appData = super.getData();
    log({appData})
    return appData;
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html);
  }

  async close(options = {}) {
    return super.close(options);
  }
}