import DiceThrow  from './dice-throw.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * User interface with a DiceThrow object, allowing for some throw options
 * modification of the traits to throw, threshold, dicepool, throwMode, rollMode...
 * 
 * @extends {Application}
 */
 export default class DiceDialogue extends Application {
  
  /** @override */
  constructor(diceThrow, options){
    super(options);

    this.diceThrow = diceThrow;
    this.closeOnRoll = true;

    //add the paradigm css class if any to the default options.
    const paraItem = this.diceThrow.actor.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }
    //register a hook on updateActor in order to refresh the diceThrow with updated actor values.
    Hooks.on('updateActor', this.onUpdateActor.bind(this));
    Hooks.on('systemSettingChanged', this.onSystemSettingChanged.bind(this));
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialogue'],
      template: 'systems/mage-fr/templates/apps/dice-throw.hbs',
      title: game.i18n.localize('M20E.diceThrows.diceThrows'),
      width: 300,
      height: 'fit-content',
      resizable: false
    });
  }

  /** @override */
  getData () {
    const appData = super.getData();
    const dt = this.diceThrow;

    appData.dt = dt;
    appData.traits = dt.xTraitsToRoll;

    //creates an array for the radio options : value from 2 to 10, checked or ''
    appData.radioOptions = [...Array(9)].map((value, index) => {
      index = index + 2; //we start from 2 to 10
      const checked = dt.thresholdTotal === (index) ? 'checked' : '';
      return {value: `${index}`, visualCue: this.getVisualCue(index), ...{checked}};
    });

    //icon and title for the throw button
    appData.extras = CONFIG.M20E.rollModeExtras[dt.rollMode];
    //lock bullets for every thing but pure actor effects
    appData.bulletsClickLock = !dt.isEffectRoll || dt.isItemThrow;

    appData.closeOnRoll = this.closeOnRoll;
    log({appData})
    return appData;
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)

    //special handeling of the throw settings button since it works with both mouse buttons
    html.find('.mini-button.throw-settings').mousedown(this._onSettingsClick.bind(this));
    //roll threshold adjustement
    html.find('.radio-label').click(this._onRadioClick.bind(this));
    //adjustement of trait values (only on player magical effects)
    html.find('.bullet[data-clickable="true"').click(this._onBulletClick.bind(this));
    //every other button on the app
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    //rollMode options in the context menu for the throw button
    new ContextMenu(html, '.throw-dice', this._getRollModeContextMenu());
  }

  /* -------------------------------------------- */
  /*  Context Menus                               */
  /* -------------------------------------------- */

  /**
   * @return the context menu options for the '.throw-dice' element
   * Set new rollMode for this throw
   */
  _getRollModeContextMenu() {
    return [
      {
        name: game.i18n.localize('M20E.context.throwStealthRoll'),
        icon: '<i class="fas fa-user-secret"></i>',
        callback: element => {
          console.log('MAGE | option non implémentée encore.');
        },
        condition: element => {
          return game.user.isGM;
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwSelfRoll'),
        icon: '<i class="fas fa-user"></i>',
        callback: element => {
          this.diceThrow.rollMode = "selfroll";
          this.diceThrow.throwDice(this.closeOnRoll);
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwBlindRoll'),
        icon: '<i class="fas fa-eye-slash"></i>',
        callback: element => {
          this.diceThrow.rollMode = "blindroll";
          this.diceThrow.throwDice(this.closeOnRoll);
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwGmRoll'),
        icon: '<i class="fas fa-user-friends"></i>',
        callback: element => {
          this.diceThrow.rollMode = "gmroll";
          this.diceThrow.throwDice(this.closeOnRoll);
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwPublicRoll'),
        icon: '<i class="fas fa-users"></i>',
        callback: element => {
          this.diceThrow.rollMode = "roll";
          this.diceThrow.throwDice(this.closeOnRoll);
        }
      }
    ];
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Updates the DiceThrow threshold according to the radio button that's been clicked
   * @param  {} event
   */
  _onRadioClick(event) {
    const labelElem = event.currentTarget;
    this.diceThrow.updateChosenThreshold(parseInt(labelElem.innerHTML.trim()))
  }

  /**
   * dispatch mini-button clicks according to their data-action
   * @param  {} event
   */
  _onMiniButtonClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const traitElem = element.closest('.trait');
    if ( dataset.disabled === 'true' ) { return; }

    switch (dataset.action){
      case 'roll':
        this.diceThrow.throwDice(this.closeOnRoll);
        break;
      case 'remove':
        this.diceThrow.removeTrait(traitElem.dataset.key);
        break;
      case 'spe':
        const speToggle = (dataset.active === 'true');
        this.diceThrow.xTraitsToRoll[traitElem.dataset.key]._useSpec = !speToggle;
        this.diceThrow.update();
        break;
      case 'mod-plus':
        this.diceThrow.dicePoolMods.userMod += 1;
        this.diceThrow.update();
        break;
      case 'mod-minus':
        this.diceThrow.dicePoolMods.userMod -= 1;
        this.diceThrow.update();
        break;
      case 'auto-close':
        this.closeOnRoll = !this.closeOnRoll;
        element.dataset.active = this.closeOnRoll;
        break;
      default :
        break;
    };
  }

  /**
   * update the value of a trait given the bullet that's been clicked
   * only avail from clickable bullets
   * atm got no gameplay effect besides the final flavor text
   * @param  {} event
   */
  _onBulletClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const traitElem = element.closest('.trait');
    this.diceThrow.updateTraitValue(traitElem.dataset.key, parseInt(element.dataset.index) + 1);
  }

  /**
   * @param  {Number} thresholdValue the 2 to 10 index of a radio button (corresponding to an actual threshold value)
   * 
   * @returns {String} whether the difficulty threshold is coincidental, or vulgar according to the rules
   */
  getVisualCue(thresholdValue) {
    if ( !game.settings.get('mage-fr', 'displayThresholdCues') ) { return null; }

    if ( this.diceThrow.isEffectRoll ) {
      const maxEffectLevel = this.getMaxEffectLevel();
      switch ( thresholdValue - (maxEffectLevel + (this.diceThrow.thresholdBase - 3)) ) {
        case 0:
          return 'coincidental';
        case 1:
          return 'vulgar'
        case 2:
          return 'vulgarWitness'
        default:
          return null;
      }
    }
    return null;
  }

  /**
   * returns the max value of a trait (only used in the context of an effect roll)
   * @returns {Number}
   */
   getMaxEffectLevel() {
    return this.diceThrow.xTraitsToRoll.reduce((acc, cur) => (Math.max(acc, cur.value)), 0);
  }

  /**
   * rotate between the 3 throw settings depending on the mouse button
   * throw settings drive the roll modifiers df=1 and xs=10 
   * @param  {} event
   */
  _onSettingsClick(event) {
    switch ( event.which ) {
      case 1://left button
        this.diceThrow.rotateSetting(-1);
        break;
      case 3://right button
        this.diceThrow.rotateSetting(1);
        break;
    };
  }

  /**
   * From the hooks on updateActor
   * call an update of the diceThrow if hook options indicate a render true on our actor
   * @param  {M20eActor} actor
   * @param  {Object} data
   * @param  {Object} options
   * @param  {String} userId
   */
  onUpdateActor(actor, data, options, userId) {
    if ( actor.id !== this.diceThrow.actor.id ) { return ; }
    if ( options.render === true ) {
      //todo : maybe add more checks to avoid useless updates ?? very minor
      this.diceThrow.update(true);
    }
  }

  //todo : redo better ! 
  onSystemSettingChanged(newValue, settingName) {
    if ( settingName === 'baseRollThreshold' ) {
      this.diceThrow.update();
    }
  }

  /**
   * removes the hook and the circular reference to the diceThrow
   * @param  {} options={}
   */
  async close(options={}) {
    //do some cleaning
    Hooks.off('updateActor', this.onUpdateActor);
    Hooks.off('systemSettingChanged', this.onSystemSettingChanged);
    this.closeOnRoll = null;
    this.diceThrow = null;
    
    //call super
    return super.close(options);
  }
}