// Import Helpers
import * as utils from '../../utils.js'
import { log } from "../../utils.js";

/**
 * Implements M20eItemSheet as an extension of the ItemSheet class
 * used by most regular item-types
 * advanced item-types use their own item sheets extended from this one.
 * @extends {ItemSheet}
 */
export default class M20eItemSheet extends ItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    if ( this.item.isOwned ) {
      //add the paradigm css class (if any) to the default options.
      const paraItem = this.item.actor.paradigm;
      if ( paraItem ) {
        this.options.classes.push(paraItem.data.data.cssClass);
      }
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject( super.defaultOptions, {
     classes: ['m20e', 'sheet', 'item'],
     width: 400,
     height: 'auto',
     tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
   });
  }

   /** @override */
   get template() {
    return `systems/mage-fr/templates/item/${this.item.data.type}-sheet.hbs`;
  }

  /**
   * removal of the 'sheet' option in the header (since there's no use for it anyway)
   * @override
   */
   _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    const sheetIndex = buttons.findIndex( button => button.label === 'Sheet');
    if ( sheetIndex !== -1 ) {
      buttons.splice(sheetIndex, 1);
    }
    return buttons;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    //sheetData.data is a standard js Object created from the PREPARED itemData
    const itemData = sheetData.data; 
    sheetData.data = itemData.data; //shorthand for convenience to avoid 'data.data' all the time
    
    
    sheetData.showEffectField = !this.item.isOwned || this.item.effects.size;
    sheetData.hasEffect = this.item.effects.size;

    //other usefull data
    sheetData.config = CONFIG.M20E;
    sheetData.isGM = game.user.isGM;

    log({item : this.item.name, sheetData : sheetData});
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    //disable buttons/inputs given their 'protection status'
    if ( this.isOwned ) {
      const isProtected = this.item.data.isProtectedType && this.actor.data.data.creationDone;
      if ( isProtected && !game.user.isGM ) {
        this._protectElements(html);
      }
    }
    //actions for everyone

    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      html.find('#dextPenalty').change(this._onDextPenaltyChange.bind(this));
      html.find('select.inline-edit').change(this._onSubtypeChange.bind(this));
    }
    if ( game.user.isGM ) {
      
    }
    super.activateListeners(html);
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

    //check if action is allowed before going any further
    if ( dataset.disabled == 'true' ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.gmPermissionNeeded'));
      return;
    }

    switch (dataset.action) {
      case 'lock':
        let category = dataset.category;
        let toggle = this.locks[category];
        this.locks[category] = !toggle;
        this.render();
        break;

      case 'add':
        this.addItem(buttonElem);
        break;

      case 'edit':
        this.editItem(buttonElem);
        break;

      case 'remove':
        this.removeItem(buttonElem);
        break;

      case 'moveup':
        this.moveUpItem(buttonElem);
        break;
    }
  }

  //to be implemented by subClasses
  async addItem(buttonElem) {
    if ( this.item.isOwned ) {
      ui.notifications.error(game.i18n.localize('M20E.notifications.aEffectOwnedItem'));
      return;
    }
    const effectData = {
      label: game.i18n.format('M20E.effectName', {name: this.item.data.name}),
      icon: CONFIG.M20E.defaultImg['ActiveEffect'],
      origin: 'added-manually',
      tint: '#000000'
    };
    this.item.createEmbeddedDocuments('ActiveEffect', [effectData], {renderSheet: true});
  }

  //to be implemented by subClasses
  async editItem(buttonElem) {
    if ( this.item.isOwned ) {
      ui.notifications.error(game.i18n.localize('M20E.notifications.aEffectOwnedItem'));
    }
    const effectId = Array.from(this.item.effects.keys())[0];
    const aEffect = this.item.effects.get(effectId);
    aEffect.sheet.render(true);
  }

  //to be implemented by subClasses
  async removeItem(buttonElem) {
    if ( this.item.isOwned ) {
      ui.notifications.error(game.i18n.localize('M20E.notifications.aEffectOwnedItem'));
      return;
    }
    const effectId = Array.from(this.item.effects.keys())[0];
    this.item.deleteEmbeddedDocuments('ActiveEffect', [effectId]);
  }

  moveUpItem(buttonElem) {

  }

  /**
  *  @override
  * added validation against dtype and MIN/MAX before updating
  * re-renders the sheet to display the previous value if update is invalid
  * note: though data are validated against dtype by foundry,
  * updating a number with a string leaves the input blank
  */
  async _onChangeInput(event) {
    const element = event.target;
    if ( ! utils.isValidUpdate(element) ) {
      event.preventDefault();
      return this.render();
    }
    super._onChangeInput(event);
  }

  /**
   * 'disables' some elements (input/buttons) for items whose actor's creation phase is over.
   * a bit similar to Foundry's disableFields
   * @param {HTMLElement} html sheet.element
   */
  _protectElements(html) {
    const elements = html.find(`input, select`);
    for ( let el of elements) {
      if ( el.name?.includes('data.value') || el.name?.includes('data.subType')) {
        el.setAttribute("disabled", "");
      }
    }
  }

  /**
   * Changes a meritflaw img in accordance to the selected meritflaw subtype
   * Since we're updating the image, might as well update the subtype as well in one call
   * hence the 'stopPropagation'
   * @param  {} event the event that triggered ('.meritflaw select')
   */
  async _onSubtypeChange(event) {
    event.stopPropagation();
    const element = event.currentTarget;
    const newSubType = element.options[element.selectedIndex].value;
    const newImg = CONFIG.M20E.defaultImg[newSubType];

    let updateObj = {['img']: newImg};
    updateObj['data.subType'] = newSubType;
    return this.item.update(updateObj);
  }

  async _onDextPenaltyChange(event) {
    const inputElem = event.currentTarget;
    if ( ! utils.isValidUpdate(inputElem) ) {
      event.preventDefault();
      return this.render();
    }
    const newPenaltyValue = parseInt(inputElem.value);

    const effectId = Array.from(this.item.effects.keys())[0];
    if ( newPenaltyValue ) {
      let armorEffect;
      if ( effectId ) {
        //already an effet => update it
        armorEffect = this.item.effects.get(effectId);
        const changes = duplicate(armorEffect.data.changes);
        changes[0].value = -1 * newPenaltyValue;
        return await armorEffect.update({'changes': changes});
      } else {
        const effectData = {
          label: game.i18n.format('M20E.effectName', {name: this.item.data.name}),
          icon: CONFIG.M20E.defaultImg['ActiveEffect'],
          origin: 'added-manually',
          tint: '#000000',
          changes: [{
            key: "stats.attributes.dext.value",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
             value:  -1 * newPenaltyValue
          }]
        };
        this.item.createEmbeddedDocuments('ActiveEffect', [effectData]);
      }
    } else {
      this.item.deleteEmbeddedDocuments('ActiveEffect', [effectId]);
    }
  }
}
