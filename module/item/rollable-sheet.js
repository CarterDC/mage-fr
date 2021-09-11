// Import Documents
import M20eItemSheet from './m20e-item-sheet.js'
import {ThrowSheet} from '../apps/throw-sheet.js'
// Import Helpers
import { Trait, MageThrow } from "../utils/classes.js";
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
    sheetData.throws = sheetData.data.throws.map( mageThrow => {
      return { ...duplicate(mageThrow), flavor: mageThrow.getFlavor(this.actor)}
    });
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
   * Note : In this context 'Item' refers to a MageThrow object int he data.throws array
   *  @override
   */
  async addItem(buttonElem) {
    const throws = duplicate(this.item.data.data.throws);
    throws.push(new MageThrow({name: game.i18n.localize('M20E.new.throw')}));
    return await this.item.update({['data.throws']: throws});
  }

  /**
   * Note : In this context 'Item' refers to a MageThrow object int he data.throws array
   *  @override
   */
  async editItem(buttonElem) {
    const throwIndex = buttonElem.closest(".trait").dataset.index;
    const throwSheet = new ThrowSheet(this.item, throwIndex);
    throwSheet.render(true);
  }

  /**
   * Note : In this context 'Item' refers to a MageThrow object int he data.throws array
   *  @override
   */
  async removeItem(buttonElem) {
    const throwIndex = buttonElem.closest(".trait").dataset.index;
    const throws = duplicate(this.item.data.data.throws);
    throws.splice(throwIndex, 1);
    return await this.item.update({['data.throws']: throws});
  }


  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */



}
