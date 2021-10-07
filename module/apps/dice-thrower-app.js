import DiceThrower  from '../dice-thrower.js'
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

    this.expands = {
      flavor: true,
      stats: true,
      pool: true, 
      difficulty: true,
      success: true,
      buttons: true
    }

    //add the paradigm css class if any to the default options.
    const paraItem = this.dt.actor.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }

    //register a hook on updateActor in order to refresh the diceThrow with updated actor values.
    //Hooks.on('updateActor', this.onUpdateActor);
    //Hooks.on('updateCoreRollMode', this.onUpdateCoreRollMode);
    //Hooks.on('systemSettingChanged', this.onSystemSettingChanged);
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialog'],
      template: 'systems/mage-fr/templates/apps/dice-thrower-app.hbs',
      width: 290,
      height: 'fit-content',
      resizable: true
    });
  }

  get title() {
    return this.dt.actor.name;
  }

  /** @override */
  getData () {
    const appData = super.getData();

    appData.dt = this.dt;
    appData.stats = this.dt._throw.stats;
    appData.data = {
      dpModTotal: this.dt.getDicePoolModTotal(),
      dpTooltips: utils.getModsTooltipData(this.dt.data.dicePoolMods),
      diffModTotal: this.dt.getDifficultyModTotal(),
      diffTooltips: utils.getModsTooltipData(this.dt.data.difficultyMods, true)
    };

    //creates an array for the radio options : value from 3 to 9, checked or ''
    appData.radioOptions = [...Array(7)].map((value, index) => {
      index = index + 3; //we start from 3 to 9
      const checked = this.dt.data.difficultyTotal === (index) ? 'checked' : '';
      return {value: `${index}`, visualCue: this.getVisualCue(index), ...{checked}};
    });

    //icon and title for the throw button
    appData.extras = CONFIG.M20E.rollModeExtras[game.settings.get("core", "rollMode")];

    //lock bullets for every thing but pure actor effects
    appData.mainLock = false;
    appData.bulletLock = true;
    appData.throwLock = this.dt.dicePoolTotal === 0;

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
          this.dt.rollMode = "stealthroll";
          this.dt.throwDice(this.closeOnRoll);
        },
        condition: element => {
          return game.user.isGM;
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwSelfRoll'),
        icon: '<i class="fas fa-user"></i>',
        callback: element => {
          this.dt.rollMode = "selfroll";
          this.dt.throwDice(this.closeOnRoll);
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwBlindRoll'),
        icon: '<i class="fas fa-eye-slash"></i>',
        callback: element => {
          this.dt.rollMode = "blindroll";
          this.dt.throwDice(this.closeOnRoll);
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwGmRoll'),
        icon: '<i class="fas fa-user-friends"></i>',
        callback: element => {
          this.dt.rollMode = "gmroll";
          this.dt.throwDice(this.closeOnRoll);
        }
      },
      {
        name: game.i18n.localize('M20E.context.throwPublicRoll'),
        icon: '<i class="fas fa-users"></i>',
        callback: element => {
          this.dt.rollMode = "roll";
          this.dt.throwDice(this.closeOnRoll);
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
    this.dt.updateChosenThreshold(parseInt(labelElem.innerHTML.trim()))
  }

  /**
   * dispatch mini-button clicks according to their data-action
   * @param  {} event
   */
  _onMiniButtonClick(event) {
    event.preventDefault();
    const buttonElem = event.currentTarget;
    const dataset = buttonElem.dataset;
    if ( dataset.disabled == 'true' ) { return; }

    const traitElem = buttonElem.closest('.trait');
    //const statIndex = traitElem.dataset.key;

    switch ( dataset.action ) {
      case 'roll':
        this.dt.throwDice(null, {closeOnRoll: this.closeOnRoll});
        break;
      case 'remove':
        this.dt.removeTrait(traitElem.dataset.key);
        break;
      case 'spe':
        const speToggle = (dataset.active === 'true');
        this.dt.stats[traitElem.dataset.key].data.useSpec = !speToggle;
        this.dt.update();
        break;
      case 'mod-plus':
        this.dt.data.dicePoolMods.userMod += 1;
        this.dt.update();
        break;
      case 'mod-minus':
        this.dt.data.dicePoolMods.userMod -= 1;
        this.dt.update();
        break;
      case 'auto-close':
        this.closeOnRoll = !this.closeOnRoll;
        buttonElem.dataset.active = this.closeOnRoll;
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
    this.dt.updateTraitValue(traitElem.dataset.key, parseInt(element.dataset.index) + 1);
  }

  /**
   * @param  {Number} thresholdValue the 2 to 10 index of a radio button (corresponding to an actual threshold value)
   * 
   * @returns {String} whether the difficulty threshold is coincidental, or vulgar according to the rules
   */
  getVisualCue(thresholdValue) {
    if ( !game.settings.get('mage-fr', 'displayDifficultyCues') ) { return null; }

    if ( this.dt.isEffectRoll ) {
      const maxEffectLevel = this.getMaxEffectLevel();
      switch ( thresholdValue - (maxEffectLevel + (this.dt.thresholdBase - 3)) ) {
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
   * rotate between the 3 throw settings depending on the mouse button
   * throw settings drive the roll modifiers df=1 and xs=10 
   * @param  {} event
   */
  _onSettingsClick(event) {
    switch ( event.which ) {
      case 1://left button
        this.dt.rotateSetting(-1);
        break;
      case 3://right button
        this.dt.rotateSetting(1);
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
  onUpdateActor = (actor, data, options, userId) => {
    if ( actor.id !== this.dt.actor.id ) { return ; }
    if ( options.render === true ) {
      this.dt.update(true);
    }
  }

  /**
   * callback for custom hooks on updateCoreRollMode
   * just render the sheet in order to have the roll icon changed (see getData extra)
   */
  onUpdateCoreRollMode = (newRollMode) => {
    this.render(true);
  }

  //might not be ncessary
  onSystemSettingChanged = (newValue, settingName) => {
    /*if ( settingName === 'baseRollThreshold' ) {
      this.dt.update();
    }*/
  }

  /**
   * removes the hook and the circular reference to the diceThrow
   * @param  {} options={}
   */
  async close(options={}) {
    //do some cleaning
    //Hooks.off('updateActor', this.onUpdateActor);
    //Hooks.off('updateCoreRollMode', this.onUpdateCoreRollMode);
    //Hooks.off('systemSettingChanged', this.onSystemSettingChanged);
    this.dt = null;
    
    //call super
    return super.close(options);
  }
}