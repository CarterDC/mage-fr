export async function preloadHandlebarsTemplates() {
  const templatesPaths = [
    "systems/mage-fr/templates/actor/actor-sheet.hbs",
    "systems/mage-fr/templates/actor/cat-banner.hbs",
    "systems/mage-fr/templates/actor/attributes-cat.hbs",
    "systems/mage-fr/templates/actor/header-cat.hbs"
  ];
  return loadTemplates(templatesPaths);
}

export function log(args){
  console.log(`%cM20E | %c`, "color: royalblue; font-weight: bold;", "color: #ccc; font-weight: normal;", args)
}

export function _isValidUpdate(element){
  let isValid = true;
  if( element.type === 'text' && element.dataset.dtype === 'Number'){
    if(isNaN(element.value) || element.value === ''){
      ui.notifications.error(`'${element.value}' is not a Number !`);
      isValid = false;
    } else {
      const newNumber = Number(element.value);
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
  })

  Handlebars.registerHelper('isEven', function (index) {
    return ((index % 2) === 1);
  })

  Handlebars.registerHelper('sign', function (num, options) {
    if((options === "-") && (num>0)){
      return "-" + num;
    }
    return (num>0 ? "+" + num : num)
  })

  Handlebars.registerHelper('forLoop', function (n, content) {
    let result = ''
    for (let i = 0; i < n; i++) {
      result += content.fn(i)
    }
    return result
  })
  
  Handlebars.registerHelper("clickableBullet", function(list, key, index) {
    if(!list){return;}
    //indexes are base 0
    return index < list[key].valueMax;
  })

  Handlebars.registerHelper('in', function () {
    let entryToFind = arguments[0];
    for(let i = 1; i < arguments.length; i++){
      if(entryToFind === arguments[i]){return true;}
    }
    return false;
  })

  Handlebars.registerHelper("inc", function(value, increment = 1)
  {
    return parseInt(value) + parseInt(increment);
  })

  //
  Handlebars.registerHelper('rez', function (index, health) {
    if((health.max - health.aggravated) > index){ return 3;}
    if((health.max - health.lethal) > index){ return 2;}
    if((health.max - health.value) > index){ return 1;}
    return 0;
  })

  Handlebars.registerHelper('magepower', function (index, quint, para) {
    let returnValue = 0;
    if(quint > index) return 1;
    if(canSeeParadox() && (20 - para) <= index) return 2;
    return returnValue;
  })

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
  })

  Handlebars.registerHelper('throwresult', function (result) {
    if(result == "?") return "?";
    if(result == "0") return game.i18n.localize('MAGE.throwresult.failure') + " !";
    if(result > 0) return result + " " + game.i18n.localize('MAGE.throwresult.success') + " !";
    return game.i18n.localize('MAGE.throwresult.critfailure') + " (" + result + ") !";
  })


}