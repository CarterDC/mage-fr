// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";

/**
 * Implements M20eActor as an extension of the Actor class
 * atm only used by the charMage actor-type.
 * @extends {Actor}
 */
 export default class M20eActor extends Actor {

  /** @override */
  constructor(...args) {
    //might need to do stuff in here
    super(...args);
  }

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    
    //get the default abilities from either config or compendium if any
    const defaultAbilities = await this._getDefaultAbilities();

    //get some other items

    //do some stuff depending on actor type (char or npc..)
    if ( this.data.isPlayable === true ) {
      this.data.token.update({actorLink: true});
    }

    //merge all items together
    const items = [...defaultAbilities];
    //update everything
    this.data.update({items});
  }

  //TODO : create from compendium if any

  async _getDefaultAbilities() {
    //prepare default abilities
    const defaultAbilities = Object.entries(CONFIG.M20E.defaultAbilities)
      .map(([key, value]) => {
        return {
          type: 'ability',
          img: '',
          name: game.i18n.localize(`M20E.defaultAbilities.${key}`),
          data: {
            subType: value,
            //todo : add localization for specific item types
            systemDescription: ''
          }
        }
    });
    //alpha sort now that it's localized
    defaultAbilities.sort(utils.alphaSort());
    return defaultAbilities;
  }

  /** @override */
  prepareData() {
    super.prepareData();
    const actorData = this.data;

    this._updateHealthStats();    
    //this.updateMagePower(actorData);
  }

  get paradigm() {
    return this.items.filter(item => item.type === "paradigm")[0];
  }

  getLexiconEntry(relativePath) {
    const paraItem = this.paradigm;
    if ( !paraItem ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.missingParadigm'));
      return;
    }
    return paraItem.getLexiconEntry(relativePath);
  }

  async setLexiconEntry(relativePath, newValue){
    const paraItem = this.paradigm;
    if ( !paraItem ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.missingParadigm'));
      return;
    }
    return await paraItem.setLexiconEntry(relativePath, newValue);
  }

  /** Reevaluates secondary health stats 'status' and 'malus'
   * according to health values and the list of maluses
   */
  _updateHealthStats() {
    let health = this.data.data.health;
    //prepare an array of negative integers from the comma separated string
    const maluses = health.malusList.split(',').map(v => (-1 * parseInt(v)));
    const wounds = health.max - health.value;

    health.status = game.i18n.localize(`M20E.healthStatus.${wounds}`);
    if ( wounds > 0 ) {
      health.malus = maluses[wounds - 1];
    } else {
      health.malus = 0;
    }
  }

  /** 'Safe' update as in 
   * "if value is a number, parseInt it just to be on the 'safe' side"
   * assumes the value as already been checked against min & max
   */
  async safeUpdateProperty(relativePath, newValue){
    //beware of floats !!!
    const propertyValue = isNaN(newValue) ? newValue : parseInt(newValue);
    let obj = {};
    obj[`data.${relativePath}`] = propertyValue;
    return await this.update(obj);
  }

  increaseMagepower(index){
    if( ! utils.canSeeParadox() ) { return; }
    const base1Index = index += 1;
    let {quintessence, paradox} = this.data.data.magepower;

    //adding quint and/or removing paradox
    if ( (20 - paradox) < base1Index ) { //paradox in the box, remove it
      paradox -= 1;
      this.safeUpdateProperty('magepower', {paradox});
    } else {//add a quint point (according to index)
      if ( quintessence < base1Index ) {
        quintessence += 1;
        this.safeUpdateProperty('magepower', {quintessence});
      }
    }
  }

  decreaseMagepower(index){
    if ( ! utils.canSeeParadox() ) { return; }
    const base1Index = index += 1;
    let {quintessence, paradox} = this.data.data.magepower;

    //adding paradox and/or removing quintessence
    if ( (quintessence) >= base1Index ) { //quint in the box, remove it
      quintessence -= 1;
      this.safeUpdateProperty('magepower', {quintessence});
    } else {//add a paradox point (according to index)
      if ( (20 - paradox) >= base1Index ) {
        paradox += 1;
        this.safeUpdateProperty('magepower', {paradox});
      }
    }
  }

  //health & willpower
  decreaseResource(resourceName, index) {
    const base1Index = index += 1; // cuz sometimes you're just too tired to think in base0
    let {max, value, lethal, aggravated} = this.data.data[resourceName];

    //decrease main value first(bashing), then lethal, then aggravated
    if ( (max - value) < base1Index ) {
      value -= 1;
      this.safeUpdateProperty(resourceName, {value});
    } else {
      if ( (max - lethal) < base1Index ) {
        lethal -= 1;
        this.safeUpdateProperty(resourceName, {lethal});
      } else {
        if ( (max - aggravated) < base1Index ) {
          aggravated -= 1;
          this.safeUpdateProperty(resourceName, {aggravated});
        }
      }
    }
  }

  //health & willpower
  increaseResource(resourceName, index) {
    const base1Index = index += 1;
    let {max, value, lethal, aggravated} = this.data.data[resourceName];

    //increase aggravated first, then lethal, then main value(bashing)
    if ( (max - aggravated) >= base1Index ) {
      aggravated += 1;
      this.safeUpdateProperty(resourceName, {aggravated});
    } else {
      if ( (max - lethal) >= base1Index ) {
        lethal += 1;
        this.safeUpdateProperty(resourceName, {lethal});
      } else {
        if ( (max - value) >= base1Index ) {
          value += 1;
          this.safeUpdateProperty(resourceName, {value});
        }
      }
    }
  }

  async modQuintessence(mod) {
    const {quintessence, paradox}  = this.data.data.magepower;
    let newValue = quintessence + parseInt(mod);
    if ( newValue < 0 ) { newValue = 0; }
    if ( newValue + paradox > 20 ) { newValue = 20 - paradox; }
    return this.safeUpdateProperty('magepower.quintessence', newValue);
  }

  async modParadox(mod) {
    const {quintessence, paradox}  = this.data.data.magepower;
    let newValue = paradox + parseInt(mod);
    if ( newValue < 0 ) { newValue = 0; }
    if ( newValue + quintessence > 20 ) { newValue = 20 - quintessence; }
    //TODO : maybe add whisp to GM on certain paradox values
    return this.safeUpdateProperty('magepower.paradox', newValue);
  }

/*  async addWound(amount, woundType = '', overhead = false) {
    const health = duplicate(this.data.data.health);
    woundType = woundType === '' ? 'value' : woundType;
    const current = foundry.utils.getProperty(health, woundType);
    //log(current);
    if ( amount > current ) {
      if  (overhead ){

      } else {
        return this._safeUpdateValue(`health.${woundType}`, 0);
      }
    }

  }*/



}
