// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { M20E } from '../config.js'
import { Trait } from '../dice/dice.js'

/**
 * Actor class for base sleeper NPCs, 
 * also provides base functions for all derived actor class (char and npc alike)
 * @extends {Actor}
 */
export default class M20eActor extends Actor {

  /** @override */
  constructor(data, context) {
    //creates a derived class for specific actor types
    if ( data.type in CONFIG.Actor.documentClasses && !context?.isExtendedClass) {
      // specify our custom actor subclass here
      // when the constructor for the new class will call it's super(),
      // the isExtendedClass flag will be true, thus bypassing this whole process
      // and resume default behavior
      return new CONFIG.Actor.documentClasses[data.type](data,{...{isExtendedClass: true}, ...context});
    }
  //default behavior, just call super and do all the default Item inits.
  super(data, context);
  }

  /* -------------------------------------------- */
  /*  Actor Preparation                           */
  /* -------------------------------------------- */

  /**
   * first function in the prepareData sequence
   *  @override
   */
  prepareBaseData() {
    super.prepareBaseData();

    this.prepareResources();
    this.prepareTraits();
  }

  /**
   * third function in the prepareData sequence
   *  @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    const actorData = this.data;
    actorData.items.forEach( 
      item => item._prepareOwnedItem()
    );
  }

  /**
   * add dummy resources in actorData in the form {value, max}, to be used by token bars
   * also computes secondary health stats 'status' and 'malus'
   * according to health values and the list of maluses
   */
  prepareResources() {
    const WT = CONFIG.M20E.WOUNDTYPE;
    const actorData = this.data;

    //create willpower property with {value, max} pair
    const willpower = actorData.data.resources.willpower;
    actorData.data.willpower = {
      value: willpower.max - willpower[WT.BASHING],
      max: willpower.max
    }

    //create health property with {value, max} pair
    const health = actorData.data.resources.health;
    actorData.data.health = {
      value: health.max - health[WT.BASHING],
      max: health.max
    }
    //prepare an array of integers from the comma separated string
    const maluses = health.malusList.split(',').map(v => (parseInt(v)));
    //create derived data for health resource, to be displayed and used later
    health.status = utils.safeLocalize(`M20E.healthStatus.${health[WT.BASHING]}`);
    health.malus = health[WT.BASHING] > 0 ? maluses[(health[WT.BASHING] - 1)] : 0;
  }

  /**
   * called at the end of prepareBaseData()
   * populates a tree of traits in actorData from every item that is a virtualTrait
   * Also populate a tree of all traits in the config
   */
  prepareTraits() {
    const actorData = this.data;
    //add/update config with all item traits
    utils.traitsToPaths(actorData.data.traits).forEach( path => {
      foundry.utils.setProperty(CONFIG.M20E.traits, path, game.i18n.localize(`M20E.traits.${path}`));
    });
    //add initiative to the traits 
    const dext = parseInt(foundry.utils.getProperty(actorData.data.traits,'attributes.dext.value'));
    const wits = parseInt(foundry.utils.getProperty(actorData.data.traits,'attributes.wits.value'));
    foundry.utils.setProperty(actorData.data.traits, 'initiative.value', dext + wits);
    foundry.utils.setProperty(CONFIG.M20E.traits, 'initiative', game.i18n.localize('M20E.traits.initiative'));

    actorData.items.forEach( item => {
      if ( item.isTrait ) {
        const traitData = item.getTraitData();
        const relativePath = traitData.subType ? 
          `${traitData.cat}.${traitData.subType}.${traitData.key}` : 
          `${traitData.cat}.${traitData.key}`;
        foundry.utils.setProperty(actorData.data.traits, relativePath, traitData.data);
        //add/update config with all item traits
        foundry.utils.setProperty(CONFIG.M20E.traits, relativePath, traitData.data.name);
      } else if (item.data.type === 'paradigm') {
        //not a trait but since we're iterrating items...
        actorData.data.paraItem = item;
      }
    });
    //add willpower property in the traits array (for roll purposes)
    foundry.utils.setProperty(actorData.data.traits, 'willpower', {value: actorData.data.resources.willpower.max});
  }

