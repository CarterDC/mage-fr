export async function preloadHandlebarsTemplates() {
  const templatesPaths = [
    "systems/mage-fr/templates/actor/actor-sheet.hbs",
    "systems/mage-fr/templates/actor/parts/cat-banner.hbs",
    "systems/mage-fr/templates/actor/parts/attributes-cat.hbs",
    "systems/mage-fr/templates/actor/parts/header-cat.hbs",
    "systems/mage-fr/templates/item/paradigm-sheet.hbs"
  ];
  return loadTemplates(templatesPaths);
}

const consoleTrace = args => {
  console.groupCollapsed(`%cM20E | %c`, "color: royalblue; font-weight: bold;", "color: #ccc; font-weight: normal;", args);
  console.trace();
  console.groupEnd();
}

export const consoleLog = args =>
console.log(`%cM20E | %c`, "color: royalblue; font-weight: bold;", "color: #ccc; font-weight: normal;", args);

export function log(args){
  return consoleTrace(args);
}

export function canSeeParadox(){
  return game.settings.get("m20e", "playersCanSeeParadoxPoints") || game.user.isGM;
}

export function isValidUpdate(element){
  let isValid = true;
  if( element.type === 'text' && element.dataset.dtype === 'Number'){
    if(isNaN(element.value) || element.value === ''){
      ui.notifications.error(`'${element.value}' is not a Number !`);
      isValid = false;
    } else {
      const newNumber = Number(element.value);
      //todo: not assume that there's always a min & max value ^^
      const min = Number(element.min);
      const max = Number(element.max);
      if((newNumber < min) || (newNumber > max)){
        ui.notifications.error(`'${newNumber}' is out of bounds (${min} - ${max}) !`);
        isValid = false;
      }
    }
  }
  return isValid;
}

const isObject = myVariable =>
  myVariable && typeof myVariable === 'object' && !Array.isArray(myVariable);

const addDelimiter = (a, b) =>
  a ? `${a}.${b}` : b;

export function propertiesToArray(obj = {}, prevPath = ''){
  return Object.entries(obj)
    .reduce((acc, [key, value]) => 
      {
        let path = addDelimiter(prevPath, key);
        return isObject(value) ?
          acc.concat(propertiesToArray(value, path))
         : acc.concat({path : path, value: value})
      }, []);
}

export function RegisterHandlebarsHelpers(){

  //github.com/adg29/concat.js
  Handlebars.registerHelper('concat', function () {
    let outStr = ''
    for (const arg in arguments) {
      if (typeof arguments[arg] !== 'object') {
        outStr += arguments[arg]
      }
    }
    return outStr
  });

  Handlebars.registerHelper('locadigm', function () {
    let concatStr = '';
    for(let i = 1; i< arguments.length -1; i++){
      if(typeof arguments[i] !== 'object'){
        concatStr += arguments[i]
      }
    }
    const paraData = arguments[0];
    try {
      const lexiconValue = getProperty(paraData.lexicon, concatStr);
      if(!lexiconValue) throw '';
      return lexiconValue;
    } catch (e) {
      return game.i18n.localize(`M20E.${concatStr}`);
    }
  });

  Handlebars.registerHelper('isEven', function (index) {
    return ((index % 2) === 1);
  });

  Handlebars.registerHelper('sign', function (num, options) {
    if((options === "-") && (num>0)){
      return "-" + num;
    }
    return (num>0 ? "+" + num : num)
  });

  Handlebars.registerHelper('forLoop', function (n, content) {
    let result = ''
    for (let i = 0; i < n; i++) {
      result += content.fn(i)
    }
    return result
  });
  
  Handlebars.registerHelper("bulletState", function(value, index) {
    return (value > index) ? "active" : "";
  });

  Handlebars.registerHelper("clickableBullet", function(list, key, index) {
    if(!list){return;}
    //indexes are base 0
    return index < list[key].valueMax;
  });

  Handlebars.registerHelper('in', function () {
    let entryToFind = arguments[0];
    for(let i = 1; i < arguments.length; i++){
      if(entryToFind === arguments[i]){return true;}
    }
    return false;
  });

  Handlebars.registerHelper("inc", function(value, increment = 1)
  {
    return parseInt(value) + parseInt(increment);
  });

  //
  Handlebars.registerHelper('res', function (resource, index) {
    if((resource.max - resource.aggravated) > index){ return 3;}
    if((resource.max - resource.lethal) > index){ return 2;}
    if((resource.max - resource.value) > index){ return 1;}
    return 0;
  });

  //todo : refaire ça aussi avec juste 2 params
  Handlebars.registerHelper('magepower', function (magepower, index) {
    let returnValue = 0;
    if(magepower.quintessence > index) return 1;
    if(canSeeParadox() && (20 - magepower.paradox) <= index) return 2;
    return returnValue;
  });

  Handlebars.registerHelper('rollModeIcon', function (result) {
    let rollModeIcon = "";
    switch(game.settings.get("core", "rollMode")){
      case "gmroll":
        rollModeIcon = "fas fa-user-friends";
        break;
      case "blindroll":
        rollModeIcon = "fas fa-eye-slash";
        break;
      case "selfroll":
        rollModeIcon = "fas fa-user";
        break;
      default:
        rollModeIcon = "fas fa-users";
    }
    return rollModeIcon;
  });

  Handlebars.registerHelper('throwresult', function (result) {
    if(result == "?") return "?";
    if(result == "0") return game.i18n.localize('MAGE.throwresult.failure') + " !";
    if(result > 0) return result + " " + game.i18n.localize('MAGE.throwresult.success') + " !";
    return game.i18n.localize('MAGE.throwresult.critfailure') + " (" + result + ") !";
  });


}