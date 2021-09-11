// Import Applications
import { FakeItem } from '../apps/fakeitem-sheet.js'
import DiceThrow from '../dice/dice-throw.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, PromptData, DynaCtx } from "../utils/classes.js";
import * as chat from "../chat.js";

/**
 * Provides Sheet interraction management for npcsleepers type actors
 * also base sheet class for all other actor sheets.
 * @extends {ActorSheet}
 */
export default class M20eActorSheet extends ActorSheet {

  /** @override */
  constructor(...args) {
    super(...args);
    //create the 'locks' object like {attributes: true, abilities: true, ...} from an array of categories
    this.locks = CONFIG.M20E.lockedCategories.reduce((acc, cur) =>
      ({...acc, [cur]: true}),{});
    
    //add the paradigm css class if any to the default options.
    const paraItem = this.actor.paradigm;
    if ( paraItem ) {
      this.options.classes.push(paraItem.data.data.cssClass);
    }
  }

  /**
   * adds a default dragDrop (on top of the vanilla default one)
   * for any element that could be dragged to the macro hotbar
   *  @override
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'actor'],
      width: 500,
      height: 700,//todo : setmin width & min heigth in css for the whole app
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'traits' }],
      dragDrop: [{ dragSelector: ".macro-ready" }]
    })
  }

  /**
   * overridden by extended actorSheet classes that use a different template
   * @override
   */
    get template() {
    return 'systems/mage-fr/templates/actor/actor-sheet.hbs';
  }

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    //sheetData.data is a standard js Object created from the actor's PREPARED data
    const actorData = sheetData.data; 
    sheetData.data = actorData.data; //shorthand for convenience to avoid 'data.data' all the time

    //pre-digest some data to be usable by handlbars (avoid some helpers)
    sheetData.resources = {};
    sheetData.resources.health = this.getResourceData('health');
    sheetData.resources.willpower = this.getResourceData('willpower');

    //dispatch items into categories and subtypes
    //sheetData.items is already sorted on item.sort in the super
    //todo : maybe don't put all the categories inside sheetData.items ?
    //Abilities
    sheetData.items.abilities = {};
    sheetData.items.abilities.talents = sheetData.items.filter((item) => ( (item.type === "ability") && (item.data.subType === "talent") ));
    sheetData.items.abilities.skills = sheetData.items.filter((item) => ( (item.type === "ability") && (item.data.subType === "skill") ));
    sheetData.items.abilities.knowledges = sheetData.items.filter((item) => ( (item.type === "ability") && (item.data.subType === "knowledge") ));
    //merits and flaws
    sheetData.items.meritsflaws = {};
    sheetData.items.meritsflaws.merits = sheetData.items.filter((item) => ( (item.type === "meritflaw") && (item.data.subType === "merit") ));
    sheetData.items.meritsflaws.flaws = sheetData.items.filter((item) => ( (item.type === "meritflaw") && (item.data.subType === "flaw") ));
    //the rest of the items
    sheetData.items.backgrounds = sheetData.items.filter((item) => item.type === "background");
    sheetData.items.events = sheetData.items.filter((item) => item.type === "event");
    //gear & other possessions
    sheetData.items.equipables = sheetData.items.filter((item) => item.data.isEquipable === true);
    sheetData.items.miscs = sheetData.items.filter((item) => ( item.type === 'misc' && item.data.isEquipable === false ));
    //todo : sort equipables according to type and isEquiped ?
    //todo : sort misc according to isConsumable ?

    //other usefull data
    sheetData.isGM = game.user.isGM;
    sheetData.config = CONFIG.M20E;
    sheetData.locks = this.locks;
    
    const paradigm = this.actor.paradigm;
    if( paradigm ) {
      sheetData.paraData = paradigm.data.data;
    }
    sheetData.dsnUserActive = utils.dsnUserActive();

