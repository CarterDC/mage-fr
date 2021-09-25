// Import Documents
import M20eActor from './m20e-actor.js'

import DiceThrow from '../dice/dice-throw.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";


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

    const actorData = this.data;
    for( const key in actorData.data.spheres ) {
      const path = `spheres.${key}`;
      //add entry to actor's stats with path and statData
      foundry.utils.setProperty(actorData.stats, path, {
        value: actorData.data.spheres[key].value
      });
      //also add entry to CONFIG with item's path and name, if necessary
      if ( !foundry.utils.hasProperty(CONFIG.M20E.stats, path) ) {
        foundry.utils.setProperty(CONFIG.M20E.stats, path, game.i18n.localize(`M20E.${path}`));
      }
    }
    //todo : add arete value (and resonance maybe ?)
  }

  /** @override */
  prepareResources() {
    super.prepareResources();
    if( utils.canSeeParadox() ) {
      const actorData = this.data;
      //add dummy resource magepower in the form {value, max} to be used by token bars
      actorData.data.magepower = {
        value: actorData.data.resources.magepower.quintessence,
        max: actorData.data.resources.magepower.quintessence + actorData.data.resources.magepower.paradox
      }
    }
  }

  get isMage() {
    return true;
  }

  getThrowFlavor(xTraitsToRoll=[]) {
    if ( DiceThrow.getIsEffectRoll(xTraitsToRoll) ) {
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

  //todo : redo that shit !
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

  
/*
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
  }*/

}
