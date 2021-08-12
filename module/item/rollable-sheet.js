// Import Documents
import M20eItemSheet from './m20e-item-sheet.js'
// Import Helpers
import { Trait, ExtendedTrait, MageThrow } from "../utils/classes.js";
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * @extends {M20eItemSheet}
 */
export default class M20eRollableSheet extends M20eItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    this.locks = {throws: true};
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    sheetData.locks = this.locks;
    sheetData.throws = sheetData.data.throws;
  
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
   * Note : In this context 'Item' refers to a magycal effect in the form of a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async addItem(buttonElem) {
    
  }

  /**
   * Note : In this context 'Item' refers to a magycal effect in the form of a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async editItem(buttonElem) {
    //does nothing, there's no edit button on rote effects ^^
  }

  /**
   * Note : In this context 'Item' refers to a magycal effect in the form of a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async removeItem(buttonElem) {

  }


  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */



}
