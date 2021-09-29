import { Trait } from './dice.js'

export default class BaseThrow {

  constructor(data={}, options={}) {
    this.name = data.name;
    this.type = data.type || 'default';
    this.stats = data.stats || [];
    this.description = data.description || '';

    this.options = foundry.utils.mergeObject(this.constructor.defaultOptions, options);
    //todo add throwMode & rollMode ?? or not ? they might just be in options
  }

  static get defaultOptions() {
    return {
      difficultyBase: game.settings.get("mage-fr", "difficultyBase"),
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
   * Throw is magick only if it's a fully fledged magick effect or
   * if it's just an arete throw.
   * @param {[Trait,]} stats an array of Traits instances
   * 
   * @returns {Boolean}
   */
  static isMagickThrow(stats) {
    if ( BaseThrow.isEffectThrow(stats) ) {
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
    return stats.length !== 0 && stats.every( stat => stat.category === "spheres" );
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

  isAbleToThrow(actor) {
    try {
      this.stats.forEach( stat => M20eThrow.validateStat(actor, stat, true));
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

  static validateStat(actor, stat, strict=true) { //strict only applies to untrained malus

    if ( !stat || !stat instanceof Trait ) { throw { msg: 'traitInvalid' }; } //when in doubt...
    const { category, subType } = stat.split();
    const statValue = actor._getStat(stat.path, 'value');

    if (category === 'spheres') {
      //cannot use a sphere in an effect if it's value null or not high enough
      if ( !statValue ) {
        throw { msg: 'insufficentStatValue' };
      } else if (stat?.data?.valueOverride) { //in case of a rote
        if ( statValue < stat.data.valueOverride) {
          throw { msg: 'insufficentStatValue' };
        }
      }
    } else if ( category === 'abilities' && !statValue ) {
      //untrained ability subTypes might be forbidden in system settings
      const settings = game.settings.get("mage-fr", "untrainedMalus");
      //settings is 3 digit string => first char for talents, second char for skills and third char for knowledges
      const subTypes = { talents: 0, skills: 1, knowledges: 2 };
      const malus = settings.substr(subTypes[subType], 1);
      if (strict && isNaN(malus)) {
        throw { msg: 'insufficentStatValue' };
      }
    }
  }

    //todo : flavor ?
  /*getFlavor(actor) {
    let flavor = '';
    if ( actor ) {
      flavor = this.traits.map(trait => {
        const {name, displayName} = actor.getExtendedTraitData(trait);
        return displayName || name;
      }).join(' + ');
    } else {
      flavor = this.traits.map(trait => 
      `${foundry.utils.getProperty(CONFIG.M20E.traits, trait.path)}`
      ).join(' + ');
    }
    const thresholdBase = this.options.thresholdBase || game.settings.get("mage-fr", "baseRollThreshold");
    const thresholdMod = this.options.thresholdMod || 0;
    const thresholdTotal = parseInt(thresholdBase) + parseInt(thresholdMod);
    return `(${flavor} ${game.i18n.localize('M20E.labels.thrsh')}${thresholdTotal})`;
  }*/
  //todo : create throw from string containing @paths & jsoned options (from element dataset)
  static fromElement(elem) {

  }
  //todo : create full element from data & options
  toElement() {
    return null;
  }

}