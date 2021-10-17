// Import Documents
import M20eItemSheet from './m20e-item-sheet.js'
import {ThrowSheet} from '../throw-sheet.js'
// Import Helpers
//import { Trait, M20eThrow } from '../../dice-helpers.js'
import * as utils from '../../utils.js'
import { log } from "../../utils.js";

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
    sheetData.throws = sheetData.data.throws.map( m20eThrow => {
      return { ...duplicate(m20eThrow), flavor: m20eThrow.getMiniFlavor(this.actor)}
    });
    sheetData.addButtonDisabled = sheetData.throws.length >= 10;
    sheetData.locks = this.locks;
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {
      new ContextMenu(html, '.trait', this._getTraitContextOptions());
    }
    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

    /**
   * @return the context menu options for the '.trait' elements
   * link trait in chat, edit trait, remove JE link from trait that have one
   */
     _getTraitContextOptions() {
      return [
        {//edit actor trait in fakeitem sheet or edit item (in itemSheet)
          name: game.i18n.localize('M20E.context.editTrait'),
          icon: '<i class="fas fa-pencil-alt"></i>',
          callback: element => {
            const throwIndex = element[0].closest(".trait").dataset.index;
            const throwSheet = new ThrowSheet(this.item, throwIndex);
            throwSheet.render(true);
          }
        },
        {//link actor trait or item in chat
          name: game.i18n.localize('M20E.context.linkInChat'),
          icon: '<i class="fas fa-share"></i>',
          callback: element => { //todo should throws be linkable ?
            /*const trait = Trait.fromElement(element[0]);
            if ( trait.itemId ) {
              const item = this.actor.items.get(trait.itemId);
              item.linkInChat();
            } else {
              this._linkInChat(trait);
            }*/
          },
          condition: element => {
            return false;
          }
        }
      ]
    }


  /**
   * Note : In this context 'Item' refers to a M20eThrow object int he data.throws array
   *  @override
   */
  async addItem(buttonElem) {
    if ( Object.keys(CONFIG.M20E.stats).length === 0 ) {
      ui.notifications.warn('M20E.notifications.noActorInWorld');
      return;
    }
    this.item.addThrow();
  }

  /**
   * Note : In this context 'Item' refers to a M20eThrow object int he data.throws array
   *  @override
   */
  async editItem(buttonElem) {
    const throwIndex = buttonElem.closest(".trait").dataset.index;
    const throwSheet = new ThrowSheet(this.item, throwIndex);
    throwSheet.render(true);
  }

  /**
   * Note : In this context 'Item' refers to a M20eThrow object int he data.throws array
   *  @override
   */
  async removeItem(buttonElem) {
    const throwIndex = buttonElem.closest(".trait").dataset.index;
    this.item.removeThrow(throwIndex);
  }

  async moveUpItem(buttonElem) {
    const throwIndex = buttonElem.closest(".trait").dataset.index;
    this.item.moveUpThrow(throwIndex);
  }

  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */



}
