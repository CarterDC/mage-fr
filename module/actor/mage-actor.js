// Import Documents
import M20eActor from './base-actor.js'

import DiceThrow from '../dice/dice-throw.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";

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

  /**
   * check whether dropped item can be 'safely' created on this actor
   * @param  {M20eItem} item item being dropped
   */
  isDropAllowed(item) {
    if ( !super.isDropAllowed(item) ) { return false; }
    const itemData = item.data;
    //check against spheres levels
    if ( itemData.type === 'rote' && !item._isActuallyRollable(this) ){
      ui.notifications.error(game.i18n.format('M20E.notifications.unrollableRote',
        {actorName:this.name, itemName: item.name}));
      return false;
    }
    return true;
  }

  getThrowFlavor(xTraitsToRoll=[]) {
    if ( DiceThrow.getIsEffectRoll(xTraitsToRoll) ) {
      //pure magical throw => arete roll + all spheres with value in the effect 
      const throwEffect = this.xTraitsToRoll.map(effect => 
        `${this.actor.locadigm(`spheres.${effect.key}`)} (${effect.value})`
        ).join(' + ');
      return `${this.actor.locadigm('diceThrows.areteThrow')} :<br>
        ${game.i18n.format('M20E.diceThrows.effect', {effect: throwEffect})}.`
    } else {
      return super.getThrowFlavor(xTraitsToRoll);
    }
  }

  getExtendedTraitData(trait) {
    const {category, key= ''} = trait;
    const relativePath = key ? `${category}.${key}` : `${category}`;
    const actorData = this.data;

    let value = 0;
    let specName = '';
    switch ( category ) {
      case 'willpower':
        value = parseInt(actorData.data.willpower.max);
        specName = ''
        break;
      case 'arete':
        value = parseInt(actorData.data.arete);
        specName = ''
        break;
      default:
        value = parseInt(foundry.utils.getProperty(actorData,`data.${relativePath}.value`)),
        specName = foundry.utils.getProperty(actorData,`data.${relativePath}.specialisation`)
    }
    return {
      name: game.i18n.localize(`M20E.${relativePath}`),
      displayName: this.getLexiconEntry(relativePath),
      value: value,
      specName: specName
    }
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
