// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";

export const registerHandlebarsHelpers = function() {

  Handlebars.registerHelper('forLoop', function(nbIterr, loopInner) {
    let loopTotal = '';
    for ( let i = 0; i < nbIterr; i++ ) {
      loopTotal += loopInner.fn(i);
    }
    return loopTotal;
  })

  //github.com/adg29/concat.js
  Handlebars.registerHelper('concat', function() {
    let outStr = '';
    for ( const arg in arguments ) {
      if ( typeof arguments[arg] !== 'object' ) {
        outStr += arguments[arg];
      }
    }
    return outStr;
  })

 /**
 * Returns the paradigmic translation of the arguments
 * works like a localize(concat()) but substitutes the lexicon value if any
 * @param {object} arguments   First argument must be the paradigm data object
 */
  Handlebars.registerHelper('locadigm', function() {
    let concatStr = '';
    for(let i = 1; i< arguments.length -1; i++){
      if(typeof arguments[i] !== 'object'){
        concatStr += arguments[i]
      }
    }
    const paraData = arguments[0];
    try { //TODO : redo without try catch (hasProperty ?)
      const lexiconValue = foundry.utils.getProperty(paraData.lexicon, concatStr);
      if(!lexiconValue) throw '';
      return lexiconValue;
    } catch (e) {
      return game.i18n.localize(`M20E.${concatStr}`);
    }
  })

 /**
 * Adds a '+' sign in from of a positive value (no need for negative ones, obviously)
 * @param {Number} num the number to be concatenated
 * @param {Optional} forcePrefix forces a prefix before a positive value
 */
  Handlebars.registerHelper('sign', function(num) {
    if ( num < 0 ) { return num; }
    const forcePrefix = arguments[arguments.length - 2];
    return forcePrefix !== num ? `${forcePrefix}${num}` : `+${num}`;
  })

  Handlebars.registerHelper('disabled', function(locked) {
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

  Handlebars.registerHelper('throwresult', function (result) {
    //todo : upgrade with format or `${}`
    if ( result == "?" ) { return "?"; }
    if ( result == "0" ) { return game.i18n.localize('M20E.throwresult.failure') + " !"; }
    if ( result > 0 ) { return result + " " + game.i18n.localize('M20E.throwresult.success') + " !"; }
    return game.i18n.localize('M20E.throwresult.critfailure') + " (" + result + ") !";
  })

  Handlebars.registerHelper('in', function() {
    let entryToFind = arguments[0];
    for(let i = 1; i < arguments.length; i++){
      if(entryToFind === arguments[i]){return true;}
    }
    return false;
  })

  //
  Handlebars.registerHelper('res', function(resource, index) {
    if ( (resource.max - resource.aggravated) > index ) { return 3; }
    if ( (resource.max - resource.lethal) > index ) { return 2; }
    if ( (resource.max - resource.value) > index ) { return 1; }
    return 0;
  })

  //not used anymore
  /*Handlebars.registerHelper('magepower', function(magepower, index) {
    let returnValue = 0;
    if ( magepower.quintessence > index ) { return 1; }
    if ( utils.canSeeParadox() && (20 - magepower.paradox) <= index ) { return 2; }
    return returnValue;
  })*/

  Handlebars.registerHelper('magepowerBox', function(magepower, index) {
    const templateData = {
      canSeeParadox: utils.canSeeParadox(),
      dataState: 0,
      title: ""
    };
    //get the state value (for css rules)
    if ( magepower.quintessence > index ) {
      templateData.dataState = 1;
    } else if ( templateData.canSeeParadox && (20 - magepower.paradox) <= index ) {
      templateData.dataState = 2;
    }
    //get the title
    if ( templateData.canSeeParadox ) {
      //box will be clickable => get a title according to state
      templateData.title = game.i18n.localize(`M20E.hints.magepower.${templateData.dataState}`);
    }
    const template = `<div class="box"
      data-clickable = "${templateData.canSeeParadox}" 
      data-index="${index}" 
      data-state="${templateData.dataState}" 
      title="${templateData.title}"
      ></div>`
    return new Handlebars.SafeString(template);
  })

}