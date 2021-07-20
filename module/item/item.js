// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";


/**
 * Implements M20eItem as an extension of the Item class
 * Adds new methods for all items and for specific item types.
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /** @override */
  constructor(data, context) {
    //useless in the present case but cool
    //creates a derived class for specific item types
    if ( data.type in CONFIG.Item.documentClasses && !context?.isExtendedClass) {
        // specify our custom item subclass here
        // when the constructor for the new class will call it's super(),
        // the isExtendedClass flag will be true, thus bypassing this whole process
        // and resume default behavior
        return new CONFIG.Item.documentClasses[data.type](data,{...{isExtendedClass: true}, ...context});
    }    
    //default behavior, just call super and do random item inits.
    super(data, context);
  }

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const itemData = this.data;
    //get specific type (subtype if any otherwise base type)
    const specificType = itemData.data.subType || itemData.type;

    const updateData = {data: {}};
    //deal with default image
    updateData.img = CONFIG.M20E.defaultImg[specificType] || CONFIG.M20E.defaultImg[itemData.type] || CONFIG.M20E.defaultImg['default'];
    //deal with systemDescription
    if ( itemData.data.systemDescription === '') {
      updateData.data.systemDescription = await utils.getDefaultDescription(specificType);
    }
    itemData.update( updateData );
  }

  getExtendedTraitData() {
    //todo : add check for virtualTrait and or RollableItems
    return {
      name: this.name,
      displayName: this.data.data.displayName,
      value: this.data.data.value,
      specName:  this.data.data.specialisation
    }
  }
}