    return sheetData;
  }

  /** @override */
  activateListeners(html) {

    //disable buttons/inputs given their 'protection status'
    if ( this.actor.data.data.creationDone && !game.user.isGM ) {
      this._protectElements(html);
    }
    //actions for everyone

    //editable only (roughly equals 'isOwner')
    if ( this.isEditable ) {
      //dice throwing
      html.find('.dice-button').click(this._onDiceClick.bind(this));
      //highlighting of traits
      html.find('a.trait-label').click(this._onTraitLabelClick.bind(this));
      //every interraction with a button (except for the dice-button)
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      //left & right clicks on resource boxes
      html.find('.resource-panel .box[data-clickable="true"]').mousedown(this._onResourceBoxClick.bind(this));
      //edition of item value when cat is unlocked
      html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
      //click on the 'i' buttons (blue or grey)
      html.find('.entity-link').click(this._onEntityLinkClick.bind(this));
      //ctx menu on the character name (paradigm edition...)
      new ContextMenu(html, '.header-row.charname', this._getNameContextOptions());
      //ctx menu on traits (edition / link)
      new ContextMenu(html, '.trait', this._getTraitContextOptions());
      //ctx menu for current xp field
      new ContextMenu(html, '.currXP', this._getXPContextOptions());
      //ctx menu for rollable items
      new DynaCtx(html, '.trait[data-rollable="true"]', (traitElem) => this._getRollableContextOptions(traitElem));
      //html.find('.vertical-wrapper[data-rollable="true"]').mousedown(this._onRollableClick.bind(this));
    }
    
    if ( game.user.isGM ) {
      new ContextMenu(html, '.resource-context', this._getResourceContextOptions());
    }

    //testing shit here :
    //html.on('dragover','section', this._onDragOver.bind(this));
    
    super.activateListeners(html);
  }

  /**
   * 'disables' some elements (input/buttons) for actors whose creation phase is over.
   * a bit similar to Foundry's disableFields
   * @param {HTMLElement} html sheet.element
   */
   _protectElements(html) {
    CONFIG.M20E.protectedCategories.forEach( category => {
      const elements = html.find(`.category.${category} input, .category.${category} .mini-button` );
      for ( let el of elements) {
        if ( el.name?.includes('value') || el.classList?.contains('inline-edit')) {
          el.setAttribute("disabled", "");
        } else if ( el.dataset?.action === 'add' || el.dataset?.action === 'remove' ) {
          el.dataset.disabled = true;
        }
      }
    });
  }

  /**
   * Returns an Array with pre-digested data for direct use by handlebars in order to renders some helpers superfluous
   * Populates the array with the relevant number of entries like {state: '', title: ''},
   * based on resource properties (max, bashing, lethal and aggravated)
   * 
   * @returns {Array} [{state:'', title:''},]
   */
  getResourceData(resourceName) {
    const rez = this.actor.data.data.resources[resourceName];

    return [...Array(rez.max)].map((element, index) => {
      const state = (rez.max - rez.aggravated) > index ? 'aggravated' : 
        ( (rez.max - rez.lethal) > index ? 'lethal' : 
          ( (rez.max - rez.bashing) > index ? 'bashing' : '' ));
      const title = state !== '' ? game.i18n.localize(`M20E.wounds.${state}`) : '';
      return {state: state, title: title};
    });
  }

  /* -------------------------------------------- */
  /*  Event Handlers & Context Menus Callbacks    */
  /* -------------------------------------------- */

  /**
  * Locks/Unlocks a category for edition - Only one cat is open a a time
  * opening a category, closes all the other ones (cleaner that way)
  * Adds a dragDrop upon unlocking a cat / removes it when locking
  * 
  * @param {string} category  the category to toggle
  */
   _toggleCategoryLock(category) {
    if ( this.locks[category] === false ) {
      //category' open atm, close it
      this.locks[category] = true;
      //remove the current drag n drop for this category if needed
      if ( CONFIG.M20E.dragDropCategories.includes(category) ) {
        this._dragDrop.pop();
      }
    } else {
      //category's closed atm, close any other remaining open category (and remove dragDrop)
      for ( const [cat, locked] of Object.entries(this.locks) ) {
        if ( !locked ) {
          this.locks[cat] = true;
          if ( CONFIG.M20E.dragDropCategories.includes(cat) ) {
            this._dragDrop.pop();
          }
        }
      }
      //open cat, create its dragDrop and add it to the sheets array
      this.locks[category] = false;
      if ( CONFIG.M20E.dragDropCategories.includes(category) ) {
        const itemType = CONFIG.M20E.categoryToType[category];
        const newDragDrop = new DragDrop({
          dragSelector:`.${itemType} .trait-label`,
          dropSelector:`.${itemType} .trait-label`,
          callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDrop.bind(this) }
        })
        this._dragDrop.push(newDragDrop);
      }
    }
    //in any case, render to enact the changes to locks & dragDrop state
    this.render();
  }

  /**
   * Expands and Collapses descriptions for certain items
   * collapse previously expanded description element before expanding a new one
   * just toggle dataset.expanded and let the css do the rest
   * 
   * @param  {Element} buttonElem the mini-button that triggered the event
   */
   _expandDescription(buttonElem) {
    const desc = buttonElem.closest('.one-liner-desc');
    if ( desc.dataset.expanded === 'true' ) {
      //only one expanded and we clicked on it, collapse it
      desc.dataset.expanded = false;
    } else {
      //collapses the expanded one (shouldn't be more than one actually)
      const expandedOne = $(this.buttonElem).find('.one-liner-desc[data-expanded ="true"]');
      if ( expandedOne.length !== 0 ) {
        expandedOne[0].dataset.expanded = false;
      }
      //then expand the one we just clicked
      desc.dataset.expanded = true;
    }
  }

  /**
  *  @override
  * added validation against dtype and min max before updating
  * re-renders the sheet to display the previous value if update is invalid
  * note: though data are validated against dtype by foundry,
  * updating a number with a string would leave the input blank
  */
  async _onChangeInput(event) {
    const element = event.target;
    if ( ! utils.isValidUpdate(element) ) {
      event.preventDefault();
      return this.render();
    }
    super._onChangeInput(event);
  }

  /**
  * Toggles the active state of a trait element when it's label has been clicked.
  * traits with a dataset.active === true are picked up when rolling dice
  * any render of the sheet resets the active state to false (which is desired behavior)
  * 
  * @param {object} event the event that triggered (from a click on 'a.trait-label')
  */
   _onTraitLabelClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const traitElem = element.closest(".trait");
    //just toggle the active status
    const toggle = (traitElem.dataset.active === 'true');
    traitElem.dataset.active = !toggle;
  }

  /**
   * On a click on the big dice, round up every highlighted trait on the sheet
   * send it to a new DiceThrow object and either render it for further options or
   * just throw the dice
   * 
   * @param  {} event
   */
  _onDiceClick(event) {
    //retrieve traits to roll
    const traitsToRoll = this.getTraitsToRoll();
    const diceThrow = new DiceThrow({
      document: this.actor,
      traitsToRoll: traitsToRoll
    });
    if ( event.shiftKey ) {
      //throw right away
      diceThrow.throwDice();
    } else {
      //display dice throw dialog
      diceThrow.render(true);
    }
  }

  /**
  * Check all rollable categories for highlighted elements (ie data-active="true")
  * return said elements as Trait objects for later consumption by Throw app.
  * also toggle the active status of highlighted elements after we got them
  * 
  * @return {Array} an Array of Traits objects that correspond to the previously highlighted elements
  */
   getTraitsToRoll() { 
    //overly complicated statement that could be easily understood if coded with twice the lines
    return CONFIG.M20E.rollableCategories.reduce((acc, cur) => {
      const elementList = $(this.element).find('.trait.' + cur + '[data-active ="true"]');
      return elementList.length === 0 ? acc : 
        [...acc, ...elementList.toArray().map(traitElem => {
          traitElem.dataset.active = false;
          return Trait.fromElement(traitElem);
        })];
    }, []);
  }

  /**
  * Dispatches clicks on resource panel boxes acording to resource type and mouse button press
  * 
  * @param {object} event the mousedown-event that triggered (from div '.box')
  */
  _onResourceBoxClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const index = parseInt(element.dataset.index);
    const resourceName = element.closest('.resource-panel').dataset.resource;
    
    switch ( event.which ) {
      case 1://left button
        this.actor.addWound(resourceName, index);
        break;
      case 3://right button
        this.actor.removeWound(resourceName, index);
        break;
    }
  }

  /**
  * Updates an owned item's data.value from within the character sheet.
  * validates input value against dtype min max before updating
  * 
  * @param {object} event the event that triggered (from an input '.inline-input')
  */
  async _onInlineEditChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const inputElem = event.currentTarget;
    if ( ! utils.isValidUpdate(inputElem) ) {
      return this.render();
    }
    //value has been validated => update the item
    const updatePath = inputElem.dataset.updatePath || 'data.value';
    const updateValue = inputElem.value;
    const itemId = inputElem.closest(".trait").dataset.itemId;
    const item = this.actor.items.get(itemId);
    return await item.update({[`${updatePath}`]: updateValue});
  }

  /**
   * Intercepts a click on an entity link before it's processed by vanilla sheet
   * displays a warning upon clicking an empty link and prevents vanilla behavior
   * triggers the creation of personnal JE upon clicking an empty link for that specific one
   */
  _onEntityLinkClick(event){
    const linkElem = event.currentTarget;
    const dataset = linkElem.dataset;
    const id = dataset.id;
    if ( !id ) {
      event.preventDefault();
      event.stopPropagation();
      if ( linkElem.classList.contains('personnal-je') && game.user.isGM) {
        this._createPersonnalJE();
      } else {
        ui.notifications.warn(game.i18n.localize(`M20E.notifications.noJournal`));
      }
    }
  }

  /**
  * Dispatches mini-buttons clicks according to their dataset.action
  * 
  * @param {object} event the event that triggered (from div '.mini-button')
  */
  _onMiniButtonClick(event) {
    event.preventDefault();
    const buttonElem = event.currentTarget;
    const dataset = buttonElem.dataset;

    //check if action is allowed before going any further
    if ( dataset.disabled ) {
      ui.notifications.warn(game.i18n.localize('M20E.notifications.notOutsideCreation'));
      return;
    }

    switch ( dataset.action ) {
      case 'lock': //deal with locks & dragDrop
        this._toggleCategoryLock(dataset.category);
        break;
      
      case 'add':
        //itemType can end up being a list of avail types for the category
        const itemType = CONFIG.M20E.categoryToType[dataset.category];
        const itemSubtype = CONFIG.M20E.categoryToType[dataset.subCategory];
        this._addEmbedded(itemType, itemSubtype);
        break;
      
      case 'edit': //edit regular or virtual Trait (item)
        this._editTrait(Trait.fromElement(buttonElem));
        break;
      
      case 'remove'://rename for embedded
        this._removeEmbedded(Trait.fromElement(buttonElem));
        break;
      
      case 'roll-item':
        const rollItemId = buttonElem.closest(".trait").dataset.itemId;
        const rollItem = this.actor.items.get(rollItemId);
        rollItem.roll(event.shiftKey); //throwIndex is 0 by default
        break;
      
      case 'expand':
        this._expandDescription(buttonElem);
        break;

      case 'check':
        //updates the disabled value of an active affect
        this._toggleEmbeddedProperty(Trait.fromElement(buttonElem), dataset.updatePath);
        break;

      case 'plus':
      case 'minus':
        const mod = dataset.action === 'minus' ? -1 : 1;
        this._modEmbeddedProperty(Trait.fromElement(buttonElem), dataset.updatePath, mod);
      default:
    }
  }

  /**
  * Called in response to a contextMenu click on a resource label
  * prompts user for a new value (max health, maxwillpower or health malus)
  * validates and updates accordingly
  * 
  * @param {object} { relativePath, currentValue, name }
  *                  prepared in the context menu callback
  */
   async _editResource({ relativePath, currentValue, name }) {
    const promptData = new PromptData({
      title: game.i18n.format(`M20E.prompts.editTitle`, {name : name}),
      name: name,
      currentValue : currentValue
    });
    //enrich the prompData
    if ( utils.isNumeric(currentValue) ) {
      promptData.min = 0;
      promptData.max = 10;
    }

    //prompt for new value
    const inputElem = await utils.promptNewValue(promptData);
    //validate before updating
    if ( utils.isValidUpdate(inputElem) ) {
      const newValue = isNaN(currentValue) ? inputElem.value : parseInt(inputElem.value);
      //only update if it's actually a different value
      if ( newValue !== currentValue ) {
        await this.actor.safeUpdateProperty(relativePath, newValue);
      }
    }
  }

  /**
  * Called in response to a contextMenu click on a '.trait'
  * prepares real or 'fake' item data to be displayed in a chat message
  * TODO : change template to use itemData instead of 'item'
  * @param {Trait} trait  the Trait to be displayed in chat
  */
  async _linkInChat(trait) {
    const {category, itemId, key } = trait.split();
    let item = {};

    if ( itemId ) {
      //trait is actually a real item
      //todo : let the item do it's own shit !
      item = this.actor.items.get(itemId);
    } else {
      //trait is an attribute or sphere, build 'fake' itemData 
      
      //retrieve attribute (or sphere) name from paradigm item's lexicon if any
      const lexiconEntry = this.actor.getLexiconEntry(`traits.${trait.path}`);
      //get systemDescription from compendium given category and key
      const sysDesc = await utils.getSystemDescription(category, key);
      //build our fake item
      item = {
        type: game.i18n.localize(`M20E.category.${category}`),
        name: game.i18n.localize(`M20E.traits.${trait.path}`),
        data: {
          data: foundry.utils.getProperty(this.actor.data.data.traits, `${trait.path}`)
        }
      };
      item.data.data.displayName = lexiconEntry || '';
      item.data.data.systemDescription = sysDesc;
    }
    //display the card whether trait is a real item or 'fake' one
    chat.displayCard(this.actor, {
      category : category,
      itemId: itemId,
      key: key,
      item: item
    });
  }

  /**
  * Removes link parameters from a specific trait (actually only used on bio traits)
  * Called in response to a contextMenu click on a '.trait' that has an active link
  * 
  * @param {Trait} trait  the Trait the link should be removed from
  */
  async _removeJELink(trait){
     //prepare the update object
    let updateObj = {};
    const relativePath = `data.${trait.path}.link`;
    updateObj[`${relativePath}.-=type`] = null;
    updateObj[`${relativePath}.-=pack`] = null;
    updateObj[`${relativePath}.-=id`] = null;

    return this.actor.update(updateObj);
  }

  /**
  * Create a new Journal Entry and link it to the actor.
  * new journal is created with same permissions as the actor.
  * so any player owner the the actor is also owner of the journal.
  * Needs GM permission level in order to create
  */
  async _createPersonnalJE() {
    if ( !game.user.isGM ) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.gmPermissionNeeded`));
      return;
    }
    if ( !this.actor.hasPlayerOwner ) {
      const confirmation = await Dialog.confirm({
        options: {classes: ['dialog', 'm20e']},
        title: `${game.i18n.localize('DOCUMENT.JournalEntry')} : ${this.actor.name}`,
        content: game.i18n.format("M20E.prompts.actorHasNoOwner", {name: this.actor.name}),
        rejectClose: false
      });
      if ( !confirmation ) { return; }
    }
    //create the Journal (creates a folder if needed)
    const personnalJE = await utils.createPersonnalJE(this.actor, { renderSheet: true });
    //update the actor with Journal Id
    this.actor.update({[`data.link`]: {type:'JournalEntry', pack: '', id: personnalJE.id}});
    ui.notifications.info(game.i18n.format(`M20E.notifications.journalLinked`,{name: this.actor.name}));
  }

  /**
  * Call for the display of a sheet to edit a trait
  * trait can either be an item (=> display it's item.sheet) or 
  * an ActiveEffect (=> display it's ActiveEffectConfig)
  * an actor template property (=> display a 'fakeitem' sheet)
  * 
  * @param {Trait} trait  the Trait to be edited
  */
  _editTrait(trait) {
    const {category, itemId, key } = trait.split();
    if ( itemId ) {
      if ( category === 'aeffects' ) {
        //item is in fact an activeEffect
        const effect = this.actor.effects.get(itemId);
        effect.sheet.render(true);
      } else {
        //regular item edit
        const item = this.actor.items.get(itemId);
        item.sheet.render(true);
      }
    } else {
      //use a fakeItem dialog to edit attribute (or sphere)
      this._editFakeItem(category, key);
    }
  }

  /**
  * Prompts user for a name for the new embedded document
  * either create a new embeddedItem or and ActiveEffect according to 'itemType'
  * 
  * @param {string} itemType type of the item to be created
  * @param {string} itemSubtype subType if any
  */
  async _addEmbedded(itemType, itemSubtype = null) {
    if ( !itemType ) { return; }

    //prepare the promptData => prompt for the name of the item-to-be
    const placeHodlderName = itemSubtype ?
      game.i18n.localize(`M20E.new.${itemType}.${itemSubtype}`) :
      game.i18n.localize(`M20E.new.${itemType}`);

    const promptData = new PromptData({
      title: game.i18n.localize(`M20E.prompts.addItemTitle`),
      placeHolder: placeHodlderName,
      promptContent : game.i18n.format(`M20E.prompts.addItemContent`, {name: placeHodlderName})
    });
    if ( !game.user.isGM ) {
      //adds a warning about name editing
      promptData._promptContent += game.i18n.localize(`M20E.prompts.addItemWarning`);
    }

    const inputElem = await utils.promptNewValue(promptData);
    const name = inputElem?.value;
    if ( !name ) { return; }
    //special case of activeeffects
    if ( itemType === 'ActiveEffect' ) { return this._addEmbeddedEffect(name);}

    //validate name against all names in same itemType
    const duplicates = this.actor.items.filter(function (item) {
       return (item.type === itemType) && (item.name === name) 
    });
    if ( duplicates.length ) {
      ui.notifications.error(game.i18n.format(`M20E.notifications.duplicateName`, {name: name}));
      return;
    }
    //item got a valid name, create it's data
    const itemData = {name: name, type: itemType};
    if ( itemSubtype) {
      itemData.data = {subType: itemSubtype};
    }
    //send the itemData to be created on the actor
    //and let the item._preCreate() deal with the specifics
    this.actor.createEmbeddedDocuments('Item', [itemData], {renderSheet: true, fromActorSheet: true });
  }

  _addEmbeddedItem() {

  }

  _addEmbeddedEffect(name) {
    const effectData = {
      label: name,
      icon: CONFIG.M20E.defaultImg['ActiveEffect'],
      origin: 'added-manually'
    };
    this.actor.createEmbeddedDocuments('ActiveEffect', [effectData], {renderSheet: true});
  }

  /**
  * Prompts user for confirmation before deleting the item/AEffect from this.actor embedded collection
   * 
  * @param {Trait} trait a trait containing the category and the itemId of the embedded doc to be deleted
  */
  async _removeEmbedded(trait) {
    const {category, itemId, key } = trait.split();
    const embedded = category === 'aeffects' ? this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    if ( !embedded ) { return; }

    const name = category === 'aeffects' ? embedded.label : embedded.name;
    const confirmation = await Dialog.confirm({
      options: {classes: ['dialog', 'm20e']},
      title: game.i18n.format("M20E.prompts.deleteTitle", {name: name}),
      content: game.i18n.format("M20E.prompts.deleteContent", {name: name})
    });
    if ( confirmation ) {
      if ( category === 'aeffects' ) { 
        this.actor.deleteEmbeddedDocuments('ActiveEffect', [embedded.id]);
      } else {
        this.actor.deleteEmbeddedDocuments('Item', [embedded.id]);
      }
    }
  }

  async _toggleEmbeddedProperty(trait, editPath) {
    const {category, itemId, key } = trait.split();
    const embeddedDoc = category === 'aeffects' ? 
      this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    const currValue = foundry.utils.getProperty(embeddedDoc.data, editPath);
    return await embeddedDoc.update({[`${editPath}`]: !currValue});
  }

  async _modEmbeddedProperty(trait, editPath, mod) {
    const {category, itemId, key } = trait.split();
    const embeddedDoc = category === 'aeffects' ? 
      this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    const currValue = foundry.utils.getProperty(embeddedDoc.data, editPath);
    return await embeddedDoc.update({[`${editPath}`]: currValue + mod});
  }

  /**
  * Displays a "fake item-sheet" from actor's attributes or spheres
  * Enables edition of misc values : paradigmic name (actually stored in the lexicon),
  * specialisation and description, along with main value.
  * also displays the associated systemDescription sourced from matching compendium.
  * 
  * @param {String} category  actor's property name either "attributes" or "spheres"
  * @param {String} key       category's propertyName (ie: 'stre', 'forc', 'spir' ...)
  */
  async _editFakeItem(category, key) {
    //retrieve attribute (or sphere) name from paradigm item's lexicon if any
    const lexiconEntry = this.actor.getLexiconEntry(`traits.${category}.${key}`);
    //get systemDescription from compendium or localization given category and key
    const sysDesc = await utils.getSystemDescription(category, key);
    
    const itemData = {
      category: category,
      key: key,
      relativePath: `traits.${category}.${key}`,
      type: game.i18n.localize(`M20E.category.${category}`),
      lexiconName: lexiconEntry || '',
      placeholderName : game.i18n.localize(`M20E.traits.${category}.${key}`),
      systemDescription: sysDesc
    }
    //display fake sheet
    const fakeItem = new FakeItem(this.actor, itemData);
    fakeItem.render(true);
  }

  async addXP() {
    const promptData = new PromptData({
      title: this.actor.name,
      promptContent: game.i18n.format('M20E.prompts.addXPContent', {name: this.actor.name}),
      placeHolder: 0
    });
    //prompt for new value
    const inputElem = await utils.promptNewValue(promptData);

    //only update if valid xpGain
    if ( inputElem === null ) { return; } //promptDialog was escaped
    //TODO : put that in actor !!
    const xpGain = parseInt(inputElem.value);
    if ( xpGain > 0 ) {
      //update both currentXP and totalXP (total is just a reminder of all the xp gains)
      const updateObj = {};
      updateObj[`data.currentXP`] = this.actor.data.data.currentXP + xpGain;
      updateObj[`data.totalXP`] = this.actor.data.data.totalXP + xpGain;
      await this.actor.update(updateObj);
    }
  }

  async removeXP() {
    const promptData = new PromptData({
      title: this.actor.name,
      promptContent: game.i18n.format('M20E.prompts.removeXPContent', {name: this.actor.name}),
      placeHolder: 0
    });
    //prompt for new value
    const inputElem = await utils.promptNewValue(promptData);

    //only update if valid xpLoss
    if ( inputElem === null ) { return; } //promptDialog was escaped
    //TODO : put that in actor !!
    const xpLoss = parseInt(inputElem.value);
    if ( xpLoss > 0 ) {
      //only update currentXP and ensure we don't go into negative xp values
      const newValue = Math.max(this.actor.data.data.currentXP - xpLoss, 0);
      await this.actor.update({[`data.currentXP`]: newValue});
    }
  }

  /* -------------------------------------------- */
  /*  Context Menus                               */
  /* -------------------------------------------- */

  /**
   * @return the context menu options for the '.header-row.charname' element
   * atm only paradigm item stuff
   */
   _getNameContextOptions() {
    return [
      {
        name: game.i18n.localize('M20E.context.editParadigm'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: () => {
          const paradigm = this.actor.paradigm;
          paradigm.sheet.render(true);
        },
        condition: () => {
          return this.actor.paradigm; 
        }
      },
      {
        name: game.i18n.localize('M20E.context.removeParadigm'),
        icon: '<i class="fas fa-trash"></i>',
        callback: () => {
          const paradigm = this.actor.paradigm;
          this._removeEmbedded(paradigm);
        },
        condition: () => {
          return this.actor.paradigm; 
        }
      }
    ]
  }

  /**
   * @return the context menu options for the '.trait' elements
   * link trait in chat, edit trait, remove JE link from trait that have one
   */
  _getTraitContextOptions() {
    return [
      {//link actor trait or item in chat
        name: game.i18n.localize('M20E.context.linkInChat'),
        icon: '<i class="fas fa-share"></i>',
        callback: element => {
          this._linkInChat(Trait.fromElement(element[0]));
        },
        condition: element => {
          return element[0].classList.contains('linkable');
        }
      },
      {//edit actor trait in fakeitem sheet or edit item (in itemSheet)
        name: game.i18n.localize('M20E.context.editTrait'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: element => {
          this._editTrait(Trait.fromElement(element[0]));
        },//todo : maybe find different condition ?
        condition: element => {
          return element[0].classList.contains('linkable');
        }
      },
      {//remove a link to a journal entry from an actor trait (bio category)
        name: game.i18n.localize('M20E.context.removeLink'),
        icon: '<i class="fas fa-trash"></i>',
        callback: element => {
          this._removeJELink(Trait.fromElement(element[0]));
        },
        condition: element => {
          return element[0].dataset.linkId;
        }
      }
    ]
  }

  _getRollableContextOptions(traitElem) {
    const itemId = traitElem.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if ( !item.data.data.equiped ) { return null;} //useless, no ctx menu on unequiped rollables^^
    //prepare context menu options
    return item.data.data.throws.map( (mageThrow, throwIndex) => {
      return {
        name: mageThrow.name,
        itemId: itemId,
        throwIndex: throwIndex,
        icon: '<i class="fas fa-dice"></i>',
        callback: (target, event) => {
          item.roll(event.shiftKey, throwIndex);
        },
        dragDropCallbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDrop.bind(this) }
      }
    });
  }

  /**
   * @return the context menu options for the '.resource-context' elements
   * edit health max, edit heal malus list, edit willpower max.
   */
  _getResourceContextOptions() {
    return [
      {
        name: game.i18n.localize('M20E.context.editWillpowerMax'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: () => {
          this._editResource({
            relativePath: 'resources.willpower.max',
            currentValue: foundry.utils.getProperty(this.actor.data.data, 'resources.willpower.max'),
            name: `${game.i18n.localize('M20E.willpower')} Max`
          });
        },
        condition: element => {
          return (element[0].dataset.resource === 'willpower');
        }
      },
      {
        name: game.i18n.localize('M20E.context.editHealthMax'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: () => {
          this._editResource({
            relativePath: 'resources.health.max',
            currentValue: foundry.utils.getProperty(this.actor.data.data, 'resources.health.max'),
            name: `${game.i18n.localize('M20E.health')} Max`
          });
        },
        condition: element => {
          return (element[0].dataset.resource === 'health');
        }
      },
      {
        name: game.i18n.localize('M20E.context.editHealthMalus'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: () => {
          this._editResource({
            relativePath: 'resources.health.malusList',
            currentValue: foundry.utils.getProperty(this.actor.data.data, 'resources.health.malusList'),
            name: `Malus ${game.i18n.localize("M20E.health")}`
          });
        },
        condition: element => {
          return (element[0].dataset.resource === 'health');
        }
      }
    ]
  }

  _getXPContextOptions() {
    return [
      {
        name: game.i18n.localize('M20E.context.addXP'),
        icon: '<i class="fas fa-plus-square"></i>',
        callback: () => {
          this.addXP();
        },
        condition: () => {
          return game.user.isGM;
        }
      },
      {
        name: game.i18n.localize('M20E.context.removeXP'),
        icon: '<i class="fas fa-minus-square"></i>',
        callback: () => {
          this.removeXP();
        },
        condition: () => {
          return this.actor.data.data.currentXP > 0;
        }
      }
    ]
  }

  /* -------------------------------------------- */
  /*  Drag n Drop                                 */
  /* -------------------------------------------- */

  /**
   * pass along traitsToRoll if dragElem is main dice button (action == roll-traits)
   * otherwise let super deal with it (might also contain a rollable item)
   * 
   *  @override */
  _onDragStart(event) {
    const dataset = event.currentTarget.dataset
    // Create drag data
    const dragData = {
      actorId: this.actor.id,
      sceneId: this.actor.isToken ? canvas.scene?.id : null,
      tokenId: this.actor.isToken ? this.actor.token.id : null
    }
    switch ( dataset?.action ) {
      case 'roll-traits' : 
        dragData.type = "m20e-roll";
        dragData.data = this.getTraitsToRoll();
      case 'roll-throw' :
        const item = this.actor.items.get(dataset.itemId);
        dragData.type = "Item";
        dragData.data = duplicate(item.data);
        dragData.data.throwIndex = dataset.throwIndex || 0;
      default:
        if ( dragData.data ) {
          event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        } else {
          super._onDragStart(event);
        }
    }
  }

  /**
   * added Journal Entry management
   *  @override
   */
  async _onDrop(event) {
    log(event.dataTransfer.types.length)
    /*if (itemType) {
      event.preventDefault();
      log(itemType.split(':')[1]);
    }*/
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }

    // Handle different data types
    switch ( data.type ) {
      case "ActiveEffect":
        return super._onDropActiveEffect(event, data);
      case "Actor":
        return super._onDropActor(event, data);//TODO : override for mentor/contact linking
      case "Item":
        return this._onDropItem(event, data);
      case "JournalEntry":
        return this._onDropJE(event, data);
      case "Folder":
        return super._onDropFolder(event, data);
    }
  }

  /**
   * added paradigm item management
   *  @override
   */
  async _onDropItem(event, data) {
    if ( !this.actor.isOwner ) return false;
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    //special handling for paradigm items
    if ( itemData.type === 'paradigm' ) {
      return this._onDropParadigmItem(itemData);
    }
    // Handle item sorting within the same Actor
    const actor = this.actor;
    let sameActor = (data.actorId === actor.id) || (actor.isToken && (data.tokenId === actor.token.id));
    if (sameActor) return this._onSortItem(event, itemData);

    //check if drop is allowed
    if ( !await this.actor.isDropAllowed(item) ) { return false; }
    // Create the owned item
    return super._onDropItemCreate(itemData);
  }

  /**
   * Prompts user before deleting current paradigm item before adding newly dropped one
   * @param  {ItemData} itemData proper ItemData from _onDropItem
   */
  async _onDropParadigmItem(itemData) {
    //prompts for overwriting current Paradigm if any
    const actor = this.actor;
    const currentParadigm = actor.paradigm;
    if ( currentParadigm ) {
      const confirmation = await Dialog.confirm({
        options: {classes: ['dialog', 'm20e']},
        title: actor.name,
        content: game.i18n.localize("M20E.prompts.dropParadigm")
      });
      if ( !confirmation ) { return false; }
      //delete current paradigm before accepting the dropped one
      await actor.deleteEmbeddedDocuments('Item', [currentParadigm.id]);
    }
    //create new paradigm on the actor
    //warn about refreshing for css modifications to show
    ui.notifications.warn(game.i18n.localize('M20E.notifications.newParadigm'));
    //rename before embedding
    itemData.name = game.i18n.format(`M20E.paradigmName`, {name: actor.name});
    return actor.createEmbeddedDocuments('Item', [itemData]);
  }

  /**
  * Manages drops of JournalEntries on the actor sheet.
  * when dropped on a '.link-drop' selector, link to the JE is recorded
  * along with it's name
  * 
  * @param {Event} event the event that triggered the drop
  * @param {Object} data contains the dropped JounralEntry type, pack & id
  */
  async _onDropJE(event, data) {
    if ( !this.actor.isOwner ) return false;
    const element = event.target;
    if ( element.classList.contains('link-drop') ) {
      const key = element.closest(".trait").dataset.key;
      //create the update object with dropData
      let updateObj = {[`data.bio.${key}.link`]: data};
      //retrieve journal name
      if ( data.pack ) {
        const pack = game.packs.get(data.pack);
        const indexEntry = pack.index.get(data.id);
        updateObj[`data.bio.${key}.displayValue`] = indexEntry.name;
      } else {
        const journalEntry = game.journal.get(data.id);
        updateObj[`data.bio.${key}.displayValue`] = journalEntry.name;
      }
      return this.actor.update(updateObj);

    } else {
      return ui.notifications.warn(game.i18n.localize('M20E.notifications.cantDrop'));
    }
  }

  /* -------------------------------------------- */
  /*  TESTING AREA                                */
  /* -------------------------------------------- */
/*
  _onDragOver(event) {
    const testage = event.dataTransfer?.types;
    testage.forEach(type => {
      log(type);
    })
  }*/

  testage(canvas) {
    const d3d = game.dice3d;
    const options = { dimensions: { w: 45, h: 45 }, autoscale: false, scale: 35, boxType:"showcase" };
    let diceFactory = d3d.box.dicefactory;
    log(diceFactory);
    //diceFactory.dice = {};
    //diceFactory.dice.d10 = d3d.box.dicefactory.dice.d10;

    const config = mergeObject(d3d.constructor.ALL_CONFIG(), options);

    this.box = new d3d.box.constructor(canvas, diceFactory, config);
    this.box.initialize().then(()=>{
      this.box.showcase(config);
    });
  }
}