  /**
   * @override
   * mostly vanilla function
   * adds a _sourceValue to properties that are gonna be changed by the override
   */
  applyActiveEffects() {
    const overrides = {};

    // Organize non-disabled effects by their application priority
    const changes = this.effects.reduce((changes, e) => {
      if ( e.data.disabled ) return changes;
      return changes.concat(e.data.changes.map(c => {
        c = foundry.utils.duplicate(c);
        c.effect = e;
        c.priority = c.priority ?? (c.mode * 10);
        return c;
      }));
    }, []);
    changes.sort((a, b) => a.priority - b.priority);

    // Apply all changes
    for ( let change of changes ) {
      const sourceValue = foundry.utils.getProperty(this.data, change.key);
      const result = change.effect.apply(this, change);
      if ( result !== null ) {
        //add _sourceValue to the overriden property
        const keys = change.key.split('.');
        keys[keys.length-1] = '_sourceValue';
        if ( !foundry.utils.hasProperty(this.data, keys.join('.')) ) {
          //don't set sourceValue if it has already been set before
          foundry.utils.setProperty(this.data, keys.join('.'), sourceValue);
          //also add the property to the item if trait's actually an item
          keys[keys.length-1] = 'itemId';
          if ( foundry.utils.hasProperty(this.data, keys.join('.')) ) {
            const item = this.items.get(foundry.utils.getProperty(this.data, keys.join('.')));
            item.data.data._overrideValue = result;
          }
        }
        //vanilla
        overrides[change.key] = result;
      }
    }

    // Expand the set of final overrides
    this.overrides = foundry.utils.expandObject(overrides);
  }

  /* -------------------------------------------- */
  /*  Shorthands                                  */
  /* -------------------------------------------- */

  get isCharacter() {
    return this.data.data.isCharacter === true;
  }
  get isNPC() {
    return this.data.data.isCharacter !== true;
  }
  get isMage() { //obviously overriden in mageActor
    return false;
  }
  get paradigm() {
    return this.data.data.paraItem || null;
  }

  /* -------------------------------------------- */
  /*  New Actor Creation                          */
  /* -------------------------------------------- */

  /**
   * Executed only once, just prior the actorData is actually sent to the database
   * Adds base options/items to the actor (only if created from scratch !)
   *  @override
   */
   async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const actorData = this.data;
    //check if actor is from existing actor (going in or out a compendiumColl)
    if ( actorData.flags.core?.sourceId ) { return; }

    //get baseAbilities from compendium if any or defaultAbilities from config
    const baseAbilities = await this._getBaseAbilities();
    //get some other items (atm only paradigm item)
    const otherBaseItems = [];
    otherBaseItems.push ({
      type: 'paradigm',
      img: 'systems/mage-fr/assets/icons/abstract-013.svg',
      name: game.i18n.format(`M20E.paradigmName`, {name: actorData.name})
    });

    const items = [...baseAbilities, ...otherBaseItems];
    //update all items at once
    actorData.update({items});

