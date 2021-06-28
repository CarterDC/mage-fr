export async function preloadHandlebarsTemplates() {
  const templatesPaths = [
    "systems/mage-fr/templates/actor/parts/header-cat.hbs",
    "systems/mage-fr/templates/actor/parts/cat-banner.hbs",
    "systems/mage-fr/templates/actor/parts/attributes-cat.hbs",
    "systems/mage-fr/templates/actor/parts/abilities-cat.hbs",
    "systems/mage-fr/templates/actor/parts/spheres-cat.hbs",
    "systems/mage-fr/templates/item/parts/header-block.hbs",
    "systems/mage-fr/templates/item/parts/nav-block.hbs",
    "systems/mage-fr/templates/item/parts/description-block.hbs"
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

export function log(args) {
  return consoleTrace(args);
}
export function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export function canSeeParadox() {
  return game.settings.get("m20e", "playersCanSeeParadoxPoints") || game.user.isGM;
}

export function isValidUpdate(element) {
  if ( element === null ) { return false; }
  let isValid = true;
  if ( element.type === 'text' && element.dataset.dtype === 'Number' ) {
    if ( isNaN( element.value ) || element.value === '') {
      ui.notifications.error(game.i18n.format("M20E.notifications.nan", {value: element.value}));
      isValid = false;
    } else {
      const newNumber = Number( element.value );
      //todo: not assume that there's always a min & max value ^^
      const min = Number(element.min);
      const max = Number(element.max);
      if ( (newNumber < min) || (newNumber > max) ) {
        ui.notifications.error(game.i18n.format("M20E.notifications.outtaBounds",
          {
            value: newNumber,
            min: min,
            max: max
        }));
        isValid = false;
      }
    }
  }
  return isValid;
}

export async function promptNewValue(promptData) {
  const {title, name, currentValue, min = '', max = ''} = promptData;
  log({title, name, currentValue, min, max});
  let dtype = 'String';
  let minmax = '';
  if ( isNumeric(currentValue) ) {
    dtype = 'Number';
    minmax += min !== '' ? ` min="${promptData.min}"` : '';
    minmax += max !== '' ? ` max="${promptData.max}"` : '';
  }
  const content =  `${game.i18n.format("M20E.prompts.newValue", {name : name})}  
    <input type='text' value='${currentValue}' data-dtype='${dtype}' ${minmax}/>`;

  return await Dialog.prompt({
    options: {classes: ['dialog', 'm20e']},
    title: title,
    content: content,
    rejectClose: false,
    callback: (html) => { return html.find('input')[0]; }
  })

  /*
  // newValue can either be a Number (max values) or a String in the case of malusList
  if ( newValue === null || newValue === '' ) { return; }
  if ( newValue !== promptData.currentValue ) {
    //TODO !!!: check for nan against type of current value (easier ^^)
    if ( ! isNaN(newValue) ) {
      newValue = parseInt(newValue);
      //validate against min and max (0 -10)
      if ( newValue < 0 || 10 < newValue ) {
        ui.notifications.error(game.i18n.format("M20E.notifications.outtaBounds",
        {
          value: newValue,
          min: 0,
          max: 10
        }));
        return;
      }
    }
  }*/

}

export async function getCompendiumDocumentByName(packName, documentName) {
  const pack = game.packs.get( packName );
  if ( !pack ) {
    ui.notifications.error( `MAGE | ${packName} pack not found !` );
    return Promise.reject();
  }
  const indexEntry = pack.index.find(entry => entry.name === documentName);
  if ( !indexEntry ) {
    ui.notifications.error( `MAGE | ${documentName} not found in pack ${packName} !` );
    return Promise.reject();
  }
  return await pack.getDocument(indexEntry._id);
}

const isObject = myVariable =>
  myVariable && typeof myVariable === 'object' && !Array.isArray(myVariable);

const addDelimiter = (a, b) =>
  a ? `${a}.${b}` : b;

export function propertiesToArray(obj = {}, prevPath = '') {
  return Object.entries( obj )
    .reduce((acc, [key, value]) => 
      {
        let path = addDelimiter(prevPath, key);
        return isObject(value) ?
          acc.concat(propertiesToArray(value, path))
         : acc.concat({path : path, value: value})
      }, []);
}

export function RegisterHandlebarsHelpers() {

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

  //
  Handlebars.registerHelper('res', function (resource, index) {
    if((resource.max - resource.aggravated) > index){ return 3;}
    if((resource.max - resource.lethal) > index){ return 2;}
    if((resource.max - resource.value) > index){ return 1;}
    return 0;
  });

  Handlebars.registerHelper('magepower', function (magepower, index) {
    let returnValue = 0;
    if(magepower.quintessence > index) return 1;
    if(canSeeParadox() && (20 - magepower.paradox) <= index) return 2;
    return returnValue;
  });

}