// Import Documents
import M20eItemSheet from './baseitem-sheet.js'
// Import Helpers
import { Trait, ExtendedTrait, MageThrow } from "../utils/classes.js";
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * @extends {M20eItemSheet}
 */
export default class M20eRoteSheet extends M20eItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    this.locks = {effects: true};
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    sheetData.locks = this.locks;
    sheetData.throw = sheetData.data.throws[0];
    sheetData.availEffects = this.getAvailEffects();
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {

    }
    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Note : In this context 'Item' refers to a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async addItem(buttonElement) {
    this.item.addEffect(this.getAvailEffects());
  }

  /**
   * Note : In this context 'Item' refers to a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async editItem(buttonElement) {
    //does nothing, there's not edit button on rote effects ^^
  }

  /**
   * Note : In this context 'Item' refers to a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async removeItem(buttonElement) {
    //no prompt, just do it ! 
    this.item.removeEffect((buttonElement.closest(".trait").dataset.index))
  }


  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */


  /**
   * returns a {{key{name, valueMax}},} object
   * 
   */
  getAvailEffects() {
    let sphereList = [];
    //todo : filter already added spheres
    sphereList = CONFIG.M20E.spheres.reduce((acc, cur) => 
      ([...acc, {key: cur, name: game.i18n.localize(`M20E.spheres.${cur}`), valueMax : 5}]), []);

    sphereList.sort(utils.alphaSort());
    return sphereList;
    ;
  }
}
