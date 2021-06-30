
//loging & tracing
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


/**
 * Whether the passed variable is actually instanciated,
 * is not a primitive and is not an array type object
 * @param {*} myVariable
 * 
 * @returns {boolean}  whetter myVariable is an object or not
 */
export const isObject = myVariable =>
  myVariable && typeof myVariable === 'object' && !Array.isArray(myVariable);

/**
 * Whether the passed variable is actually a number
 * ( parsing it into a float does not return NaN )
 * @param {*} myVariable
 * 
 * @returns {boolean}  whether myVariable is a number or not
 */
export const isNumeric = myVariable =>
  !isNaN(parseFloat(myVariable));


export function alphaSort(key = 'name') {
  return function(a, b) {
    const aKey = a[key].toUpperCase();
    const bKey = b[key].toUpperCase();
    return ( aKey < bKey ) ? -1 : (( aKey > bKey ) ? 1 : 0);
  }
}

export function canSeeParadox() {
  return game.settings.get("m20e", "playersCanSeeParadoxPoints") || game.user.isGM;
}

/**
 * @param  {} element
 */
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
}

export async function getCompendiumDocumentByName(packName, documentName) {
  /* const pack = game.packs.get(compendiumName);
const index = pack.index.getName(itemName);
const item = await pack.getDocument(index._id);
return game.items.fromCompendium(item);*/

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

const addDelimiter = (a, b) =>
  a ? `${a}.${b}` : b;

export function propertiesToArray(obj = {}, prevPath = '') {
  //found on the internet and tweaked a bit
  return Object.entries( obj )
    .reduce((acc, [key, value]) => 
      {
        let path = addDelimiter(prevPath, key);
        return isObject(value) ?
          acc.concat(propertiesToArray(value, path))
         : acc.concat({path : path, value: value})
      }, []);
}

