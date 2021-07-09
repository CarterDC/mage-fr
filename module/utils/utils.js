import { Trait, PromptData } from "./classes.js";

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
 * is not a primitive and is not an array-type object
 * @param {*} myVariable
 * 
 * @returns {boolean}  whether myVariable is an object or not
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

/**
 * For use in array.sort()
 * implements a basic alpha sorting on the property passed in argument
 * @param {string} key optionnal
 * 
 * @returns {function} the actual sorting function with correct property
 */
export function alphaSort(key = 'name') {
  return function(a, b) {
    const aKey = a[key].toUpperCase();
    const bKey = b[key].toUpperCase();
    return ( aKey < bKey ) ? -1 : (( aKey > bKey ) ? 1 : 0);
  }
}

/**
 * Whether current user can see/interract with his paradox points
 */
export function canSeeParadox() {
  return game.settings.get("mage-fr", "playersCanSeeParadoxPoints") || game.user.isGM;
}

/**
 * upon update event (mostly from _onChangeInput) 
 * validate planned update against d-type and min/max values if number.
 * @param {object} element the html element that triggered the update event
 * 
 * @returns {boolean}  Whether it's deemed valid or not
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

/**
 * renders a Dialog.prompt tailored to the promptData passed in argument.
 * The lone input is tagged with d-type (and min/max if needed) to be used by isValidUpdate()
 * @param {PromptData} promptData
 * 
 * @returns {object} the HTML input element or null if prompt was closed/escaped
*/
export async function promptNewValue(promptData) {
  const {currentValue, min = '', max = ''} = promptData;
  let dtype = 'String';
  let minmax = '';
  if ( isNumeric(currentValue) ) {
    dtype = 'Number';
    minmax += min !== '' ? ` min="${promptData.min}"` : '';
    minmax += max !== '' ? ` max="${promptData.max}"` : '';
  }
  
  //configure the prompt message and add the input element
  let content = promptData.promptContent
  content += `<input type='text' value='${currentValue}'
    data-dtype='${dtype}'
    placeholder='${promptData.placeHolder}'
    ${minmax}/>`;

  return await Dialog.prompt({
    options: {classes: ['dialog', 'm20e']},
    title: promptData.title,
    content: content,
    rejectClose: false, // escaping or closing returns null (does not trigger an error)
    callback: (html) => { return html.find('input')[0]; }
  })
}

/**
 * gets a systemDescription given the category and name (key) of a trait/item.
 * checks for a compendium given the category
 * check for the journal entry given the key and returns its content
 * otherwise get a default description from getDefaultDescription()
 * @param {string} category can also be a subtype in some cases (talents, skills etc..)
 * @param {string} key the specific name of the journal entry
 * 
 * @returns {string} the resquested description (most usually containing html)
 */
export async function getSystemDescription(category, key) {
  //get the compendium module 'name' from the settings
  const scope = game.settings.get("mage-fr", "compendiumScope");
  const packName = `${scope}.${category}-desc`;
  const pack = game.packs.get(packName);
  try {
    //get the systemDescription from Journal Entry compendium if any
    const index = pack.index.getName(key);
    const packItem = await pack.getDocument(index._id);
    return packItem.data.content;
  } catch (e) {
    //otherwise get a generic description for that category
    return await getDefaultDescription(category);
  }
}

/**
 * Returns a rendered Template populated with localized info given the category of a trait/item.
 * 
 * @param {string} category can also be a subtype in some cases (talents, skills etc..)
 * 
 * @returns {string} the resquested systemDescription
 */
export async function getDefaultDescription(category) {
  const descTemplate = "systems/mage-fr/templates/chat/default-descriptions.hbs";
  //check whether there's an entry for that category, otherwise use 'default'
  const path = game.i18n.has(`M20E.defaultDescriptions.${category}`) ?
    `M20E.defaultDescriptions.${category}` :
    `M20E.defaultDescriptions.default`;
  //grab the whole node and let handlebars deal with each field 
  const fullDescription = game.i18n.localize(path);
  return await renderTemplate(descTemplate, fullDescription);
}

/**
 * Returns a document from a compendium given packName and documentName
 * might not even be used anymore
 * 
 * @param {string} packName a full packname also containing the pack scope
 * @param {string} documentName the name of the requested document inside the compendium
 * 
 * @returns {document} the resquested document
 */
export async function getCompendiumDocumentByName(packName, documentName) {
  const pack = game.packs.get(packName);
  if ( !pack ) {
    ui.notifications.error(game.i18n.format("M20E.notifications.packNotFound", { packName: packName }));
    return Promise.reject();
  }
  const index = pack.index.getName(documentName);
  if ( !index ) {
    ui.notifications.error(game.i18n.format("M20E.notifications.itemNotFoundInCompendium", { packName: packName, documentName: documentName }));
    return Promise.reject();
  }
  return await pack.getDocument(index._id);
}

/**
 * concatenates an object property chain by inserting a '.'
 * used only by propertiesToArray
 */
const addDelimiter = (a, b) =>
  a ? `${a}.${b}` : b;

/**
 * Recursive function that creates an array of {fullPath: value} pairs
 * given an object (with nested properties, obviously)
 * found on the internet and tweaked moderately
 * 
 * @param {object} obj the object to 'deconstruct'
 * @param {string} prevPath used by the recursion to dive deeper into the object
 * 
 * @returns {array} an array of {fullPath: value} pairs
 */
export function propertiesToArray(obj = {}, prevPath = '') {
  return Object.entries(obj)
    .reduce((acc, [key, value]) => 
      {
        let path = addDelimiter(prevPath, key);
        return isObject(value) ?
          acc.concat(propertiesToArray(value, path))
         : acc.concat({path : path, value: value})
      }, []);
}

