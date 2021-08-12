// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";

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
    actorData.items.forEach( item => item._prepareOwnedItem() );
  }

  /**
   * add dummy resources in actorData in the form {value, max}, to be used by token bars
   * also computes secondary health stats 'status' and 'malus'
   * according to health values and the list of maluses
   */
  prepareResources() {
    const actorData = this.data;
    
    actorData.data.health = {
      value: actorData.data.resources.health.bashing,
      max: actorData.data.resources.health.max
    }
    actorData.data.willpower = {
      value: actorData.data.resources.willpower.bashing,
      max: actorData.data.resources.willpower.max
    }

    const health = actorData.data.resources.health;
    //prepare an array of integers from the comma separated string
    const maluses = health.malusList.split(',').map(v => (parseInt(v)));
    const wounds = health.max - health.bashing;

    health.status = game.i18n.localize(`M20E.healthStatus.${wounds}`);
    health.malus = wounds > 0 ? maluses[wounds - 1] : 0;
  }

  /**
   * todo : description ^^
   */
  prepareTraits() {
    const actorData = this.data;
    //todo : maybe add copy of init value in here too
    //beware of active effects.
    actorData.items.forEach( item => {
      if ( item.isTrait ) {
        const traitData = item.getTraitData();
        const relativePath = traitData.subType ? 
          `${traitData.cat}.${traitData.subType}.${traitData.key}` : 
          `${traitData.cat}.${traitData.key}`;
        foundry.utils.setProperty(actorData.data.traits, relativePath, traitData.data);
        foundry.utils.setProperty(game.m20e.traits, relativePath, traitData.data.name);
      } else if (item.data.type === 'paradigm') {
        //not a trait but since we're iterrating items...
        actorData.data.paraItem = item;
      }
    });
    //add willpower property in the traits array (for roll purposes)
    //todo : check if willpower rolls use value or valuemax ?
    foundry.utils.setProperty(actorData.data.traits, 'willpower', {value: actorData.data.resources.willpower.max});
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
      img: '',
      name: game.i18n.format(`M20E.paradigmName`, {name: actorData.name})
    });

    const items = [...baseAbilities, ...otherBaseItems];

    //updates token config for player character
    if ( actorData.data.isCharacter === true ) {
      actorData.token.update(CONFIG.M20E.characterTokenConfig);
    }

    //update everything
    actorData.update({items});
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
            img: '',//todo add icon
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
          img: '',//todo add icon
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

  //health & willpower
  addWound(resourceName, index) {
    const base1Index = index += 1; // cuz sometimes you're just too tired to think in base0
    let {max, bashing, lethal, aggravated} = this.data.data.resources[resourceName];

    //decrease bashing value first, then lethal, then aggravated
    if ( (max - bashing) < base1Index ) {
      bashing -= 1;
      this.safeUpdateProperty(`resources.${resourceName}`, {bashing});
    } else {
      if ( (max - lethal) < base1Index ) {
        lethal -= 1;
        this.safeUpdateProperty(`resources.${resourceName}`, {lethal});
      } else {
        if ( (max - aggravated) < base1Index ) {
          aggravated -= 1;
          this.safeUpdateProperty(`resources.${resourceName}`, {aggravated});
        }
      }
    }
  }

  //health & willpower
  removeWound(resourceName, index) {
    const base1Index = index += 1;
    let {max, bashing, lethal, aggravated} = this.data.data.resources[resourceName];

    //increase aggravated value first, then lethal, then bashing
    if ( (max - aggravated) >= base1Index ) {
      aggravated += 1;
      this.safeUpdateProperty(`resources.${resourceName}`, {aggravated});
    } else {
      if ( (max - lethal) >= base1Index ) {
        lethal += 1;
        this.safeUpdateProperty(`resources.${resourceName}`, {lethal});
      } else {
        if ( (max - bashing) >= base1Index ) {
          bashing += 1;
          this.safeUpdateProperty(`resources.${resourceName}`, {bashing});
        }
      }
    }
  }

  /* -------------------------------------------- */
  /*  Roll related                                */
  /* -------------------------------------------- */

  getThrowFlavor(xTraitsToRoll=[]) {
    //regular roll (non item, non magical) compute flavor based on the number of traits inside the throw
    switch ( xTraitsToRoll.length ) {
      case 0: //no trait was selected
        return `${game.i18n.localize("M20E.diceThrows.freeThrow")}.`;
        break;
      case 1: //only one trait roll
      case 2: //classic (or not) 2 traits
        const throwTrait = xTraitsToRoll.map(trait => {
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
    const xTraitToRoll = this.extendTraits(data.map( d => new Trait(d)));
    return {
      name : this.getThrowFlavor(xTraitToRoll),
      img: '', // todo : maybe find a more suitable image than default one
      commandParameters : {
        data: data
      }
    }
  }

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   * @return {Array} an array of {@link ExtendedTrait} 
   */
  extendTraits(traitsToRoll) {
    return traitsToRoll.map(trait => new ExtendedTrait({trait, ...this.getExtendedTraitData(trait)}));
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