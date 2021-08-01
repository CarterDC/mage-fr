// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";

/**
 * Implements M20eActor as an extension of the Actor class
 * adds system specific functions as well as some overrides
 * atm only used by the charMage actor-type.
 * @extends {Actor}
 */
export default class M20eActor extends Actor {

  /** @override */
  constructor(data, context) {
    //might need to do stuff in here
    super(data, context);
  }

  /**
   * Adds base options/items to the actor (only if created from scratch !)
   *  @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const actorData = this.data;
    //check if actor is from existing actor (going in or out a compendium coll)
    if ( actorData.flags.core?.sourceId ) { return; }

    if ( actorData.data.isPlayable === true ) {
      //auto link tokens in case of player character
      //todo : maybe move that in sub class _preCreate if needed
      actorData.token.update({actorLink: true});
    }

    //get baseAbilities from compendium if any or defaultAbilities from config
    const baseAbilities = await this._getBaseAbilities();
    
    //get some other items
    const otherBaseItems = [];
    //add paradigm item
    otherBaseItems.push ({
      type: 'paradigm',
      img: '',
      name: game.i18n.format(`M20E.paradigmName`, {name: actorData.name})
    });

    //merge all the items together
    const items = [...baseAbilities, ...otherBaseItems];
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
    //note : Foundry does the same thing, but only after the first 'same actor' drag/drop
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
            img: '',
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
          img: '',
          name: game.i18n.localize(`M20E.defaultAbilities.${key}`),
          data: {
            subType: value,
            systemDescription: defaultDescriptions[value]
          }
        };
    });
  }

  /** @override */
  prepareData() {
    super.prepareData();
    const actorData = this.data;

    this._extendHealthStats();
    //this._extendMagePower();

    this.items.forEach(item => item._prepareOwnedItem());
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
    //check against spheres levels
    if ( itemData.type === 'rote' && !item._isActuallyRollable(this) ){
      ui.notifications.error(game.i18n.format('M20E.notifications.unrollableRote',
        {actorName:this.name, itemName: item.name}));
      return false;
    }
    return true;
  }

