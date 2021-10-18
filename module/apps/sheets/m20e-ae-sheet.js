import { TraitSelect } from '../trait-select-dlg.js'
// Import Helpers
import * as utils from '../../utils.js'
import { log } from "../../utils.js";

/**
 * a fake itemsheet to edit ActiveEffects in lieu of ActiveEffectConfig
 * doesn't display lot of 'useless' options ie: time related stuff
 * @extends {DocumentSheet}
 */
export default class M20eAeSheet extends DocumentSheet {

  /** @override */
  constructor(...args) {
    super(...args);

    this.locks = {effects: true};
    //add the paradigm css class (if any) to the default options.
    const paraItem = this.actor?.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      width: 400,
      height: 'auto',
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }],
      baseApplication: "ActiveEffectSheet",
      id: "effect"
    });
  }

  /** @inheritdoc */
  get id() {
    if (this.actor) return `actor-${this.actor.id}-effect-${this.effect.id}`;
    else return `item-${this.object.parent.id}-effect-${this.effect.id}`;
  }

   /** @inheritdoc */
   get template() {
    return `systems/mage-fr/templates/apps/active-effect-sheet.hbs`;
  }

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("ITEM.TypeActiveeffect")} : ${this.object.data.label}`;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference to the Effect entity
   * @type {ActiveEffect}
   */
  get effect() {
    return this.object;
  }

  /**
   * The Actor instance which owns this effect.
   * if effect is owned by an item, returns the owning actor of said item
   * might be null if item is not owned
   * @type {Actor}
   */
  get actor() {
    return this.object.parent.isOwned ? this.object.parent.actor :
      (this.object.parent.documentName === "Actor" ? this.object.parent : null);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    const sheetData = super.getData(options);
    const effectData = this.effect.data.toObject(false); 

    sheetData.data = effectData;
    sheetData.isActorEffect = this.object.parent.documentName === "Actor";
    sheetData.isItemEffect = this.object.parent.documentName === "Item";
    sheetData.modes = Object.entries(CONST.ACTIVE_EFFECT_MODES).reduce((obj, e) => {
        obj[e[1]] = game.i18n.localize("EFFECT.MODE_"+e[0]);
        return obj;
      }, {});

    //prepare effects array with predigested data
    sheetData.effects = this.effect.data.changes.map(effect => {
      const {traitKey} = M20eAeSheet.splitKey(effect.key);
      let localizedKey = this.actor?.locadigm(traitKey) || game.i18n.localize(`M20E.${traitKey}`);
      if ( localizedKey === `M20E.${traitKey}` ) {
        localizedKey = foundry.utils.getProperty(CONFIG.M20E.stats, traitKey);
      }
      return {
        key: localizedKey,
        mode: effect.mode,
        modeString: sheetData.modes[effect.mode],
        value: effect.value
      };
    });

    //other usefull data
    sheetData.config = CONFIG.M20E;
    sheetData.isGM = game.user.isGM;
    sheetData.locks = this.locks;

    log({effect: this.effect.data.label, sheetData : sheetData});
    return sheetData;
  }

  /* -------------------------------------------- */

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    let canConfigure = this.isEditable && game.user.isGM;
    if (!canConfigure) return buttons;
    
    // Add a Sheet Configuration button
    buttons.unshift({
      label: "Sheet",
      class: "configure-sheet",
      icon: "fas fa-cog",
      onclick: ev => this._onDisplayVanillaSheet(ev)
    });
    return buttons;
  }

  _onDisplayVanillaSheet(event) {
    const configSheet = new ActiveEffectConfig(this.effect);
    configSheet.render(true);
    this.close();
  }

/* -------------------------------------------- */
/*  Event Listeners and Handlers                */
/* -------------------------------------------- */

  /** @override */
  activateListeners(html) {

    //actions for everyone  

    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {

    }
    if ( game.user.isGM && !this.object.parent.isOwned) {
      html.find('img[data-edit]').click(ev => this._onEditImage(ev));
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
      html.find('select').change(this._onSelectChange.bind(this));
    }
    super.activateListeners(html);
  }

  //
  async _onInlineEditChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    const index = element.closest(".trait").dataset.index;

    const changes = duplicate(this.effect.data.changes);
    changes[index].value = parseInt(element.value);
    return await this.effect.update({'changes': changes});
  }

  async _onSelectChange(event) {
    const selectElem = event.currentTarget;
    const newMode = selectElem.options[selectElem.selectedIndex].value;
    const index = selectElem.closest(".trait").dataset.index;

    const changes = duplicate(this.effect.data.changes);
    changes[index].mode = parseInt(newMode);
    return await this.effect.update({'changes': changes});
  }


  /* -------------------------------------------- */

  /**
   * Handle changing the item image
   * @private
   */
  _onEditImage(event) {
    const attr = event.currentTarget.dataset.edit;
    const current = getProperty(this.effect.data, attr);
    const fp = new FilePicker({
      type: "image",
      current: current,
      callback: path => {
        event.currentTarget.src = path;
        if ( this.options.submitOnChange ) {
          this._onSubmit(event);
        }
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    return fp.browse();
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if ( !this.object.id ) return;
    if ( this.object.parent.isOwned ) { return; }
    return this.object.update(formData);
  }

  /* -------------------------------------------- */

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
      case 'check':
        this.disableItem(buttonElem);
        break;
    }
  }

  //In this instance 'item' is a change entry in the changes array for this ActiveEffect
  async disableItem(buttonElem) {
    //updates the disabled value of an active affect
    this.effect.update({"disabled": !(this.effect.data.disabled)});
  }

  //In this instance 'item' is a change entry in the changes array for this ActiveEffect
  async addItem(buttonElem) {
    if ( Object.keys(CONFIG.M20E.stats).length === 0 ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.noActorInWorld'));
      return;
    }
    const changes = duplicate(this.effect.data.changes);
    changes.push({key: "stats.attributes.stre.value", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: "0"});
    return await this.effect.update({'changes': changes});
  }

  //In this instance 'item' is a change entry in the changes array for this ActiveEffect
  async editItem(buttonElem) {
    const effectIndex = buttonElem.closest(".trait").dataset.index;
    const changes = duplicate(this.effect.data.changes);
    const {prefix, traitKey, suffix} = M20eAeSheet.splitKey(changes[effectIndex].key);

    let newTraitKey = await TraitSelect.prompt({
      name: this.effect.data.label,
      key: traitKey,
      keyPrefix: prefix,
      keySuffix: suffix
    });
    if ( !newTraitKey ) { return; }
    newTraitKey = `${prefix}.${newTraitKey}.${suffix}`;
    if ( this.actor ) {
      //prevent adding a change to a property that doesn't exist 
      if ( ! foundry.utils.hasProperty(this.actor.data, newTraitKey) ) { return;}
    }
    changes[effectIndex].key = newTraitKey;
    return await this.effect.update({'changes': changes});
  }

  static splitKey(key) {
    const keys = key.split('.');
    return {
      suffix: keys[keys.length - 1],
      prefix: keys[0],
      traitKey: keys.filter( (key, index, arr) => index >= 1 && index < arr.length - 1).join('.')
    }
  }

  //In this instance 'item' is a change entry in the changes array for this ActiveEffect
  async removeItem(buttonElem) {
    const effectIndex = buttonElem.closest(".trait").dataset.index;
    const changes = duplicate(this.effect.data.changes);
    changes.splice(effectIndex, 1);
    return await this.effect.update({'changes': changes});
  }
}
