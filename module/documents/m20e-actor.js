// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";
import { M20E } from '../config.js'

import Trait from '../trait.js'
import DiceThrower from '../dice-thrower.js'

/**
 * The base actor class for the mage System, extends Foundry's Actor.
 * Natively used by NPC sleepers, and extended by every other actor types.
 * 
 * Implements a custom constructor in order to allow for inheritance of actor classes (not natively possible).
 * Also adds, extends and overrides a number of functions specific to the system (obviously). 
 * 
 * Notes : during preparation, usefull items values are duplicated in the actor's data.traits object.
 * usefull actor traits and derived data (attributes, willpower, initiative, etc) are also duplicated in data.traits.
 * So that every rollable value (and associated data) stands in one place with one common accessible structure.
 * 
 * ActiveEffects are applied to theses duplicates and not the original values.
 * 
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
    this.diceThrower = new DiceThrower(this);
  }

  /* -------------------------------------------- */
  /*  Actor Preparation (prepareData sequence)    */
  /* -------------------------------------------- */

  /**
   * first function in the prepareData sequence
   *  @override
   */
  prepareBaseData() {
    //investigate the difference between the 2 calls to prepareData on actor creation
    super.prepareBaseData();

    //populates a tree of stats in actorData from every item that is a virtualStat
    //Also populate a tree of all stats in the config for future reference (stats selection in rollables and GM panel)
    //create the stats property before populating
    this.data.stats = {};
    this._prepareActorStats();
    this._prepareItemsStats();
    this._prepareResources(); 
  }

  /* -------------------------------------------- */

  _prepareActorStats() {
    const actorData = this.data;
    this._prepareCategoryStats('attributes');
  }

  /* -------------------------------------------- */

  _prepareCategoryStats(category) {
    const actorData = this.data;
    for( const key in actorData.data[category]) {
      const path = `${category}.${key}`;
      //add entry to actor's stats with path and statData
      this._setStat(path, {value: foundry.utils.getProperty(actorData.data,`${path}.value`)});
      //also add entry to CONFIG with item's path and name, if necessary
      if ( !foundry.utils.hasProperty(CONFIG.M20E.stats, path) ) {
        foundry.utils.setProperty(CONFIG.M20E.stats, path, game.i18n.localize(`M20E.${path}`));
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * populates the actor's stats object with path and statData from 'stat' items 
   */
  _prepareItemsStats() {
    const actorData = this.data;
    for( const item of actorData.items ) {
      if ( item.isStat ) {
        const {path, name, statData} = item.getStatData();
        //add entry to actor's stats with path and statData
        this._setStat(path, statData);
        //also add entry to CONFIG with item's path and name, if necessary
        if ( !foundry.utils.hasProperty(CONFIG.M20E.stats, path) ) {
          foundry.utils.setProperty(CONFIG.M20E.stats, path, name);
        }
      } else if (item.data.type === 'paradigm') {
        //not a stat but since we're iterrating items...
        actorData.data.paraItem = item;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * add dummy resources in actorData in the form {value, max}, to be used by token bars.
   * also computes secondary health stats 'status' and 'malus',
   * according to health values and the list of maluses.
   */
   _prepareResources() {
    const WT = CONFIG.M20E.WOUNDTYPE;
    const actorData = this.data;
    
    //create willpower property with {value, max} pair
    const willpower = actorData.data.resources.willpower;
    foundry.utils.setProperty(actorData.data,
        game.i18n.localize('M20E.resources.willpower'), {
        value: willpower.max - willpower[WT.BASHING],
        max: willpower.max
    });
    //Add willpower to the secondary stats
    const willpowerMax = this.data.data.resources.willpower.max;
    this._setStat('secondary.willpower', {value: willpowerMax});
    if ( !foundry.utils.hasProperty(CONFIG.M20E.stats, 'secondary.willpower') ) {
      foundry.utils.setProperty(CONFIG.M20E.stats, 'secondary.willpower', game.i18n.localize('M20E.secondary.willpower'));
    }
    
    
    //create health property with {value, max} pair
    const health = actorData.data.resources.health;
    foundry.utils.setProperty(actorData.data,
      game.i18n.localize('M20E.resources.health'), {
        value: health.max - health[WT.BASHING],
        max: health.max
    });
    //prepare an array of integers from the comma separated string
    const maluses = health.malusList.split(',').map(v => (parseInt(v)));
    //create derived data for health resource, to be displayed and used later
    health.status = utils.safeLocalize(`M20E.healthStatus.${health[WT.BASHING]}`);
    health.malus = health[WT.BASHING] > 0 ? maluses[(health[WT.BASHING] - 1)] : 0;
  }

  /* -------------------------------------------- */

  /**
   * Called by prepareEmbeddedEntities() during the second phase of data preparation
   * mostly vanilla function
   * adds a _sourceValue to properties that are gonna be changed by the data override
   * 
   * @override
   */
  applyActiveEffects() {
    const overrides = {};

    // Organize non-disabled effects by their application priority
    const changes = this.effects.reduce((changes, e) => {
      //Mage-Fr specific
      this.manageLinkedEffect(e);
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
        
        //Mage-Fr specific
        const path = change.key.match(/(?<=stats\.)(.+)(?=\.)/g);
        if ( path ) {
          //only for AE on the stats array          
          if ( !foundry.utils.hasProperty(this.data.stats, `${path}._sourceValue`) ) {
            //don't set sourceValue if it has already been set before
            foundry.utils.setProperty(this.data.stats, `${path}._sourceValue`, sourceValue);
          }
          //also add the property to the item if stat is actually an item
          const itemId = foundry.utils.getProperty(this.data.stats, `${path}.itemId`);
          if ( itemId ) {
            const item = this.items.get(itemId);
            item.data.data._overrideValue = result;
          } else {
            foundry.utils.setProperty(this.data.data, `${path}._overrideValue`, result);
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

  /**
   * Disables effect if it originates from an equipable item that's not equiped.
   * @param  {ActiveEffect} effect
   */
  manageLinkedEffect(effect) {
    const origins = effect.data.origin.split('.');
    if ( origins[2] !== 'Item' ) { return; }
    //origin is obviously a uuid for an owned item 
    const item = this.items.get(origins[3])
    if ( !item ) { return; }

    if ( item.isUnequiped ) {//only works on equipable items
      effect.data.disabled = true;
    }
  }

  /* -------------------------------------------- */

  /**
   * third function in the prepareData sequence
   * preparation of data and stats that might be dependant on items and AE being prepared/applied
   *  @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

   /*//todo : decide if willpower can be overridden before or after ?
   const willpowerMax = this.data.data.resources.willpower.max;
   this._setStat('secondary.willpower', {value: willpowerMax});
   foundry.utils.setProperty(CONFIG.M20E.stats, 'secondary.willpower', game.i18n.localize('M20E.secondary.willpower'));
   */

   //add init to secondary stats
    const dext = this._getStat('attributes.dext','value');
    const wits = this._getStat('attributes.wits','value');
    this._setStat('secondary.initiative', {value: dext + wits});
    foundry.utils.setProperty(CONFIG.M20E.stats, 'secondary.initiative', game.i18n.localize('M20E.secondary.initiative'));

    const actorData = this.data;
    for( let item of actorData.items ) {
      item._prepareOwnedItem();
    }
  }

  /* -------------------------------------------- */

  _getStat(path, propKey=null) {
    const stat = foundry.utils.getProperty(this.data.stats, (propKey ? `${path}.${propKey}` : path));
    return utils.isNumeric(stat) ? parseInt(stat) : stat;
  }

  /* -------------------------------------------- */

  _setStat(path, stat) {
    foundry.utils.setProperty(this.data.stats, path, stat);
  }

  /* -------------------------------------------- */
  /*  New Actor Creation                          */
  /* -------------------------------------------- */

  /**
   * Added sourceId when cloning
   *  @override
   */
  clone(data, options) {
    data = data || {};
    data['flags.core.sourceId'] = this.uuid;
    super.clone(data, options);
  }

  /* -------------------------------------------- */

  /**
   * Added base abilities compendium support to vanilla function 
   * @override
   */
   static async createDialog(data={}, options={}) {

    // Collect data
    const documentName = this.metadata.name;
    const types = game.system.entityTypes[documentName];
    const folders = game.folders.filter(f => (f.data.type === documentName) && f.displayed);
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.localize('M20E.new.createActor');

    //system specific : list of all base abilities compendiums
    const baseAbilitiesPacks = [...game.packs.entries()].reduce((acc, [key, value]) => {
      return value.metadata.name.includes('base-abilities') ?
       [...acc, {id: key, name: value.metadata.label}] : acc;
    }, []);

    // Render the entity creation form
    const html = await renderTemplate(`systems/mage-fr/templates/sidebar/entity-create.html`, {
      name: data.name || game.i18n.format("ENTITY.New", {entity: label}),
      folder: data.folder,
      folders: folders,
      hasFolders: folders.length > 1,
      pack: baseAbilitiesPacks[0]?.id,
      packs: baseAbilitiesPacks,
      hasPacks: baseAbilitiesPacks.length > 0,
      type: data.type || types[0],
      types: types.reduce((obj, t) => {
        const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
        obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
        return obj;
      }, {}),
      hasTypes: types.length > 1
    });

    // Render the confirmation dialog window
    return Dialog.prompt({
      title: title,
      content: html,
      label: title,
      callback: html => {
        const form = html[0].querySelector("form");
        const fd = new FormDataExtended(form);
        data = foundry.utils.mergeObject(data, fd.toObject());
        if ( !data.folder ) delete data["folder"];
        if ( types.length === 1 ) data.type = types[0];
        return this.create(data, {renderSheet: true});
      },
      rejectClose: false,
      options: options
    });
  }

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
    const baseAbilities = await this._getBaseAbilities(data.pack);
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
    actorData.token.update({bar1: {attribute: game.i18n.localize('M20E.resources.health')}});
  }

  /* -------------------------------------------- */

  /**
   * returns base abilities from pack if any, otherwise default abilities from config
   * also sorts abilities alphabetically and adds values to the `sort`property
   * @return {Array} alpha sorted array of item data
   */
   async _getBaseAbilities(fullPackName) {
    //try and get the pack from given packname
    const pack = game.packs.get(fullPackName);
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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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
  /*  Shorthands                                  */
  /* -------------------------------------------- */

  get alias() {
    if ( this.data.data.aliases.list.length > 0 && game.settings.get("mage-fr", "allowAliases") ) {
      if ( Math.ceil(CONFIG.Dice.randomUniform() * 100) <= this.data.data.aliases.frequency ) {
        const aliasIndex = Math.ceil(CONFIG.Dice.randomUniform() * this.data.data.aliases.list.length) - 1;
        return this.data.data.aliases.list[aliasIndex];
      }
    }
    return this.data.name;
  }

  /* -------------------------------------------- */

  get isCharacter() {
    return this.data.data.isCharacter === true;
  }

  get isNPC() {
    return !this.isCharacter;
  }

  get isMage() { //obviously overriden in mageActor
    return false;
  }

  get paradigm() {
    return this.data.data.paraItem || null;
  }

  /* -------------------------------------------- */
  /*  Other      */
  /* -------------------------------------------- */

  /**
   * Returns item from Id, with check.
   * In case item's not found, displays notification and return null.
   * @param  {String} itemId
   * @returns {M20eItem|null}
   */
  getItemFromId(itemId) {
    const item = this.items.get(itemId);
    if ( !item ) {
      ui.notifications.error(game.i18n.format('M20E.notifications.itemNotFoundInActor', {
        itemRef: itemId,
        actorName: this.name
      }));
      return null;
    }
    return item;
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  /** 
   * 'Safe' update as in
   * todo : do better !
   * "if value is a number, parseInt it just to be on the 'safe' side"
   * assumes the value as already been checked against min & max
   */
  async safeUpdateProperty(relativePath, newValue){
    //beware of floats !!!
    const propertyValue = isNaN(newValue) ? newValue : parseInt(newValue);
    return await this.update({[`data.${relativePath}`]: propertyValue});
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  async addXP(xpGain) {
    if ( xpGain > 0 ) {
      //update both currentXP and totalXP (total is just a reminder of all the xp gains)
      const updateObj = {};
      updateObj[`data.currentXP`] = this.data.data.currentXP + xpGain;
      updateObj[`data.totalXP`] = this.data.data.totalXP + xpGain;
      await this.update(updateObj);
    }
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   */
  getExtendedStats(stats) {
    return stats.map( trait => {
      const itemId = trait.itemId || this._getStat(trait.path, 'itemId');
      const xData = itemId ? 
        this.getItemFromId(itemId).getExtendedTraitData(trait.path) :
        this.getExtendedTraitData(trait.path);
      return new Trait({
        path: trait.path,
        itemId: itemId,
        data: {...trait.data, ...xData}
      });
    });
  }

  /* -------------------------------------------- */

  getExtendedTraitData(path) {
    return {
      name: game.i18n.localize(`M20E.${path}`),
      displayName: this.getLexiconEntry(path),
      value: this._getStat(path, 'value'),
      specialisation: foundry.utils.getProperty(this.data.data, `${path}.specialisation`)
    };
  }
}
