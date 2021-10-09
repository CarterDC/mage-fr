
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
   * todo put that somewhere else or not ?
   * Only non 0 mods
   */
   export function getModsTooltipData(mods, invert=false) {
    let data = [];
    for( const mod in mods) {
      const value = mods[mod];
      if ( value ) {
        data.push({
          name: safeLocalize(`M20E.throwMod.${mod}`, mod),
          class: (invert ? -1 * value : value) < 0 ? 'red-thingy' : 'green-thingy',
          value: (value > 0) ? `+${value}` : `${value}`
        });
      }
    }
    return data;
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
 * stolen from the internet !
 * @param {*} myVariable
 * 
 * @returns {boolean}  whether myVariable is a number or not
 */
export const isNumeric = myVariable =>
  !isNaN(parseFloat(myVariable)) && isFinite(myVariable);

/**
 * For use in array.sort()
 * implements a basic alpha sorting on the property passed in argument
 * @param {string} path optionnal
 * 
 * @returns {function} the actual sorting function with correct property
 */
export function alphaSort(path = 'name') {
  const lang = game.settings.get('core', 'language');
  return function(a, b) {
    const aKey = foundry.utils.getProperty(a, path);
    const bKey = foundry.utils.getProperty(b, path);
    //return ( aKey < bKey ) ? -1 : (( aKey > bKey ) ? 1 : 0);
    return aKey.localeCompare(bKey, lang, { sensitivity: 'base' });
  }
}

/**
 * regex replace to get rid of some characters in the string (to be used as a property name)
 * atm only replaces '.' and ' ' with '_'
 * todo : maybe add other symbols that could be an issue like brackets and such ?
 */
export function sanitize(myString) {
  return myString.replace(/[. +]/gi, '_').toLowerCase();
}

/**
 * Checks for the existence of a translation string in le localization
 * if no string is found (or localize returned the original path), then return according to override
 * 
 * @param  {String} completePath
 * @param  {Boolean|String} override =true
 * 
 * @returns localized string | '' | completePath | override
 */
export function safeLocalize(completePath, override = true) {
  let translation = game.i18n.localize(completePath);
  if ( typeof(translation) !== 'string' ) { translation = ''; }
  return translation !== completePath ? translation : 
    (!!override ? '' : ( override ? override : completePath ) )
}

/**
 * returns an Actor object from {actorId, sceneId, tokenId}
 * @param  {Object} data like from dropedData, macroData or speakerData
 * Note : speakerData has a different naming scheme ie : actor instead of actorId !!!
 * 
 * @return {M20eActor|null} a token actor or world actor, null if not found
 */
export function actorFromData(data) {
  const actorId = data.actorId || data.actor; 
  const sceneId = data.sceneId || data.scene;
  const tokenId = data.tokenId || data.token;
  
  let actor;
  if ( tokenId ) {
    //try and get actor from scene and tokenId
    const scene = game.scenes.get(sceneId);
    const tokenDoc = scene?.tokens.get( tokenId );
    actor = tokenDoc?.actor;
  }
  if ( !actor ) {
    //token method not fruitful, get actor from world actors
    actor = game.actors.get(actorId);
  }
  if ( !actor ) {
    //no success in getting the actor
    ui.notifications.error(game.i18n.format('M20E.notifications.actorNotFound', {
      actorRef: actorId || tokenId
    }));
    return null;
  }
  return actor;
}

/**
 * returns actor from user owned and selected token.
 * if no user selected token (or multiple) then return chosen actor from user config
 * @returns {M20eActor|null} 
 * TODO : check with no canvas mode !!!
 */
export function getUserActor() {
  let actor = null;
  //get tokens that are selected and owned by the user
  const selectedOwnedTokens = game.canvas?.tokens.controlled.filter( token => 
    token.actor && token.actor.isOwner) || [];
  
  switch ( selectedOwnedTokens.length ) {
    case 1:
      actor = selectedOwnedTokens[0].actor;
      break;
    case 0:
      actor = game.user.character;
      break;
    default:
      break;
  }
  if ( !actor ) {
    ui.notifications.warn(game.i18n.localize('M20E.notifications.noSingleTokenSelected'));
  }
  return actor;
}

/**
 * Whether current user can see/interract with his paradox points
 */
export function canSeeParadox() {
  return game.settings.get("mage-fr", "playersCanSeeParadoxPoints") || game.user.isGM;
}

/**
 * @returns {Boolean} Whether Dice So Nice module is actually present and active
 */
export function dsnActive() {
  const dsnModule = game.modules.get('dice-so-nice');
  return dsnModule ? dsnModule.active : false;
}

/**
 * @returns {Boolean} Whether 3D dice are actually avail to display for this user
 */
export function dsnUserActive() {
  return dsnActive() ? 
  game.settings.get('dice-so-nice','settings').enabled && 
  !!game.user.getFlag('dice-so-nice','appearance') :
  false;
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
  if ( (element.type === 'text' || element.type === 'number') && element.dataset.dtype === 'Number' ) {
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
  let content = promptData.promptContent;
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
 * Prompts the user for a choice from options in a DropDown List
 * @param {Object} promptData an object of the form {title:'',promptString:'', curValue:'', options:{value:'', name:''}}
 * 
 * @returns {Promise<String>|null} value of the selected option|null is escaped
 */
export async function promptSelect(promptData={}) {
  //prepare the select options
  const options = promptData.options.map((option) => {
    const selected = option.value === promptData.curValue ? 'selected' : '';
    return `<option value="${option.value}" ${selected}>${option.name}</option>`;
  }).join("/n");
  //prepare the content
  const content = `${promptData.promptString}<select>${options}</select>`;
  //prompt
  return Dialog.prompt({
    options: {classes: ['dialog', 'm20e']},
    title: promptData.title,
    content: content,
    rejectClose: false, //escaping or closing returns null (does not trigger an error)
    callback: (html) => { 
      const selectElem = html.find('select')[0];
      return selectElem.options[selectElem.selectedIndex].value }
  });
}

/**
 * helper class to be used by utils.prompts functions
 */
 export class PromptData {
  constructor(obj) {
    this.title = obj.title || null;
    this.name = obj.name || null;
    this.currentValue = obj.currentValue || '';
    this.placeHolder = obj.placeHolder || '';
    this._promptContent = obj.promptContent || null;
  }

  /**
   * retruns the actual _promptContent or generates a basic 'prompt new value' one.
   * @returns {String} 
   */
  get promptContent() {
    if ( this._promptContent ) {
      return this._promptContent;
    } else {
      if ( this.name ) {
        return game.i18n.format("M20E.prompts.newValue", {name : this.name});
      } else {
        return '';
      }
    }
  }
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
 * creates a new JE for a specific actor.
 * copy the actor's permissions onto the new journal
 * creates new folder if doesn't exist
 * todo : maybe create journal from flag ?
 * todo : create description template
 * 
 * @param {M20eActor} actor
 * @param {Object} options
 */
export async function createPersonnalJE(actor, options) {
  const folderName = game.i18n.localize('M20E.labels.personnalJEs');
  let folder = game.folders.find(folder => {
    return folder.name === folderName && folder.type === 'JournalEntry';
  });
  if ( !folder ) {
    folder = await Folder.create({name: folderName, type: 'JournalEntry'});
  }
  const perms = actor.data.permission;
  return await JournalEntry.create({
    name: actor.name,
    content: game.i18n.localize('M20E.blabla'),
    permission: perms,
    folder: folder.id
  }, options);
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
 */
const addDelimiter = (a, b) =>
  a ? `${a}.${b}` : b;

/**
 * TODO : recode from foundry's flattenObject utils/helper.mjs if possible
 * Recursive function that creates an array of {fullPath: value} pairs
 * given an object (with nested properties, obviously)
 * originaly from Matjaz on stackoverflow 
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

export function traitsToPaths(obj = {}, prevPath = '') {
  return Object.entries(obj)
    .reduce((acc, [key, value]) => 
      {
        let path = addDelimiter(prevPath, key);
        return value.value !== undefined ?
          acc.concat(path) :
          acc.concat(traitsToPaths(value, path))
      }, []);
}

export function registerHandlebarsHelpers() {

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
    return sanitize(myString);
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

  /*Handlebars.registerHelper('m20e-includes', function(path, stats) {
    return stats.filter( stat => stat.path === path).length > 0;
  })*/
}


/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * 
 * 'Partials' are actually partials referenced in other hbs files
 * 'Templates' are just used by renderTemplate and listed here for convenience
 * @return {Promise}
 */
export async function preloadHandlebarsTemplates() {
  return loadTemplates ([
    // Actor Sheet Partials
    "systems/mage-fr/templates/actor/parts/header-cat.hbs",
    "systems/mage-fr/templates/actor/parts/cat-banner.hbs",
    "systems/mage-fr/templates/actor/parts/attributes-cat.hbs",
    "systems/mage-fr/templates/actor/parts/abilities-cat.hbs",
    "systems/mage-fr/templates/actor/parts/magick-cat.hbs",
    "systems/mage-fr/templates/actor/parts/spheres-cat.hbs",
    "systems/mage-fr/templates/actor/parts/bio-cat.hbs",
    "systems/mage-fr/templates/actor/parts/bg-cat.hbs",
    "systems/mage-fr/templates/actor/parts/mf-cat.hbs",
    "systems/mage-fr/templates/actor/parts/rotes-cat.hbs",
    "systems/mage-fr/templates/actor/parts/xp-cat.hbs",
    "systems/mage-fr/templates/actor/parts/contacts-cat.hbs",
    "systems/mage-fr/templates/actor/parts/events-cat.hbs",
    "systems/mage-fr/templates/actor/parts/a-effects-cat.hbs",
    "systems/mage-fr/templates/actor/parts/gear-cat.hbs",
    "systems/mage-fr/templates/actor/parts/misc-gear-cat.hbs",
    // Item Sheet Partials
    "systems/mage-fr/templates/item/parts/header-block.hbs",
    "systems/mage-fr/templates/item/parts/nav-block.hbs",
    "systems/mage-fr/templates/item/parts/description-block.hbs",
    //default descriptions Template
    "systems/mage-fr/templates/chat/default-descriptions.hbs",
    // Chat Templates
    "systems/mage-fr/templates/chat/trait-card.hbs",
    "systems/mage-fr/templates/chat/trait-flavor.hbs"
  ]);
}
