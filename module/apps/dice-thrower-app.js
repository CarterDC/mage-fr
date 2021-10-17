import DiceThrower  from '../dice-thrower.js'
import M20eThrow from '../throw.js' 
import { M20E } from '../config.js'
import { DynaCtx } from "../dyna-ctx.js"
// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";

/**
 * User interface with a DiceThrower object, allowing for some throw options
 * modification of the traits to throw, difficulty, dicepool, throwMode, rollMode...
 * 
 * @extends {Application}
 */
 export default class DiceThrowerApp extends Application {
  
  /** @override */
  constructor(diceThrower, options){
    super(options);

    this.dt = diceThrower;
    this.closeOnRoll = true;
    this.resetOnRoll = true;

    this.colapsibles = {
      dicePool: true,
      difficulty: true,
      success: true
    };

    //add the paradigm css class if any to the default options.
    const paraItem = this.dt.actor.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }

    //register a hook on updateActor in order to refresh the diceThrow with updated actor values.
    //Hooks.on('systemSettingChanged', this.onSystemSettingChanged);
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialog'],
      template: 'systems/mage-fr/templates/apps/dice-thrower-app.hbs',
      width: 290,
      height: 'auto',
      resizable: false
    });
  }

  get title() {
    return this.dt.actor.name;
  }

  /** @override */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    // reset dt button
    buttons = [
      {
        class: "reset-dt",
        label: game.i18n.localize('M20E.labels.reset'),
        icon: 'fas fa-undo-alt',
        onclick: ev => this._onResetButtonClick(ev)
      }
    ].concat(buttons);

    return buttons;
  }

  /** @override */
  getData () {
    const appData = super.getData();

    appData.dt = this.dt;
    appData.stats = this.dt._throw.stats;
    this.isEffectThrow = M20eThrow.isEffectThrow(appData.stats);
    this.maxEffectLevel = M20eThrow.getThrowLevel(appData.stats);

    appData.data = {
      dpModTotal: this.dt.getDicePoolModTotal(),
      dpTooltips: utils.getModsTooltipData(this.dt.data.dicePoolMods),
      diffModTotal: this.dt.getDifficultyModTotal(),
      diffTooltips: utils.getModsTooltipData(this.dt.data.difficultyMods, true),
      successMods: Object.values(this.dt.data.successMods).reduce((acc, cur) => {
        return cur < 0 ? {...acc, malus: acc.malus + parseInt(cur)} : {...acc, bonus: acc.bonus + parseInt(cur)}
      },{bonus: 0, malus: 0}),
      modeOnesState: this.getModeOnesState(),
      modeTensState: this.getModeTensState()
    };

    //creates an array for the radio options : value from 3 to 9, checked or ''
    appData.radioOptions = [...Array(7)].map((value, index) => {
      index = index + 3; //we start from 3 to 9
      const checked = this.dt.data.difficultyTotal === (index) ? 'checked' : '';
      return {value: `${index}`, visualCue: this.getVisualCue(index), ...{checked}};
    });

    //icon and title for the throw button
    appData.extras = M20E.rollModeExtras[this.dt.data.rollMode];

    //lock bullets for every thing but pure actor effects
    appData.mainLock = false; // not used atm
    appData.bulletLock = !this.isEffectThrow || this.dt.data.statLock;
    appData.throwLock = this.dt.data.dicePoolTotal <= 0;

    appData.closeOnRoll = this.closeOnRoll;
    appData.resetOnRoll = this.resetOnRoll;

    appData.colapsibles = this.colapsibles;
    log({appData});
    return appData;
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)

    //roll threshold adjustement
    html.find('.radio-label').click(this._onRadioClick.bind(this));
    //adjustement of trait values (only on player magical effects)
    html.find('.bullet[data-clickable="true"').click(this._onBulletClick.bind(this));
    //every other button on the app
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    //success range
    html.find('#inverted').change(this._onSuccessRangeChange.bind(this));
    //rollMode options in the context menu for the throw button
    new DynaCtx(html, '.throw-dice[data-disabled="false"]', (button) => this._getRollModeContextMenu(button), true);
    //new ContextMenu(html, '.throw-dice[data-disabled="false"]', this._getRollModeContextMenu());
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
          this.dt.updateData('rollMode', "stealthroll", {silent: true});
          this.dt.roll({closeOnRoll: this.closeOnRoll, resetOnRoll: this.resetOnRoll});
        },
        condition: element => {
          return game.user.isGM;
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwSelfRoll'),
        icon: '<i class="fas fa-user"></i>',
        callback: element => {
          this.dt.updateData('rollMode', "selfroll", {silent: true});
          this.dt.roll({closeOnRoll: this.closeOnRoll, resetOnRoll: this.resetOnRoll});
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwBlindRoll'),
        icon: '<i class="fas fa-eye-slash"></i>',
        callback: element => {
          this.dt.updateData('rollMode', "blindroll", {silent: true});
          this.dt.roll({closeOnRoll: this.closeOnRoll, resetOnRoll: this.resetOnRoll});
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwGmRoll'),
        icon: '<i class="fas fa-user-friends"></i>',
        callback: element => {
          this.dt.updateData('rollMode', "gmroll", {silent: true});
          this.dt.roll({closeOnRoll: this.closeOnRoll, resetOnRoll: this.resetOnRoll});
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwPublicRoll'),
        icon: '<i class="fas fa-users"></i>',
        callback: element => {
          this.dt.updateData('rollMode', "roll", {silent: true});
          this.dt.roll({closeOnRoll: this.closeOnRoll, resetOnRoll: this.resetOnRoll});
        }
      }
    ];
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  _onResetButtonClick(event){
    this.dt.resetAll();
  }

  _onSuccessRangeChange(event){
    const inputElem = event.currentTarget;
    this.dt.updateData('successMods.userMod', inputElem.value);
  }

  /**
   * Updates the DiceThrow threshold according to the radio button that's been clicked
   * @param  {} event
   */
  _onRadioClick(event) {
    const labelElem = event.currentTarget;
    const newTotalDiff = parseInt(labelElem.htmlFor.match(/(\d)/g)[0]);
    const newUserMod = this.dt.data.difficultyMods.userMod + (newTotalDiff - this.dt.data.difficultyTotal);
    this.dt.updateData('difficultyMods.userMod', newUserMod);
  }

  /**
   * dispatch mini-button clicks according to their data-action
   * @param  {} event
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
    const traitElem = buttonElem.closest('.trait');
    //const statIndex = traitElem.dataset.key;

    switch ( dataset.action ) {
      case 'roll':
        this.dt.roll({closeOnRoll: this.closeOnRoll, resetOnRoll: this.resetOnRoll});
        break;
      case 'remove':
        this.dt.removeStatByIndex(traitElem.dataset.key);
        break;
      case 'spe':
        const speToggle = (dataset.active === 'true');
        this.dt.updateStatProperty(traitElem.dataset.key, 'data.useSpec', !speToggle)
        break;
      case 'mod-plus':
        this.dt.updateData('dicePoolMods.userMod', this.dt.data.dicePoolMods.userMod + 1);
        break;
      case 'mod-minus':
        this.dt.updateData('dicePoolMods.userMod', this.dt.data.dicePoolMods.userMod - 1);
        break;
      case 'resetOnRoll':
        this.resetOnRoll = !this.resetOnRoll;
        buttonElem.dataset.active = this.resetOnRoll;
        break;
      case 'closeOnRoll':
          this.closeOnRoll = !this.closeOnRoll;
          buttonElem.dataset.active = this.closeOnRoll;
          break;
      case 'colapse':
        this.colapseNext(buttonElem.closest('.title-line'));
        break;
      case 'check': // can either be 1 or 0
        ui.notifications.info('Feature currently deactivated.')
        //const newWillpowerMod = ( this.dt.data.successMods.willpowerMod === 1 )? 0 : 1;
        //this.dt.updateData('successMods.willpowerMod', newWillpowerMod);
        break;
      case 'mode-ones':
        this.updateModeOnes();
        break;
      case 'mode-tens':
        this.dt.updateData('throwMode', this.dt.data.throwMode ^ M20E.THROWMODE.XPLODE_SUCCESS);
        break;
      default :
        break;
    };
  }

  updateModeOnes() {
    const currentOneMode = this.dt.data.throwMode;
    let newOneMode =  currentOneMode;
    if ( currentOneMode & M20E.THROWMODE.RESULT_CRITICAL ) { //state 2 -> state 0
      newOneMode ^= M20E.THROWMODE.DEFAULT;
    } else if ( currentOneMode & M20E.THROWMODE.DEDUCT_FAILURES ) { //state 1 -> state 2
      newOneMode |= M20E.THROWMODE.RESULT_CRITICAL;
    } else { //state 0 -> state 1
      newOneMode |= M20E.THROWMODE.DEDUCT_FAILURES;
    }
    this.dt.updateData('throwMode', newOneMode);
  }

  colapseNext(titleElem) {
    const colapsibleName = titleElem.nextElementSibling.getAttribute('name');
    const toggle = this.colapsibles[colapsibleName] === true;
    this.colapsibles[colapsibleName] = !toggle;
    this.render();
  }

  /**
   * update the value of a trait given the bullet that's been clicked
   * only avail from clickable bullets
   * This value is mostly used to calculate max effect level and thus paradox points
   * @param  {} event
   */
  _onBulletClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const index = element.closest('.trait').dataset.key;
    const newValue = parseInt(element.dataset.index) + 1;

    this.dt.updateStatProperty(index, 'data.valueOverride', newValue);
  }

  getModeOnesState() {
    return ( this.dt.data.throwMode & M20E.THROWMODE.DEDUCT_FAILURES ) ? 
    (( this.dt.data.throwMode & M20E.THROWMODE.RESULT_CRITICAL ) ? 2 : 1) : 0;
  }

  getModeTensState() {
    return (this.dt.data.throwMode & M20E.THROWMODE.XPLODE_SUCCESS) ? 3 : 0;
  }

  /**
   * @param  {Number} thresholdValue the 2 to 10 index of a radio button (corresponding to an actual threshold value)
   * 
   * @returns {String} whether the difficulty threshold is coincidental, or vulgar according to the rules
   */
  getVisualCue(thresholdValue) {
    if ( !game.settings.get('mage-fr', 'displayDifficultyCues') ) { return null; }

    if ( this.isEffectThrow ) {
      switch ( thresholdValue - (this.maxEffectLevel + (this.dt.data.difficultyBase - 3)) ) {
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

  //might not be ncessary
  onSystemSettingChanged = (newValue, settingName) => {
    /*if ( settingName === 'baseRollThreshold' ) {
      this.dt.update();
    }*/
  }
}