    //updates token config for player character
    if ( actorData.data.isCharacter === true ) {
      actorData.token.update(CONFIG.M20E.characterTokenConfig);
    }
  }

  /**
   * returns base abilities from pack if any, otherwise default abilities from config
   * also sorts abilities alphabetically and adds values to the `sort`property
   * @return {Array} alpha sorted array of item data
   */
   async _getBaseAbilities() {
    //get the compendium module 'name' from the settings
    const scope = game.settings.get("mage-fr", "compendiumScope");
    //Todo : Maybe get packname from settings as well in the case of multiple compendium for different mage versions
    const packName = `${scope}.base-abilities`;
    const pack = game.packs.get(packName);
    const baseAbilities = pack ? 
      await this._getAbilitiesFromPack(pack) :
      await this._getDefaultAbilities();
    
    //alpha sort the abilities now that they're localized
    baseAbilities.sort(utils.alphaSort());
    //defines the sort property so that later user-added abilities will display on top
    //note : Foundry does the same thing, but only after the first 'same actor drag/drop'
    return baseAbilities.map((itemData, i) => {
      return {...itemData, ...{sort: (i+1) * CONST.SORT_INTEGER_DENSITY}};
    });
  }

  /**
   * 
   * Gets base abilities from a valid pack 
   * maps them to itemData objects (mostly for uniformity with _getDefaultAbilities())
   * @param  {CompendiumCollection} pack a valid base.abilities CompendiumCollection
   * @return {Array} an array of item data objects
  */
  async _getAbilitiesFromPack(pack) {
    return await pack.getDocuments()
      .then(myDocs => {
        //return myDocs.map(packItem => packItem.data.toObject());
        return myDocs.map(packItem => {
          return {
            type: 'ability',
            img: 'systems/mage-fr/assets/icons/auto-repair.svg',
            name: packItem.name,
            data: packItem.data.data
          };
        });
      });
  }

  /**
   * Gets base abilities from config + localization 
   * get subType description from html template + localization file
   * @return {Array} an array of item data objects
   */
  async _getDefaultAbilities() {
    //get default descriptions for all 3 ability types
    //(since we gonna use them 11 times each)
    const defaultDescriptions = {};
    defaultDescriptions.talent = await utils.getDefaultDescription('talent');
    defaultDescriptions.skill = await utils.getDefaultDescription('skill');
    defaultDescriptions.knowledge = await utils.getDefaultDescription('knowledge');

    //prepare default abilities from config object that's the form {abilityKey: abilitySubtype}
    return Object.entries(CONFIG.M20E.defaultAbilities)
      .map(([key, value]) => {
        return {
          type: 'ability',
          img: 'systems/mage-fr/assets/icons/auto-repair.svg',
          name: game.i18n.localize(`M20E.defaultAbilities.${key}`),
          data: {
            subType: value,
            systemDescription: defaultDescriptions[value]
          }
        };
    });
  }

  /* -------------------------------------------- */
  /*  Sheet or other external                     */
  /* -------------------------------------------- */

  getItemFromId(itemId) {
    const item = this.items.get(itemId);
    if ( !item ) {
      ui.notifications.error(game.i18n.format('M20E.notifications.itemNotFoundInActor', {
        itemRef: itemId,
        actorName: this.name
      }));
    }
    return item;
  }

  //todo : write this !
  getItemFromName(itemName, itemType='', itemSubType= '') {

  }

  /**
   * check whether dropped item can be 'safely' created on this actor
   * @param  {M20eItem} item item being dropped
   */
   isDropAllowed(item) {
    const itemData = item.data;
    //check name against all names in same itemType
    const duplicates = this.items.filter(item => (item.type === itemData.type) && (item.name === itemData.name));
    if ( duplicates.length ) {
      ui.notifications.error(game.i18n.format(`M20E.notifications.duplicateName`, {name: itemData.name}));
      return;
    }
    //check against 'creation mode'
    if ( this.data.data.creationDone && !game.user.isGM && itemData.protectedType ) {
        ui.notifications.error(game.i18n.localize('M20E.notifications.notOutsideCreation'));
        return false;
    }
    //check against restricted
    if ( itemData.data.restricted && !itemData.data.restricted.includes(this.data.type) ) {
      const itemType = game.i18n.localize(`ITEM.Type${item.type.capitalize()}`);
      ui.notifications.error(game.i18n.format('M20E.notifications.restrictedItem',
        {actorName:this.name, itemType: itemType}));
      return false;
    }
    return true;
  }

  /**
   * get the system translation for M20E.relativePath or user lexiconEntry if axists
   * @param  {String} relativePath a localization path relative to the M20E root.
   */
  locadigm(relativePath) {
    const paraItem = this.paradigm;
    if ( !paraItem ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.missingParadigm'));
      return;
    }
    return paraItem.locadigm(relativePath);
  }

  /**
   * Get the user overridden translation for the specific path in the translation file
   * Ask the paradigm item for that specific lexicon entry
   * Mostly called by the locadigm HB helper
   * 
   * @return {String|undefined} the text the user chose for this translation path 
   */
  getLexiconEntry(relativePath) {
    const paraItem = this.paradigm;
    if ( !paraItem ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.missingParadigm'));
      return;
    }
    return paraItem.getLexiconEntry(relativePath);
  }

  /**
   * Sets a user overridden translation for a specific path in the translation file
   * get the paradigm item to store that as a specific lexicon entry
   */
  async setLexiconEntry(relativePath, newValue){
    const paraItem = this.paradigm;
    if ( !paraItem ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.missingParadigm'));
      return;
    }
    return await paraItem.setLexiconEntry(relativePath, newValue);
  }

  /** 
   * Might be pretty useless ?
   * TODO : remove that ! 
   *  'Safe' update as in 
   * "if value is a number, parseInt it just to be on the 'safe' side"
   * assumes the value as already been checked against min & max
   */
  async safeUpdateProperty(relativePath, newValue){
    //beware of floats !!!
    const propertyValue = isNaN(newValue) ? newValue : parseInt(newValue);
    return await this.update({[`data.${relativePath}`]: propertyValue});
  }
  /**
   * Adds the amount amount of wounds of type woundType to the resource resourceName
   * Has a built in overflow to apply remaining wounds to the directly above woundtype.
   * Todo : maybe check if actor is unconscious or dead and put relevant AE or message ?
  */
  async wound(resourceName, amount, woundType = M20E.WOUNDTYPE.BASHING) {

    //recursively add wounds to higher woundTypes in case of overflow
    const overflow = (rez, amount, woundType, updateObj={}) => {
      const remainder = Math.max(amount - (rez.max - rez[woundType]), 0);
      updateObj[`data.resources.${resourceName}.${woundType}`] = Math.min(rez.max, rez[woundType] + amount);
      return ( remainder &&  woundType < M20E.WOUNDTYPE.AGGRAVATED ) ? 
        overflow(rez, remainder, woundType + 1, updateObj) : updateObj;
    }
    //recursively standardize lower woundTypes values to the highest value if needed
    const standardize = (rez, updateObj, woundType) => {
      if ( woundType > M20E.WOUNDTYPE.BASHING ) {
        if (rez[woundType-1] < updateObj[`data.resources.${resourceName}.${woundType}`]) {
          updateObj[`data.resources.${resourceName}.${woundType - 1}`] = updateObj[`data.resources.${resourceName}.${woundType}`];
        }
        standardize(rez, updateObj, woundType - 1);
      }
    }

    //create & populate the updateObj
    let updateObj = overflow(this.data.data.resources[resourceName], amount, woundType);
    standardize(this.data.data.resources[resourceName], updateObj, woundType);

    return await this.update(updateObj);
  }

  /**
   * Removes the amount amount of wounds of type woundType to the resource resourceName
   * Has a built in overflow to heal remaining wounds to the directly below woundtype.
   * Todo : maybe check if actor regains consciousness or revives and remove relevant AE or message ?
   */
  async heal(resourceName, amount, woundType = M20E.WOUNDTYPE.BASHING) {

    //recursively remove wounds to lower woundTypes in case of overflow
    const overflow = (rez, amount, woundType, minValue, updateObj={}) => {
      //can't heal if woundType above is not healed first, hence the minValue
      const newValue = Math.max(rez[woundType] - amount, minValue);
      updateObj[`data.resources.${resourceName}.${woundType}`] = newValue;
      //calculate remainder based on the actual healed value for this wountType
      const remainder = Math.max(amount - (rez[woundType] - newValue), 0);
      return ( remainder &&  woundType > M20E.WOUNDTYPE.BASHING ) ? 
        overflow(rez, remainder, woundType - 1, newValue, updateObj) : updateObj;
    }

    //create & populate the updateObj
    const rez = this.data.data.resources[resourceName];
    let updateObj = overflow(rez, amount, woundType, (rez[woundType + 1] ?? 0));

    return await this.update(updateObj);
  }

  async addXP(xpGain) {
    if ( xpGain > 0 ) {
      //update both currentXP and totalXP (total is just a reminder of all the xp gains)
      const updateObj = {};
      updateObj[`data.currentXP`] = this.data.data.currentXP + xpGain;
      updateObj[`data.totalXP`] = this.data.data.totalXP + xpGain;
      await this.update(updateObj);
    }
  }

  async removeXP(xpLoss) {
    if ( xpLoss > 0 ) {
      //only update currentXP and ensure we don't go into negative xp values
      const newValue = Math.max(this.data.data.currentXP - xpLoss, 0);
      await this.update({[`data.currentXP`]: newValue});
    }
  }


  /* -------------------------------------------- */
  /*  Roll related                                */
  /* -------------------------------------------- */

  getThrowFlavor(traits=[]) {
    //regular roll (non item, non magical) compute flavor based on the number of traits inside the throw
    switch ( traits.length ) {
      case 0: //no trait was selected
        return `${game.i18n.localize("M20E.diceThrows.freeThrow")}.`;
        break;
      case 1: //only one trait roll
      case 2: //classic (or not) 2 traits
        const throwTrait = traits.map(trait => {
          return trait.useSpec ? `${trait.name}(S)` :
            ( trait.value === 0 ? `<span class= "red-thingy">${trait.name}</span>` : trait.name) ;
        }).join(' + ');
        return `${game.i18n.format("M20E.diceThrows.throwFor", {trait: throwTrait})}.`;
        break;
      default: //too many traits => don't bother
        return `${game.i18n.localize("M20E.diceThrows.mixedThrow")}.`;
    }
  }

  getMacroData(data) {
    const traits = data.map( d => new Trait(d));
    this.extendTraits(traits);
    return {
      name : this.getThrowFlavor(traits),
      img: 'systems/mage-fr/assets/icons/d10.svg',
      commandParameters : {
        data: data
      }
    }
  }

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   * @return {Array} an array of {@link ExtendedTrait} 
   */
  extendTraits(traits) {
    traits.map(trait => {
      trait.data = {...trait.data, ...this.getExtendedTraitData(trait)};
    });
  }

  getExtendedTraitData(trait) {
    const extendedTraitData = foundry.utils.getProperty(this.data.data.traits,
      trait.path);

    return {
      name: extendedTraitData.name || game.i18n.localize(`M20E.traits.${trait.path}`),
      displayName: extendedTraitData.displayName || this.getLexiconEntry(`traits.${trait.path}`),
      value: extendedTraitData.value,
      specialisation: extendedTraitData.specialisation
    }
  }
}
