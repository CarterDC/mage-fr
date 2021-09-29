// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";

export const registerHandlebarsHelpers = function() {

  /**
   * usage {{#m20e-forLoop nbIterr}}<p>Iterration n°{{this}}</p>{{/m20e-forLoop}}
   */
  Handlebars.registerHelper('m20e-forLoop', function(nbIterr, loopInner) {
    return [...Array(nbIterr)].reduce((acc, cur, index) => (acc + loopInner.fn(index)), "");
  })

  //github.com/adg29/concat.js
  Handlebars.registerHelper('m20e-concat', function() {
    let outStr = '';
    for ( const arg in arguments ) {
      if ( typeof arguments[arg] !== 'object' ) {
        outStr += arguments[arg];
      }
    }
    return outStr;
  })

  /**
   */
   Handlebars.registerHelper('m20e-sanitize', function(myString) {
    return utils.sanitize(myString);
  })

  /**
   */
  Handlebars.registerHelper('m20e-not', function(bool) {
    return !bool;
  })

 /**
 * Returns the paradigmic translation of the arguments
 * works like a localize(concat()) but substitutes the lexicon value if any
 * @param {object} arguments   First argument must be the paradigm data object
 */
  Handlebars.registerHelper('m20e-locadigm', function() {
    let concatStr = '';
    for(let i = 1; i< arguments.length -1; i++){
      if(typeof arguments[i] !== 'object'){
        concatStr += arguments[i]
      }
    }
    const paraData = arguments[0];
    const lexiconValue = foundry.utils.getProperty(paraData?.lexicon, concatStr) || null;
    return lexiconValue || game.i18n.localize(`M20E.${concatStr}`);
  })

 /**
 * Adds a '+' sign in front of a non negative value (no need for negative ones, obviously)
 * @param {Number} num the number to be concatenated
 * @param {Optional} forcePrefix forces a prefix before a non negative value
 */
  Handlebars.registerHelper('m20e-sign', function(num) {
    if ( num < 0 ) { return num; }
    const forcePrefix = arguments[arguments.length - 2];
    return forcePrefix !== num ? `${forcePrefix}${num}` : `+${num}`;
  })

  Handlebars.registerHelper('m20e-disabled', function(isDisabled) {
    return isDisabled ? 'disabled' : '';
  })

  Handlebars.registerHelper('m20e-enabled', function(isEnabled) {
    return isEnabled ? '' : 'disabled';
  })

  Handlebars.registerHelper("m20e-clickableBullet", function(availEffects, key) {
    if ( !availEffects ) { return; }
    const valueMax = availEffects.filter(effect => effect.key === key)[0].valueMax || 0;
    //index of 'this' is base 0
    return this < valueMax;
  })

 /**
 * returns a html string that displays 'nbIterr' bullets computed from 'trait' parameter
 * takes into account if trait has been overriden by ActiveEffect to adjust data-state
 * also adds a overflow in the dataset for values that are greater than nbIterr
 */
  Handlebars.registerHelper("m20e-bulletDisplay", function(trait, nbIterr) {
    let returnString = '';
    const currValue = foundry.utils.hasProperty(trait, '_overrideValue') ? trait._overrideValue : trait.value;
    const origValue = foundry.utils.hasProperty(trait, '_sourceValue') ? trait._sourceValue : trait.value;
    const min = Math.min(currValue, origValue);
    const max = Math.max(currValue, origValue);
    for (let index = 0; index < nbIterr; index++) {
      let state = '';
      const overflow = currValue > index + nbIterr;
      if ( index < min ) {
        state = 'active';
      } else if ( index < max ) {
        state = ( currValue > origValue ? 'upgraded': 'downgraded');
      }
      returnString += `<span class="bullet" data-index="${index}" data-state="${state}" data-overflow="${overflow}"></span>`;
    }
    return returnString;
  })

  Handlebars.registerHelper("m20e-bulletState", function(currValue, index) {
    return (currValue > index) ? "active" : "";
  })

  Handlebars.registerHelper('m20e-in', function() {
    let entryToFind = arguments[0];
    for(let i = 1; i < arguments.length; i++){
      if(entryToFind === arguments[i]){return true;}
    }
    return false;
  })

}