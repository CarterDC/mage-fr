// Import Documents
import M20eActor from './m20e-actor.js'

import DiceThrower from '../dice-thrower.js'
import M20eThrow from '../throw.js'
// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";


/**
 * Implements M20eActor as an extension of the Actor class
 * adds system specific functions as well as some overrides
 * atm only used by the charMage actor-type.
 * @extends {Actor}
 */
export default class M20eMageActor extends M20eActor {

  /** @override */
  constructor(data, context) {
    super(data, context);
  }

  _prepareActorStats() {
    super._prepareActorStats();
    //prepare spheres stats
    this._prepareCategoryStats('spheres');
    this._prepareCategoryStats('magick');
  }

  /** @override */
  _prepareResources() {
    super._prepareResources();
    if( utils.canSeeParadox() ) {
      const actorData = this.data;
      //add dummy resource magepower in the form {value, max} to be used by token bars
      foundry.utils.setProperty(actorData.data,
        game.i18n.localize('M20E.resources.magepower'), {
        value: actorData.data.resources.magepower.quintessence,
        //max: 20 + actorData.data.resources.magepower.paradox
        max: actorData.data.resources.magepower.quintessence + actorData.data.resources.magepower.paradox
      });
    }
  }

  get isMage() {
    return true;
  }

  getThrowFlavor(xTraitsToRoll=[]) {
    if ( M20eThrow.isEffectThrow(xTraitsToRoll) ) {
      //pure magical throw => arete roll + all spheres with value in the effect 
      const throwEffect = xTraitsToRoll.map(effect => 
        `${effect.name} (${effect.value})`
        ).join(' + ');
      return `${this.locadigm('diceThrows.areteThrow')} :<br>
        ${game.i18n.format('M20E.diceThrows.effect', {effect: throwEffect})}.`
    } else {
      return super.getThrowFlavor(xTraitsToRoll);
    }
  }

  //todo : redo that shit ! and put it in the sheet ! should use modQuint and modPara
  increaseMagepower(index){
    if( ! utils.canSeeParadox() ) { return; }
    const base1Index = index + 1;
    let {quintessence, paradox} = this.data.data.resources['magepower'];

    //adding quint and/or removing paradox
    if ( (20 - paradox) < base1Index ) { //paradox in the box, remove it
      paradox -= 1;
      this.safeUpdateProperty('resources.magepower', {paradox});
    } else {//add a quint point (according to index)
      if ( quintessence < base1Index ) {
        quintessence += 1;
        this.safeUpdateProperty('resources.magepower', {quintessence});
      }
    }
  }

  decreaseMagepower(index){
    if ( ! utils.canSeeParadox() ) { return; }
    const base1Index = index + 1;
    let {quintessence, paradox} = this.data.data.resources['magepower'];

    //adding paradox and/or removing quintessence
    if ( (quintessence) >= base1Index ) { //quint in the box, remove it
      quintessence -= 1;
      this.safeUpdateProperty('resources.magepower', {quintessence});
    } else {//add a paradox point (according to index)
      if ( (20 - paradox) >= base1Index ) {
        paradox += 1;
        this.safeUpdateProperty('resources.magepower', {paradox});
      }
    }
  }

  async modQuintessence(mod) {
    let {quintessence, paradox}  = this.data.data.resources['magepower'];
    let newValue = quintessence + parseInt(mod);
    //player can't gain quintessence over paradox points
    quintessence = Math.clamped(newValue, 0, 20 - paradox);
    return this.safeUpdateProperty('resources.magepower', {quintessence});
  }

  async modParadox(mod) {
    let {quintessence, paradox}  = this.data.data.resources['magepower'];
    let newValue = paradox + parseInt(mod);
    //player can gain paradox over it's quintessence points
    paradox = Math.clamped(newValue, 0, 20);

    return this.safeUpdateProperty('resources.magepower', {paradox});
  }

}
