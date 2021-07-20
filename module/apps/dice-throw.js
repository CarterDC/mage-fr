// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, ExtendedTrait } from "../utils/classes.js";

/**
 * 
 * 
 */
export class DiceThrow {

  /** @override */
  constructor(args) {
    const {document=null, traitsToRoll=[], throwOptions={}, options={}} = args;
    if ( !document ) { return; }

    this._app = null;
    this.document = document;
    //todo : make this document type agnostic (isEmbedded ?)
    this.actor = document;
    this.xTraitsToRoll = this.extendTraits(traitsToRoll);

    this.dicePoolBase = throwOptions.dicePoolBase || 0;
    this.dicePoolMods = {
      userMod: throwOptions.dicePoolMod || 0,
    };
    this.thresholdBase = game.settings.get("mage-fr", "baseRollThreshold");
    this.thresholdMods = {
      userMod: throwOptions.thresholdMod || 0,
    };

    this.throwSettings = throwOptions.throwSettings || game.settings.get("mage-fr", "defaultThrowSettings");

    this.successMod = throwOptions.successes || 0;
    this.isExtendedRoll = throwOptions.successes > 0;
  }

  get app() {
    //todo add game setting to prevent players from editing their throws
    if ( !this._app ) {
      const cls = CONFIG.M20E.diceThrowApp;
      this._app = new cls (this, {
        editable: game.user.isGM || true 
      });
    }
    return this._app;
  }

  render(force=false) {
    this.app.render(force);
  }

  /**
   * Extends an array of {@link Trait} with relevant values to Throw dices
   * dispatch calls according to wether each Trait references an item or an actor property
   * @return {Array} an array of {@link ExtendedTrait} 
   */
  extendTraits(traitsToRoll) {
    return traitsToRoll.map(trait => {
      const extendedData = trait.isItem ?
        this.actor.items.get(trait.itemId).getExtendedTraitData() :
        this.actor.getExtendedTraitData(trait);
      
      return new ExtendedTrait({trait, ...extendedData});
    });
  }
}