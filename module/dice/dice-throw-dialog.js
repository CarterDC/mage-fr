import { DiceThrow } from './dice-throw.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
/**
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

    appData.diceThrow = this.diceThrow;
    appData.traits = this.diceThrow.xTraitsToRoll;

    appData.radioOptions = [...Array(9)].map((value, index) => {
      const checked = this.diceThrow.thresholdBase === (index + 2) ? 'checked' : '';
      return {value: `${index+2}`, ...{ checked }};
    });

    appData.closeOnRoll = this.closeOnRoll;
    return appData;
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)
    
    html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
    html.find('.mini-button.throw-settings').mousedown(this._onSettingsClick.bind(this));
    html.find('.radio-label').click(this._onRadioClick.bind(this));

    //html.find('.bullet[data-clickable="true"').click(this._onBulletClick.bind(this));
    
    //new ContextMenu(html, '.dice-throw', this._rollModeContextMenu);
  }

  _onRadioClick(event){
    const element = event.currentTarget;
    this.diceThrow.thresholdBase =  parseInt(element.innerHTML.trim());
    this.diceThrow.update();
  }

  _onMiniButtonClick(event){
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const traitElem = element.closest('.trait');
    
    switch (dataset.action){
      case 'roll':
        this.diceThrow.throwDice();
        if ( this.closeOnRoll ) { this.close(); }
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

}