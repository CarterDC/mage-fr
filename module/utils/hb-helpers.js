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
    const lexiconValue = foundry.utils.getProperty(paraData.lexicon, concatStr) || null;
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

  Handlebars.registerHelper('m20e-disabled', function(locked) {
    return locked ? 'disabled' : '';
  })

  Handlebars.registerHelper("clickableBullet", function(availEffects, key) {
    if ( !availEffects ) { return; }
    const valueMax = availEffects.filter(effect => effect.key === key)[0].valueMax || 0;
    //index of 'this' is base 0
    return this < valueMax;
  })
  
  Handlebars.registerHelper("bulletState", function(value, index) {
    return (value > index) ? "active" : "";
  })

  Handlebars.registerHelper('in', function() {
    let entryToFind = arguments[0];
    for(let i = 1; i < arguments.length; i++){
      if(entryToFind === arguments[i]){return true;}
    }
    return false;
  })

  //not used anymore but kept for sentimental reasons
  /*Handlebars.registerHelper('res', function(resource, index) {
    if ( (resource.max - resource.aggravated) > index ) { return 3; }
    if ( (resource.max - resource.lethal) > index ) { return 2; }
    if ( (resource.max - resource.value) > index ) { return 1; }
    return 0;
  })

  Handlebars.registerHelper('magepower', function(magepower, index) {
    let returnValue = 0;
    if ( magepower.quintessence > index ) { return 1; }
    if ( utils.canSeeParadox() && (20 - magepower.paradox) <= index ) { return 2; }
    return returnValue;
  })*/

}