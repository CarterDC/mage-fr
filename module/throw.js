import Trait from './trait.js'
// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";

/* -------------------------------------------- */
/*  M20eThrow Class                             */
/* -------------------------------------------- */

/**
 * Helper class
 * Defines a throw by an array of Traits, some data and some throw options
 * Used by rollable Items and the DiceThrower
 */
 export default class M20eThrow {

  /**
   * @param  {[Trait,]} stats an array of {@link Trait} instances
   */
  constructor(stats, data = {}, options = {}) {
    this.stats = stats || [];
    this.data = foundry.utils.mergeObject(this.constructor.defaultData, data);
    this.options = foundry.utils.mergeObject(this.constructor.defaultOptions, options);
  }

  static get defaultData() {
    return {
      name: '',
      type: 'default',
      displayDescription: ''
    }
  }

  static get defaultOptions() {
    return {
      difficultyBase: 0, //game.settings.get("mage-fr", "difficultyBase"),
      difficultyMods: {
        throwMod: 0
      },
      dicePoolMods: {
        throwMod: 0
      },
      successMods: {
        throwMod: 0
      }
    }
  }

  /**
   * Returns a new M20eThrow instance from raw throwData
   * usually called from rollable item prepareData()
   * @param  {Object} obj {stats, data={}, options={}}
   * 
   * @returns {M20eThrow}
   */
  static fromData(obj) {
    let { stats = [], data = {}, options = {} } = obj;
    stats = stats.map(traitData => {
      return traitData instanceof Trait ? traitData : Trait.fromData(traitData);
    });
    return new M20eThrow(stats, data, options);
  }

  /**
   * Throw is magick only if it's a fully fledged magick effect or
   * if it's just an arete throw.
   * @param {[Trait,]} stats an array of Traits instances
   * 
   * @returns {Boolean}
   */
  static isMagickThrow(stats) {
    if (M20eThrow.isEffectThrow(stats)) {
      return true;
    } else {
      return stats.length === 1 && stats[0]?.path === "magick.arete";
    }
  }

  /**
   * A Magick Effect is defined by there being only 'spheres' in the throw
   * @param {[Trait,]} stats an array of Traits instances
   * 
   * @returns {Boolean} whether every Trait in the throw constitutes a magical effect
   */
  static isEffectThrow(stats) {
    return stats.length !== 0 && stats.every(stat => stat.category === "spheres");
  }

  /**
   * Magick Effect Level is the max value of a sphere traits in the throw
   * @param {[Trait,]} stats an array of Traits instances (theses must be extended with correct data)
   * 
   * @returns {Number} max level in the magick effect
   */
  static getThrowLevel(stats) {
    return stats.reduce((acc, cur) => (Math.max(acc, cur.value)), 0);
  }

  /**
   * Returns whether or not one of the stats uses Specialty (that's canUseSpec and actually uses spec ).
   * @param {[Trait,]} stats an array of Traits instances (theses must be extended with correct data).
   * 
   * @returns {Bolean} whether one of the stats uses Specialty.
   */
  static isSpecialtyRoll(stats) {
    return stats.some( stat => stat.useSpec);
  }

  isAbleToThrow(actor) {
    try {
      this.stats.forEach(stat => M20eThrow.validateStat(actor, stat, true));
    } catch (e) {
      if (e.msg) { //todo : maybe add error params
        ui.notifications.error(game.i18n.localize(`M20E.notifications.${e.msg}`));
      } else {
        ui.notifications.error(game.i18n.localize(`M20E.notifications.impossibleThrow`));
      }
      return false;
    }
    return true;
  }

  static validateStat(actor, stat, strict = true) { //strict only applies to untrained malus

    if (!stat || !(stat instanceof Trait)) { throw { msg: 'traitInvalid' }; } //when in doubt...
    const { category, subType } = stat.split();
    const statValue = actor._getStat(stat.path, 'value');

    if (category === 'spheres') {
      //cannot use a sphere in an effect if it's value null or not high enough
      if (!statValue) {
        throw { msg: 'insufficentSphereValue' };
      } else if (stat?.data?.valueOverride) { //in case of a rote
        if (statValue < stat.data.valueOverride) {
          throw { msg: 'insufficentSphereValue' };
        }
      }
    } else if (category === 'abilities' && !statValue) {
      //untrained ability subTypes might be forbidden in system settings
      const settings = game.settings.get("mage-fr", "untrainedMalus");
      //settings is 3 digit string => first char for talents, second char for skills and third char for knowledges
      const subTypes = { talents: 0, skills: 1, knowledges: 2 };
      const malus = settings.substr(subTypes[subType], 1);
      if (strict && isNaN(malus)) {
        throw { msg: 'insufficentAbilityValue' };
      }
    }
  }

  /**
   * Adds a new Trait to the stats array.
   * creates a new Trait instance if needed.
   * Limit the number of stats to 9.
   * TODO : validate stat ?
   * @param  {Trait|Object|null} stat a Trait instance or obj containing a path property or null
   * 
   * @returns {Trait|null} the newly added stat as a Trait instance.
   */
  addStat(stat) {
    if ( this.stats.length >= 9 ) { 
      //todo throw error or notif
      return null;
    }
    if ( !(stat instanceof Trait) ) {
      if ( stat?.path ) {
        //stat may contain some traitData,
        //try and make a Trait out of it
        stat = Trait.fromData(stat);
      }
      if ( !stat ) {
        //stat is not a trait, make it a default one
        stat = new Trait({path: 'attributes.stre'});
      }
    }
    this.stats.push(stat);
    return stat;
  }

  /**
   * Removes a stat at statIndex from the stats array
   * @param  {Number} statIndex
   * 
   * @returns {Boolean} true or false, whether the stat has been removed or not
   */
  removeStat(statIndex) {
    //check if index is within the range
    if ( statIndex >= this.stats.length ) { return false; }
    this.stats.splice(statIndex, 1);
    return true;
  }

  moveUpStat(statIndex) {
    //check if index is within the range (index cannot be 0, since 0 cant move up)
    if ( !statIndex || statIndex >= this.stats.length ) { return false; }
    
    [this.stats[statIndex-1], this.stats[statIndex]] = [this.stats[statIndex], this.stats[statIndex-1]];
    return true;
  }

  getMiniFlavor(actor) {
    const names = this.getStatsLocalizedNames(actor);
    if ( names.length <= 2 ) {
      return names.join(' + ');
    } else {
      return names.join(' + ').substring(0, 30) + "...";
    }
  }

  getStatsLocalizedNames(actor) {
    return this.stats.map( stat => stat.getLocalizedName(actor) );
  }

  //todo : create throw from string containing @paths & jsoned options (from element dataset)
  static fromElement(elem) {

  }

  //todo : create full element from data & options
  toElement() {
    return null;
  }

}
