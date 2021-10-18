// Import Helpers
import * as utils from '../utils.js'
import { log } from "../utils.js";
import Trait from '../trait.js'
import * as chat from "../chat-helpers.js";
import { ItemCreateDlg } from '../apps/item-create-dlg.js';

/**
 * Item class for base items (items that just contain data), 
 * also provides base functions for all derived item class
 * @extends {Item}
 */
export default class M20eItem extends Item {

  /**
   * creates a derived class for specific item types
   * @override 
   */
  constructor(data, context) {
    if (data.type in CONFIG.Item.documentClasses && !context?.isExtendedClass) {
      // instanciate our custom item subclass here
      return new CONFIG.Item.documentClasses[data.type](data, { ...{ isExtendedClass: true }, ...context });
    }
    //default behavior, just call super and do all the default Item inits.
    super(data, context);
  }

  /* -------------------------------------------- */
  /*  New Item Creation                           */
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
  //TODO : replace create dialog
  /**
     * Mostly vanilla function with support for subType selection
     * @override
     */
  /*
 static async createDialog(data={}, options={}) {
   debugger
  const documentName = this.metadata.name;
  const types = game.system.entityTypes[documentName];
  const folders = game.folders.filter(f => (f.data.type === documentName) && f.displayed);
  const label = game.i18n.localize(this.metadata.label);
  const title = game.i18n.localize('M20E.new.createItem');


  const itemCreate = new ItemCreateDlg(data, options);
  itemCreate.render(true);

}
*/

  /* -------------------------------------------- */

  /**
   * adds image path and systemDescription before sending the whole thing to the database
   * prompts for subType if that particular item type does require one,
   * in order to get the matching img and systemDesc.
   *  @override
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const itemData = this.data;

    //check if item is from existing item (going in or out a compendiumColl or drag from actorSheet)
    if (itemData.flags.core?.sourceId || itemData._id) { return; }

    //item is brand new => set some default values before sending it to the database
    const updateData = { data: {} };
    // prompt for subtype if relevant
    if (itemData.data.subType && !options.fromActorSheet) {
      const newSubType = await this.promptForSubType(itemData);
      updateData.data.subType = newSubType || itemData.data.subType;
    }
    //get specific type (subtype if any, otherwise base type)
    const specificType = updateData.data.subType || itemData.data.subType || itemData.type;
    //get appropriate default image
    updateData.img = CONFIG.M20E.defaultImg[specificType] || CONFIG.M20E.defaultImg[itemData.type] || CONFIG.M20E.defaultImg['default'];
    //get appropriate systemDescription
    if (itemData.data.systemDescription === '') {
      updateData.data.systemDescription = await utils.getDefaultDescription(specificType);
    }
    itemData.update(updateData);
  }

  /* -------------------------------------------- */

  /**
   * Prompts the user for a subType from dropDown list of available subtypes for this particular itemType
   * @param {ItemData} itemData an instance of ItemData
   * 
   * @returns {Promise<String|null>} selected subType or null if user escaped the prompt
   */
  async promptForSubType(itemData) {
    const itemType = itemData.type;
    //build list of subTypes to be fed to the promptSelect()
    const subTypes = Object.entries(
      foundry.utils.getProperty(CONFIG.M20E, `${itemType}SubTypes`))
      .map(([key, value]) => {
        return { value: key, name: game.i18n.localize(value) };
      });

    return utils.promptSelect({
      title: itemData.name,
      promptString: game.i18n.format('M20E.prompts.subTypeContent', {
        type: game.i18n.localize(`ITEM.Type${itemType.capitalize()}`)
      }),
      curValue: subTypes[0].key,
      options: subTypes
    });
  }

  /* -------------------------------------------- */
  /*  Item Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
    this.data.data.path = this.getPath();
    //check if item type is amongst protected types
    const protectedTypes = CONFIG.M20E.protectedCategories.reduce((acc, cur) => {
      const itemType = CONFIG.M20E.categoryToType[cur]
      return itemType ? [...acc, itemType] : acc;
    }, []);
    this.data.isProtectedType = protectedTypes.includes(this.type);
    //create restricted array from string
    if ( this.data.data.restrictions ) {
      this.data.data.restricted = this.data.data.restrictions.split(',').map( entry => entry.trim());
    }
  }

  /* -------------------------------------------- */

  /**
   * Computes and returns a valid trait path from itemData.
   * @returns path like "category.subType.key" or "category.key"
   */
  getPath() {
    const cat = CONFIG.M20E.traitToCat[this.data.type];
    const subType = CONFIG.M20E.traitToCat[this.data.data.subType];
    const key = utils.sanitize(this.data.name);
    return `${cat}.${subType ? subType + '.' : ''}${key}`;
  }

  /* -------------------------------------------- */

  /**
   * returns a pair {path, data} to populate the actor's stats in the _prepateItemStats()
   * @returns {Object}
   */
  getStatData() {
    const itemData = this.data;

    return {
      path: this.getPath(),
      name: itemData.name,
      statData: {
        value: parseInt(itemData.data.value),
        itemId: itemData._id
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * returns all necessary data to roll this stat.
   * called by actor.extendStats().
   * note : value could actually be fetched from either
   * itemData.data.value or itemData.data._overrideValue.
   * @param  {String} path
   */
  getExtendedTraitData(path) {
    const itemData = this.data;
    return {
      name: itemData.name,
      displayName: itemData.data.displayName ?? null,
      value: this.actor._getStat(path, 'value'),
      specialty: itemData.data.specialty ?? null
    };
  }

  /* -------------------------------------------- */

  /**
   * Returns a Trait instance from item's constructed path and itemId
   * @returns {Trait}
   */
  toTrait() {
    const itemData = this.data;
    return new Trait({ path: this.getPath(), itemId: this.data._id });
  }

  /* -------------------------------------------- */

  /**
   * called at the end of actor._prepareData to deal with owned items whose data depend on the actor.
   * Implemented in subClasses
   */
  _prepareOwnedItem() {
    //to be overridden
  }

  /* -------------------------------------------- */

  /**
   * Displays an item trait in chat.
   * Prepares some templateData before feeding the to chat.displayCard
   * overridden in subclasses
   * atm only for stat items (ie not events, misc etc)
  */
  linkInChat() {
    const itemData = this.data;

    if ( !this.isStat ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.notImplemented'));
      return;
    }

    const templateData = {
      category: CONFIG.M20E.traitToCat[itemData.type],
      subType: CONFIG.M20E.traitToCat[itemData.data.subType],
      key: utils.sanitize(itemData.name),
      itemId: itemData._id
    };
    templateData.path = `${templateData.category}.${templateData.subType ?
      templateData.subType + '.' : ''}${templateData.key}`;

    //build the trait's data
    templateData.traitData = {
      type: game.i18n.localize(`M20E.category.${templateData.category}`),
      name: itemData.name,
      img: itemData.img,
      data: itemData.data
    };

    //display the card
    chat.displayCard(this.actor, templateData);
  }

  /* -------------------------------------------- */
  /*  Shorthands                                  */
  /* -------------------------------------------- */

  get isRollable() {
    return this.data.data.isRollable === true;
  }

  get isStat() {
    return this.data.data.isStat === true;
  }

  get isActive() { // todo : not sure atm
    return this.data.data.isActive === true;
  }

  get isEquipable() {
    return this.data.data.isEquipable === true;
  }

  /**
   * To be considered unequipped, item needs to be an equipable first !
   */
  get isUnequipped() {
    return this.isEquipable && this.data.data.equipped === false;
  }
}

