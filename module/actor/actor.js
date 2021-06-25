import * as utils from '../utils.js'
import {log} from '../utils.js'

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
 export default class M20eActor extends Actor {

  /** @override */
  constructor(...args) {
    //might need to do stuff in here
    super(...args);
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

  /*updateMagePower(){
    let magePower = actorData.data.magepower;
    magePower.max = magePower.quintessence + magePower.paradox;
    magePower.value = magePower.quintessence;
  }*/

  /** Reevaluates secondary health stats 'status' and 'malus'
   * according to health values and the list of maluses
   * 
   */
  _updateHealthStats() {
    let health = this.data.data.health;
    //prepare an array of negative integers from the comma separated string
    const maluses = health.malusList.split(',').map(v => (-1 * parseInt(v)));
    const wounds = health.max - health.value;

    health.status = game.i18n.localize(`M20E.healthStatus.${wounds}`);
    if (wounds > 0) {
      health.malus = maluses[wounds - 1];
    } else {
      health.malus = 0;
    }
  }

  async _updateSingleValue(relativePath, newValue){
    //beware of floats !
    const entryValue = (isNaN(newValue) ? newValue: parseInt(newValue) );
    let obj = {};
    obj[`data.${relativePath}`] = entryValue;
    return await this.update(obj);
  }

  async _updateResource(resourceName, resource) {
    let obj = {};
    obj[`data.${resourceName}`] = resource;
    await this.update(obj);
  }

  _increaseMagepower(index){
    if( ! utils.canSeeParadox() ) return;
    const base1Index = index += 1;
    let {quintessence, paradox} = this.data.data.magepower;

    //adding quint and/or removing paradox
    if ((20 - paradox) < base1Index) { //paradox in the box, remove it
      paradox -= 1;
      this._updateResource('magepower', {paradox});
    } else {//add a quint point (according to index)
      if (quintessence < base1Index) {
        quintessence += 1;
        this._updateResource('magepower', {quintessence});
      }
    }
  }

  _decreaseMagepower(index){
    if( ! utils.canSeeParadox() ) return;
    const base1Index = index += 1;
    let {quintessence, paradox} = this.data.data.magepower;

    //adding paradox and/or removing quintessence
    if ((quintessence) >= base1Index) { //quint in the box, remove it
      quintessence -= 1;
      this._updateResource('magepower', {quintessence});
    } else {//add a paradox point (according to index)
      if ((20 - paradox) >= base1Index) {
        paradox += 1;
        this._updateResource('magepower', {paradox});
      }
    }
  }

  //health & willpower
  _decreaseResource(resourceName, index) {
    const base1Index = index += 1; // cuz sometimes you're just too tired to think in base0
    let {max, value, lethal, aggravated} = this.data.data[resourceName];

    //decrease main value first(bashing), then lethal, then aggravated
    if ((max - value) < base1Index) {
      value -= 1;
      this._updateResource(resourceName, {value});
    } else {
      if ((max - lethal) < base1Index) {
        lethal -= 1;
        this._updateResource(resourceName, {lethal});
      } else {
        if ((max - aggravated) < base1Index) {
          aggravated -= 1;
          this._updateResource(resourceName, {aggravated});
        }
      }
    }
  }

  //health & willpower
  _increaseResource(resourceName, index) {
    const base1Index = index += 1;
    let {max, value, lethal, aggravated} = this.data.data[resourceName];

    //increase aggravated first, then lethal, then main value(bashing)
    if ((max - aggravated) >= base1Index) {
      aggravated += 1;
      this._updateResource(resourceName, {aggravated});
    } else {
      if ((max - lethal) >= base1Index) {
        lethal += 1;
        this._updateResource(resourceName, {lethal});
      } else {
        if ((max - value) >= base1Index) {
          value += 1;
          this._updateResource(resourceName, {value});
        }
      }
    }
  }

  async modQuintessence(mod){
    const {quintessence, paradox}  = this.data.data.magepower;
    let newValue = quintessence + parseInt(mod);
    if( newValue < 0 ) newValue = 0;
    if( newValue + paradox > 20 ) newValue = 20 - paradox;
    return this._updateSingleValue('magepower.quintessence', newValue);
  }

  async modParadox(mod){
    const {quintessence, paradox}  = this.data.data.magepower;
    let newValue = paradox + parseInt(mod);
    if( newValue < 0 ) newValue = 0;
    if( newValue + quintessence > 20 ) newValue = 20 - quintessence;
    //TODO : add whisp to GM on certain paradox values
    return this._updateSingleValue('magepower.paradox', newValue);
  }

/*  async addWound(amount, woundType = '', overhead = false){
    const health = duplicate(this.data.data.health);
    woundType = woundType === '' ? 'value' : woundType;
    const current = getProperty(health, woundType);
    //log(current);
    if(amount > current){
      if(overhead){

      } else {
        return this._updateSingleValue(`health.${woundType}`, 0);
      }
    }

  }*/



}
