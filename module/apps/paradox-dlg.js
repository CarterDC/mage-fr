// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";
import Trait from '../trait.js'
import M20eThrow from '../throw.js'
import { M20E } from '../config.js'


const MAGICK_TYPE_COINCIDENTAL = 0; //todo : redo better in config
const MAGICK_TYPE_VULGAR = 1;
const MAGICK_TYPE_VULGAR_WITNESS = 2;

/**
 * @extends {Application}
 */
export default class ParadoxDialog extends Application {

  /** @override */
  constructor(actor, roll, options={}) {
    super(options);
    this.colapsibles = {
      results: true,
      resonance: true
    };
    this.document = actor;
    this.roll = roll;
    this.prepareData();
  }

  prepareData() {
    this.data = this.roll.options;
    this.data.stats = this.data.stats.map(traitData => {
        return traitData instanceof Trait ? traitData : Trait.fromData(traitData);
      });
    this.data.termTotal = this.roll.terms[0].total;
    this.data.maxLevel = M20eThrow.getThrowLevel(this.data.stats);
    this.data.magickType = MAGICK_TYPE_COINCIDENTAL;
    this.data.termResult = this.data.termTotal === 0 ? 'fail' : 
        (this.data.termTotal > 0 ? 'succ' :
        (this.roll.isCritFailure() ? 'crit' : 'fail'));
    this.calculateParadoxGain();
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialog', 'item'],
      width: 400,
      height: 'auto',
      title: game.i18n.localize('M20E.prompts.paradoxTitle'),
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: false
    });
  }

   /** @inheritdoc */
   get template() {
    return 'systems/mage-fr/templates/apps/paradox-dlg.hbs';
  }

  /** @override */
  getData() {
    
    const isEditable = this.isEditable;
    const appData = {
      cssClass: isEditable ? "editable" : "locked",
      editable: isEditable,
      document: this.document,
      limited: this.document.limited,
      options: this.options,
      owner: this.document.isOwner,
      title: this.title
    };
    appData.actorData = this.document.data.toObject(false);
    appData.data = this.data;
    const paradoxTotal = this.document.data.data.resources.magepower.paradox + this.data.paradoxGain;
    appData.data.paradoxTotal = paradoxTotal <= 20 ? paradoxTotal : '20+';

    //creates an array for the radio options : value from 3 to 9, checked or ''
    appData.radioOptions = [
      {
      value: MAGICK_TYPE_COINCIDENTAL,
      checked: this.data.magickType === MAGICK_TYPE_COINCIDENTAL ? 'checked' : '',
      label: game.i18n.localize('M20E.magickType.coincidental')
      },
      {
        value: MAGICK_TYPE_VULGAR,
        checked: this.data.magickType === MAGICK_TYPE_VULGAR ? 'checked' : '',
        label: game.i18n.localize('M20E.magickType.vulgar')
      },
      {
        value: MAGICK_TYPE_VULGAR_WITNESS,
        checked: this.data.magickType === MAGICK_TYPE_VULGAR_WITNESS ? 'checked' : '',
        label: game.i18n.localize('M20E.magickType.vulgarWitness')
      }
    ];

    appData.isGM = game.user.isGM;
    appData.colapsibles = this.colapsibles;

    log(appData);
    return appData;
  }

  calculateParadoxGain() {
    if ( this.data.termResult === 'crit' ) {
      this.data.paradoxGain = this.data.magickType === MAGICK_TYPE_COINCIDENTAL ? this.data.maxLevel :
        (this.data.maxLevel * this.data.magickType) + this.data.magickType;
    } else {
      this.data.paradoxGain = this.data.magickType === MAGICK_TYPE_COINCIDENTAL ? 0 : 1;
    }
  }

  /** @override */
  activateListeners(html) {
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
    html.find('.radio-label').click(this._onRadioClick.bind(this));
    super.activateListeners(html);
  }

  async _onInlineEditChange(event) {
    event.preventDefault();
    event.stopPropagation();
    debugger
    const inputElem = event.currentTarget;
    if ( ! utils.isValidUpdate(inputElem) ) {
      return this.render();
    }
    //value has been validated => update the item
    const updatePath = inputElem.dataset.updatePath || 'data.value';
    let updateValue = utils.isNumeric(inputElem.value) ? parseInt(inputElem.value) : inputElem.value;
    foundry.utils.setProperty(this, updatePath, updateValue);
    this.render();
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
      case 'add-paradox':
        this.document.modParadox(this.data.paradoxGain);
        this.close();
        break;

      case 'roll-feedback':
        this.rollFeedback();
        break;

      case 'colapse':
        this.colapseNext(buttonElem.closest('.title-line'));
        break;
    }
  }

  colapseNext(titleElem) {
    const colapsibleName = titleElem.nextElementSibling.getAttribute('name');
    const toggle = this.colapsibles[colapsibleName] === true;
    this.colapsibles[colapsibleName] = !toggle;
    this.render();
  }

  _onRadioClick(event) {
    const labelElem = event.currentTarget;
    this.data.magickType = parseInt(labelElem.htmlFor.match(/(\d)/g)[0]);
    this.calculateParadoxGain();
    this.render();
  }

  async rollFeedback() {
    //TODO : could be replaced by defered inline roll sent to the player
    //so that he does the dice rolling
    const {quintessence, paradox}  = this.document.data.data.resources['magepower'];
    //nicely pack everything we gonna need for our roll and our message
    const rollOptions = {
      actorId: this.document.id,
      type: "paradox-feedback",
      data: this.data
    };
    //prepare the formula
    const formula = `${paradox + this.data.paradoxGain}d10cs>=6df=1`;
    //evaluate the new roll in order to get the result now
    const m20eRoll = new CONFIG.Dice.M20eRoll(formula, null, rollOptions);
    await m20eRoll.evaluate({async: true});

    let flavor = game.i18n.localize('M20E.prompts.paradoxFeedback') + "<br>";
    if ( m20eRoll._total < 0 ) {
      //crit failure means all paradox is expunged
      await this.document.modParadox( -1 * paradox );
      flavor += game.i18n.format("M20E.prompts.paradoxExpunged", {
        points: paradox
      });
    } else {
      //compute diff
      const mod = this.data.paradoxGain - m20eRoll._total;
      await this.document.modParadox(mod);
      flavor += game.i18n.format("M20E.prompts.paradoxExpunged", {
        points: m20eRoll._total
      });
    }

    // send the message
    const speaker = ChatMessage.getSpeaker({actor: this.document});
    await m20eRoll.toMessage({
      speaker : speaker,
      flavor : flavor
    });
    this.close();
  }

  async close(options) {
    return super.close(options);
  }

}