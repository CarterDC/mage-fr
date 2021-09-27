// Import Applications
import { FakeItem } from '../apps/fakeitem-sheet.js'
import DiceThrow from '../dice/dice-throw.js'
import { Trait } from '../dice/dice.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { DynaCtx } from "../utils/classes.js";
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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  /**
   * overridden by extensions of M20eActorSheet that use a different template
   * @override
   */
    get template() {
    return 'systems/mage-fr/templates/actor/actor-sheet.hbs';
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    //sheetData.data is a standard js Object created from the actor's PREPARED data
    const actorData = sheetData.data; 
    //override sheetData.data for convenience (to avoid 'data.data' in the templates all the time)
    sheetData.data = actorData.data;

    //pre-digest some data to be usable by handlbars (avoid some helpers)
    sheetData.resources = {};
    sheetData.resources.health = this.getResourceData('health');
    sheetData.resources.willpower = this.getResourceData('willpower');

    //dispatch items into categories and subtypes
    //at this point sheetData.items is already an array of standard js objects made from the individual itemData of each actor's item.
    //sheetData.items is already sorted on item.sort in the super
    //Abilities
    sheetData.items.abilities = {};
    sheetData.items.abilities.talents = sheetData.items.filter((itemData) => ( (itemData.type === "ability") && (itemData.data.subType === "talent") ));
    sheetData.items.abilities.skills = sheetData.items.filter((itemData) => ( (itemData.type === "ability") && (itemData.data.subType === "skill") ));
    sheetData.items.abilities.knowledges = sheetData.items.filter((itemData) => ( (itemData.type === "ability") && (itemData.data.subType === "knowledge") ));
    //merits and flaws
    sheetData.items.meritsflaws = {};
    sheetData.items.meritsflaws.merits = sheetData.items.filter((itemData) => ( (itemData.type === "meritflaw") && (itemData.data.subType === "merit") ));
    sheetData.items.meritsflaws.flaws = sheetData.items.filter((itemData) => ( (itemData.type === "meritflaw") && (itemData.data.subType === "flaw") ));
    //the rest of the items
    sheetData.items.backgrounds = sheetData.items.filter((itemData) => itemData.type === "background");
    sheetData.items.events = sheetData.items.filter((itemData) => itemData.type === "event");
    //gear & other possessions
    sheetData.items.equipables = sheetData.items.filter((itemData) => itemData.data.isEquipable === true);
    sheetData.items.miscs = sheetData.items.filter((itemData) => ( itemData.type === 'misc' && itemData.data.isEquipable === false ));
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

    if (this.actor.type === 'npcsleeper') { log({sheetData: sheetData});}
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Returns an Array with pre-digested data for direct use by handlebars.
   * Populates the array with the relevant number of entries, based on resource properties.
   * Called in the getData().
   * 
   * @returns {Array} [{state, clickable, title},]
   */
   getResourceData(resourceName) {
    const rez = this.actor.data.data.resources[resourceName];
    const WT = CONFIG.M20E.WOUNDTYPE;
    return [...Array(rez.max)].map((element, index) => {
      const state = index < rez[WT.AGGRAVATED] ? WT.AGGRAVATED : 
        ( index < rez[WT.LETHAL] ? WT.LETHAL : 
          ( index < rez[WT.BASHING] ? WT.BASHING : WT.NONE ));

      return {
        state: state,
        clickable: (state !== WT.AGGRAVATED || game.settings.get("mage-fr", "playersCanRemoveAggravated")),
        title: state !== WT.NONE ? game.i18n.localize(`M20E.hints.wounds.${state}`) : ''
      };
    });
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {

    //disable buttons/inputs given their 'protection status'
    if ( this.actor.data.data.creationDone && !game.user.isGM ) {
      this._protectElements(html);
    }
    //actions for everyone go here
    
    //editable only (roughly equals 'isOwner')
    if ( this.isEditable ) {
      //highlighting of traits
      html.find('a.stat-label').click(this._onStatLabelClick.bind(this));
      //every interraction with a button (except for the dice-button)
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      //left & right clicks on resource boxes
      html.find('.resource-panel .box[data-clickable="true"]').mousedown(this._onResourceBoxClick.bind(this));
      //edition of item value when cat is unlocked
      html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
      //dice throwing (Big Dice Button)
      html.find('.dice-button').click(this._onDiceClick.bind(this));
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
    }
    
    if ( game.user.isGM ) {
      new ContextMenu(html, '.resource-context', this._getResourceContextOptions());
    }

    //testing shit here :
    
    super.activateListeners(html);
  }

  /* -------------------------------------------- */

  /**
  * @override
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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
  * Toggles the active state of a trait element when it's label has been clicked.
  * traits with a dataset.active === true are picked up when rolling dice
  * any render of the sheet resets the active state to false (which is desired behavior)
  * 
  * @param {object} event the event that triggered (from a click on 'a.stat-label')
  */
   _onStatLabelClick(event) {
    event.preventDefault();
    const statElem = event.currentTarget.closest(".trait");
    //just toggle the active status
    statElem.dataset.active = !(statElem.dataset.active === 'true');
  }

  /* -------------------------------------------- */

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
    // get a trait from the buttonElem (might be null if not applicable)
    const trait = Trait.fromElement(buttonElem);
    //dispatch 
    switch ( dataset.action ) {
      case 'lock': //deal with locks & dragDrop
        this._toggleCategoryLock(dataset.category);
        break;
      
      case 'add': //itemType can end up being a list of avail types for the category
        //todo : redo !
        const itemType = CONFIG.M20E.categoryToType[dataset.category];
        const itemSubtype = CONFIG.M20E.categoryToType[dataset.subCategory];
        this._addEmbedded(itemType, itemSubtype); //todo : redo more clever !
        break;
      
      case 'edit': //edit actor' own traits or trait items (also AEffects)
        if ( trait.itemId ) {
          this._editEmbedded(trait);
        } else {
          this._editTrait(trait);
        }
        break;
      
      case 'remove'://remove embedded doc item or AE
        this._removeEmbedded(trait);
        break;
        
      case 'check': //atm, only used to update the disabled value of an active affect
        this._toggleEmbeddedProperty(trait, dataset.updatePath);
        break;

      case 'plus': //increment / decrement a property on an embedded doc 
      case 'minus': //atm only used for qtty on consumable items
        const mod = dataset.action === 'minus' ? -1 : 1;
        this._modEmbeddedProperty(trait, mod, dataset.updatePath);
    
      case 'expand': //toggle expanded/collapsed status of a display description or other
        this._expandDescription(buttonElem);
        break;

      case 'roll-item': // click on a mini-dice button roll the first throw of a rollable
        //note that's the only throw on a rote
        const rollableId = buttonElem.closest(".trait").dataset.itemId;
        const rollableItem = this.actor.items.get(rollableId);
        rollableItem.roll(event.shiftKey); //throwIndex is 0 by default
        break;
      
      default:
    }
  }

  /* -------------------------------------------- */

  /**
  * Dispatches clicks on resource panel boxes acording to resource type and mouse button press
  * 
  * @param {object} event the mousedown-event that triggered (from div '.box')
  */
   _onResourceBoxClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const state = parseInt(element.dataset.state);
    const resourceName = element.closest('.resource-panel').dataset.resource;
    //todo : maybe add shiftKey for permanent wounds ?
    switch ( event.which ) {
      case 1://left button
        if ( state < CONFIG.M20E.WOUNDTYPE.AGGRAVATED) {
          this.actor.wound(resourceName, 1, state + 1);
        }
        break;
      case 3://right button
        if ( state >= CONFIG.M20E.WOUNDTYPE.BASHING ) {
          const canHealAggravated = game.settings.get("mage-fr", "playersCanRemoveAggravated");
          if ( state !== CONFIG.M20E.WOUNDTYPE.AGGRAVATED || canHealAggravated ) {
            this.actor.heal(resourceName, 1, state);
          }
        }
        break;
    }
  }

  /* -------------------------------------------- */

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
    const trait = Trait.fromElement(inputElem);
    this._updateEmbeddedProperty(trait, inputElem.value, inputElem.dataset.updatePath);
  }

  /* -------------------------------------------- */

  /**
   * On a click on the big dice, round up every highlighted trait on the sheet
   * send it to a new DiceThrow object and either render it for further options or
   * just throw the dice
   * 
   * @param  {} event
   */
  _onDiceClick(event) {
    //retrieve traits to roll
    const diceThrow = new DiceThrow({
      document: this.actor,
      stats: this.getStatsToRoll()
    });
    if ( event.shiftKey ) {
      //throw right away
      diceThrow.throwDice();
    } else {
      //display dice throw dialog
      diceThrow.render(true);
    }
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */
  /*  Mini-Buttons Dispatch                       */
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

  /* -------------------------------------------- */

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

    const promptData = new utils.PromptData({
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

  /* -------------------------------------------- */

  _addEmbeddedItem() {
    //todo : obvious !
  }

  /* -------------------------------------------- */

  _addEmbeddedEffect(name) {
    const effectData = {
      label: name,
      icon: CONFIG.M20E.defaultImg['ActiveEffect'],
      origin: 'added-manually',
      tint: '#000000'
    };
    this.actor.createEmbeddedDocuments('ActiveEffect', [effectData], {renderSheet: true});
  }

  /* -------------------------------------------- */

  /**
   * Call for the display of a sheet to edit an embedded document
   * can either be an item or an ActiveEffect
   * @param  {Trait} trait
   */
   _editEmbedded(trait) {
    const {category, itemId} = trait.split();
    const embeddedDoc = category === 'aeffects' ? 
      this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    if ( !embeddedDoc ) { return; }

    embeddedDoc.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
  * Displays a "fake item-sheet" from actor's attributes, spheres or ? 
  * Enables edition of misc values : paradigmic name (actually stored in the lexicon),
  * specialisation and description, along with main value.
  * also displays the associated systemDescription sourced from matching compendium.
  * 
  * @param {Trait} trait  the Trait to be edited
  */
  async _editTrait(trait) {
    const {category, key} = trait.split();
    //retrieve attribute (or sphere) name from paradigm item's lexicon if any
    const lexiconEntry = this.actor.getLexiconEntry(`${category}.${key}`);
    //get systemDescription from compendium or localization given category and key
    const sysDesc = await utils.getSystemDescription(category, key);
    
    const itemData = {
      category: category,
      key: key,
      relativePath: `${category}.${key}`,
      type: game.i18n.localize(`M20E.category.${category}`),
      lexiconName: lexiconEntry || '',
      placeholderName : game.i18n.localize(`M20E.${category}.${key}`),
      systemDescription: sysDesc
    }
    //display fake sheet
    const fakeItem = new FakeItem(this.actor, itemData);
    fakeItem.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Prompts user for confirmation before deleting the item/AEffect from this.actor embedded collection
   * 
   * @param {Trait} trait a Trait containing the category and the itemId of the embedded doc to be deleted
  */
   async _removeEmbedded(trait) {
    let embeddedDoc, docName, docClass;

    if ( trait.category === 'aeffects' ) {
      embeddedDoc = this.actor.effects.get(trait.itemId);
      if ( !embeddedDoc ) { return; }
      docName = embeddedDoc.label;
      docClass = 'ActiveEffect';
    } else {
      embeddedDoc = this.actor.items.get(trait.itemId);
      if ( !embeddedDoc ) { return; }
      docName = embeddedDoc.name;
      docClass = 'Item';
    } 

    const confirmation = await Dialog.confirm({
      options: {classes: ['dialog', 'm20e']},
      title: game.i18n.format("M20E.prompts.deleteTitle", {name: docName}),
      content: game.i18n.format("M20E.prompts.deleteContent", {name: docName})
    });

    if ( confirmation ) {
      this.actor.deleteEmbeddedDocuments(docClass, [embeddedDoc.id]);
    }
  }

  /* -------------------------------------------- */

  /**
   * Updates a property on an embeddedDoc given a path relative to the documentData
   * atm used to update inline values on stat items
   * @param  {Trait} trait
   * @param  {String|Number} updateValue a valid value for that property
   * @param  {String} updatePath='data.value' path to the property (relative to documentData)
   */
  async _updateEmbeddedProperty(trait, updateValue, updatePath='data.value') {
    const {category, itemId} = trait.split();
    const embeddedDoc = category === 'aeffects' ? 
      this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    if ( !embeddedDoc ) { return; }
    
    updateValue = utils.isNumeric(updateValue) ? parseInt(updateValue) : updateValue;
    return await embeddedDoc.update({[`${updatePath}`]: updateValue});
  }

  /* -------------------------------------------- */

  /**
   * Toggles a boolean property on an embeddedDoc given a path relative to the documentData
   * mostly used for equipable Items and ActiveEffects
   * @param  {Trait} trait
   * @param  {String} updatePath
   */
  async _toggleEmbeddedProperty(trait, updatePath) {
    const {category, itemId} = trait.split();
    const embeddedDoc = category === 'aeffects' ? 
      this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    
      if ( !embeddedDoc ) { return; }
    const currValue = foundry.utils.getProperty(embeddedDoc.data, updatePath);
    return await embeddedDoc.update({[`${updatePath}`]: !currValue});
  }

  /* -------------------------------------------- */

  /**
   * Modify a numeric property on an embeddedDoc given a path relative to it's documentData
   * mostly used for equipable Items and ActiveEffects
   * @param  {Trait} trait
   * @param  {Number} mod the value to be added to the property (usually +1 or -1)
   * @param  {String} updatePath
   */
  async _modEmbeddedProperty(trait, mod, updatePath) {
    const {category, itemId} = trait.split();
    const embeddedDoc = category === 'aeffects' ? 
      this.actor.effects.get(itemId) : this.actor.items.get(itemId);
    
    if ( !embeddedDoc ) { return; }
    const currValue = foundry.utils.getProperty(embeddedDoc.data, updatePath);
    return await embeddedDoc.update({[`${updatePath}`]: currValue + mod});
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */
  /*  Context Menus                               */
  /* -------------------------------------------- */

  /**
   * @return the context menu options for the '.header-row.charname' element
   * atm only paradigm item stuff
   * TODO : add aliases edit here !
   */
   _getNameContextOptions() {
    return [
      { //displays item sheet for paradigm item
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
      { //removes the paradigm Item - not allowed atm
        name: game.i18n.localize('M20E.context.removeParadigm'),
        icon: '<i class="fas fa-trash"></i>',
        callback: () => {
          const paradigm = this.actor.paradigm;
          this._removeEmbedded(paradigm.toTrait());
        },
        condition: () => {
          return this.actor.paradigm && false; 
        }
      }
    ]
  }

  /* -------------------------------------------- */

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
            name: `${game.i18n.localize('M20E.resources.willpower')} Max`
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
            name: `${game.i18n.localize('M20E.resources.health')} Max`
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
            name: `Malus ${game.i18n.localize("M20E.resources.health")}`
          });
        },
        condition: element => {
          return (element[0].dataset.resource === 'health');
        }
      }
    ]
  }

  /* -------------------------------------------- */

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
          const trait = Trait.fromElement(element[0]);
          if ( trait.itemId ) {
            const item = this.actor.items.get(trait.itemId);
            item.linkInChat();
          } else {
            this._linkInChat(trait);
          }
        },
        condition: element => {
          return element[0].classList.contains('linkable');
        }
      },
      {//edit actor trait in fakeitem sheet or edit item (in itemSheet)
        name: game.i18n.localize('M20E.context.editTrait'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: element => {
          const trait = Trait.fromElement(element[0]);
          if ( trait.itemId ) {
            this._editEmbedded(trait);
          } else {
            this._editTrait(trait);
          }
        },
        condition: element => {//todo : maybe find different a condition if any ?
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

  /* -------------------------------------------- */

  _getRollableContextOptions(traitElem) {
    const itemId = traitElem.dataset.itemId;
    const item = this.actor.items.get(itemId);
    //prepare context menu options from list of throws in this rollable
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

  /* -------------------------------------------- */

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
  /*  Context Menus Callbacks                     */
  /*  some implemented in 'mini-button dispatch'  */
  /* -------------------------------------------- */

  /**
  * Called in response to a contextMenu click on a resource label
  * prompts user for a new value (max health, maxwillpower or health malus)
  * validates and updates accordingly
  * 
  * @param {object} { relativePath, currentValue, name }
  *                  prepared in the context menu callback
  */
   async _editResource({ relativePath, currentValue, name }) {
    const promptData = new utils.PromptData({
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

  /* -------------------------------------------- */

  /**
   * Displays an actor trait in chat.
   * Prepares some templateData before feeding the to chat.displayCard
   * @param {Trait} trait  the Trait to be displayed in chat
  */
  async _linkInChat(trait) {
    const templateData = trait.split(); //{category, subType, key, itemId}

    //retrieve attribute (or sphere) name from paradigm item's lexicon if any
    const lexiconEntry = this.actor.getLexiconEntry(trait.path);
    //get systemDescription from compendium given category and key
    const sysDesc = await utils.getSystemDescription(templateData.category, templateData.key);

    //build the trait's data
    templateData.traitData = {
      type: game.i18n.localize(`M20E.category.${templateData.category}`),
      name: game.i18n.localize(`M20E.${trait.path}`),
      img: '',
      data: {
        ...foundry.utils.getProperty(this.actor.data.data, trait.path),
        displayName: lexiconEntry || '',
        systemDescription: sysDesc
      }
    };
    templateData.path = trait.path;

    //display the card
    chat.displayCard(this.actor, templateData);
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  /**
   * Prompts user for a positive xp value to add
   * let the actor update the current and total XP values
   */
   async addXP() {
    const promptData = new utils.PromptData({
      title: this.actor.name,
      promptContent: game.i18n.format('M20E.prompts.addXPContent', {name: this.actor.name}),
      placeHolder: 0
    });
    //prompt for new value
    const inputElem = await utils.promptNewValue(promptData);
    if ( inputElem === null ) { return; } //promptDialog was escaped

    this.actor.addXP(parseInt(inputElem.value));
  }

  /* -------------------------------------------- */

  /**
   * Prompts user for a positive xp value to remove
   * let the actor update the current XP value (and not the total one)
   */
  async removeXP() {
    const promptData = new utils.PromptData({
      title: this.actor.name,
      promptContent: game.i18n.format('M20E.prompts.removeXPContent', {name: this.actor.name}),
      placeHolder: 0
    });
    //prompt for new value
    const inputElem = await utils.promptNewValue(promptData);
    if ( inputElem === null ) { return; } //promptDialog was escaped

    this.actor.removeXP(parseInt(inputElem.value));
  }

  /* -------------------------------------------- */
  /*  other implementations                       */
  /* -------------------------------------------- */

  /**
  * Check all rollable categories for highlighted elements (ie data-active="true")
  * return said elements as Stat instances for later consumption by Throw app.
  * also toggle the active status of highlighted elements after we got them
  * 
  * @return {Array} an Array of Stat instances that match chosen (highlighted) stats.
  */
   getStatsToRoll() { 
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

  /* -------------------------------------------- */

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
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        break;
      case 'roll-throw' :
        const item = this.actor.items.get(dataset.itemId);
        dragData.type = "Item";
        dragData.data = duplicate(item.data);
        dragData.data.throwIndex = dataset.throwIndex || 0;
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        break;
      default:
        super._onDragStart(event);
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * added Journal Entry management
   *  @override
   */
  async _onDrop(event) {
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

  /* -------------------------------------------- */

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
    if ( !await this._isDropAllowed(item) ) { return false; }
    // Create the owned item
    return super._onDropItemCreate(itemData);
  }

  /* -------------------------------------------- */

  /**
   * checks whether dropped item can be 'safely' created on this actor
   * @param  {M20eItem} item item being dropped
   * @return {Boolean}
   */
   _isDropAllowed(item) {
    const itemData = item.data;
    //check name against all names in same itemType
    const duplicates = this.actor.items.filter(item => (item.type === itemData.type) && (item.name === itemData.name));
    if ( duplicates.length ) {
      ui.notifications.error(game.i18n.format(`M20E.notifications.duplicateName`, {name: itemData.name}));
      return;
    }
    //check against 'creation mode'
    if ( this.actor.data.data.creationDone && !game.user.isGM && itemData.protectedType ) {
        ui.notifications.error(game.i18n.localize('M20E.notifications.notOutsideCreation'));
        return false;
    }
    //check against restricted
    if ( itemData.data.restricted && !itemData.data.restricted.includes(this.actor.data.type) ) {
      const itemType = game.i18n.localize(`ITEM.Type${item.type.capitalize()}`);
      ui.notifications.error(game.i18n.format('M20E.notifications.restrictedItem',
        {actorName:this.name, itemType: itemType}));
      return false;
    }
    return true;
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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
      const path = element.closest(".trait").dataset.path;
      //create the update object with dropData
      let updateObj = {[`data.${path}.link`]: data};
      //retrieve journal name
      if ( data.pack ) {
        const pack = game.packs.get(data.pack);
        const indexEntry = pack.index.get(data.id);
        updateObj[`data.${path}.displayValue`] = indexEntry.name;
      } else {
        const journalEntry = game.journal.get(data.id);
        updateObj[`data.${path}.displayValue`] = journalEntry.name;
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