  /**
   * Gets the sole paradigm item from this actor
   * Note : class might actually be M20eParadigmItem if I kept the useless subclass system for the items
   * @return {M20eItem|undefined} 
   */
  get paradigm() {
    return this.items.filter(item => item.type === "paradigm")[0];
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
   * Reevaluates secondary health stats 'status' and 'malus'
   * according to health values and the list of maluses
   */
  _extendHealthStats() {
    let health = this.data.data.health;
    //prepare an array of negative integers from the comma separated string
    const maluses = health.malusList.split(',').map(v => (parseInt(v)));
    const wounds = health.max - health.value;

    health.status = game.i18n.localize(`M20E.healthStatus.${wounds}`);
    if ( wounds > 0 ) {
      health.malus = maluses[wounds - 1];
    } else {
      health.malus = 0;
    }
  }

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   * dispatch calls according to wether each Trait references an item or an actor property
   * @return {Array} an array of {@link ExtendedTrait} 
   */
   extendTraits(traitsToRoll) {
    return traitsToRoll.map(trait => {
      const extendedData = trait.isItem ?
        this.items.get(trait.itemId).getExtendedTraitData() :
        this.getExtendedTraitData(trait);
      
      return new ExtendedTrait({trait, ...extendedData});
    });
  }

  getExtendedTraitData(trait) {
    const {category, key= ''} = trait;
    const relativePath = key ? `${category}.${key}` : `${category}`;
    const actorData = this.data;

    let value = 0;
    let specName = '';
    switch ( category ) {
      case 'willpower':
        value = parseInt(actorData.data.willpower.max);
        specName = ''
        break;
      case 'arete':
        value = parseInt(actorData.data.arete);
        specName = ''
        break;
      default:
        value = parseInt(foundry.utils.getProperty(actorData,`data.${relativePath}.value`)),
        specName = foundry.utils.getProperty(actorData,`data.${relativePath}.specialisation`)
    }
    return {
      name: game.i18n.localize(`M20E.${relativePath}`),
      displayName: this.getLexiconEntry(relativePath),
      value: value,
      specName: specName
    }
  }

  /** 
   * Might be pretty useless ?
   *  'Safe' update as in 
   * "if value is a number, parseInt it just to be on the 'safe' side"
   * assumes the value as already been checked against min & max
   */
  async safeUpdateProperty(relativePath, newValue){
    //beware of floats !!!
    const propertyValue = isNaN(newValue) ? newValue : parseInt(newValue);
    return await this.update({[`data.${relativePath}`]: propertyValue});
  }


  increaseMagepower(index){
    if( ! utils.canSeeParadox() ) { return; }
    const base1Index = index += 1;
    let {quintessence, paradox} = this.data.data.magepower;

    //adding quint and/or removing paradox
    if ( (20 - paradox) < base1Index ) { //paradox in the box, remove it
      paradox -= 1;
      this.safeUpdateProperty('magepower', {paradox});
    } else {//add a quint point (according to index)
      if ( quintessence < base1Index ) {
        quintessence += 1;
        this.safeUpdateProperty('magepower', {quintessence});
      }
    }
  }

  decreaseMagepower(index){
    if ( ! utils.canSeeParadox() ) { return; }
    const base1Index = index += 1;
    let {quintessence, paradox} = this.data.data.magepower;

    //adding paradox and/or removing quintessence
    if ( (quintessence) >= base1Index ) { //quint in the box, remove it
      quintessence -= 1;
      this.safeUpdateProperty('magepower', {quintessence});
    } else {//add a paradox point (according to index)
      if ( (20 - paradox) >= base1Index ) {
        paradox += 1;
        this.safeUpdateProperty('magepower', {paradox});
      }
    }
  }

  //health & willpower
  decreaseResource(resourceName, index) {
    const base1Index = index += 1; // cuz sometimes you're just too tired to think in base0
    let {max, value, lethal, aggravated} = this.data.data[resourceName];

    //decrease main value first(bashing), then lethal, then aggravated
    if ( (max - value) < base1Index ) {
      value -= 1;
      this.safeUpdateProperty(resourceName, {value});
    } else {
      if ( (max - lethal) < base1Index ) {
        lethal -= 1;
        this.safeUpdateProperty(resourceName, {lethal});
      } else {
        if ( (max - aggravated) < base1Index ) {
          aggravated -= 1;
          this.safeUpdateProperty(resourceName, {aggravated});
        }
      }
    }
  }

  //health & willpower
  increaseResource(resourceName, index) {
    const base1Index = index += 1;
    let {max, value, lethal, aggravated} = this.data.data[resourceName];

    //increase aggravated first, then lethal, then main value(bashing)
    if ( (max - aggravated) >= base1Index ) {
      aggravated += 1;
      this.safeUpdateProperty(resourceName, {aggravated});
    } else {
      if ( (max - lethal) >= base1Index ) {
        lethal += 1;
        this.safeUpdateProperty(resourceName, {lethal});
      } else {
        if ( (max - value) >= base1Index ) {
          value += 1;
          this.safeUpdateProperty(resourceName, {value});
        }
      }
    }
  }
  
/*
  async modQuintessence(mod) {
    const {quintessence, paradox}  = this.data.data.magepower;
    let newValue = quintessence + parseInt(mod);
    if ( newValue < 0 ) { newValue = 0; }
    if ( newValue + paradox > 20 ) { newValue = 20 - paradox; }
    return this.safeUpdateProperty('magepower.quintessence', newValue);
  }

  async modParadox(mod) {
    const {quintessence, paradox}  = this.data.data.magepower;
    let newValue = paradox + parseInt(mod);
    if ( newValue < 0 ) { newValue = 0; }
    if ( newValue + quintessence > 20 ) { newValue = 20 - quintessence; }
    //TODO : maybe add whisp to GM on certain paradox values
    return this.safeUpdateProperty('magepower.paradox', newValue);
  }

  async addWound(amount, woundType = '', overhead = false) {
    const health = duplicate(this.data.data.health);
    woundType = woundType === '' ? 'value' : woundType;
    const current = foundry.utils.getProperty(health, woundType);
    //log(current);
    if ( amount > current ) {
      if  (overhead ){

      } else {
        return this._safeUpdateValue(`health.${woundType}`, 0);
      }
    }

  }*/



}
