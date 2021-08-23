// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * 
 * @extends {Application}
 */
 export default class TraitSelect extends Application {
  
  /** @override */
  constructor(trait, options){
    super(options);
    this.trait = trait;
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialogue'],
      template: 'systems/mage-fr/templates/apps/trait-select.hbs',
      title: game.i18n.localize('M20E.diceThrows.diceThrows'),
      width: 500,
      height: 'fit-content',
      resizable: false
    });
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

  /**
   * removes the hook and the circular reference to the diceThrow
   * @param  {} options={}
   */
  async close(options={}) {
    //do some cleaning
    this.diceThrow = null;
    
    //call super
    return super.close(options);
  }
}