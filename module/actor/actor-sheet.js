// Import Applications
import { FakeItem } from '../apps/fakeitem-sheet.js'
import { DiceThrow } from '../dice/dice-throw.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";
import { Trait, PromptData } from "../utils/classes.js";
import * as chat from "../chat.js";


/**
* Implements M20eActorSheet as an extension of the ActorSheet class
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

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'actor'],
      template: 'systems/mage-fr/templates/actor/actor-sheet.hbs',
      width: 500,
      height: 700,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'traits' }],
      dragDrop: [{ dragSelector: ".macro-ready" }]
    })
  }

  /** @inheritdoc */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Toggle character-creation lock
    const icon = this.actor.data.data.creationDone ? 'fas fa-lock' : 'fas fa-unlock-alt';
    buttons = [
      {
        class: "toggle-creation-mode",
        icon: icon,
        onclick: ev => this._onToggleCreationMode(ev)
      }
    ].concat(buttons);

    return buttons;
  }

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    
    // The Actor's data
    const actorData = this.actor.data.toObject(false);
    sheetData.actor = actorData;
    sheetData.data = actorData.data;
    
    //dispatch items into categories and subtypes
    //sheetData.items is already sorted on item.sort in the super
    //Abilities
    sheetData.items.abilities = { talents: {}, skills: {}, knowledges: {} };
    sheetData.items.abilities.talents = sheetData.items.filter(function (item) { return (item.type === "ability") && (item.data.subType === "talent") });
    sheetData.items.abilities.skills = sheetData.items.filter(function (item) { return (item.type === "ability") && (item.data.subType === "skill") });
    sheetData.items.abilities.knowledges = sheetData.items.filter(function (item) { return (item.type === "ability") && (item.data.subType === "knowledge") });
    //merits and flaws
    sheetData.items.meritsflaws = { merits: {}, flaws: {} };
    sheetData.items.meritsflaws.merits = sheetData.items.filter(function (item) { return (item.type === "meritflaw") && (item.data.subType === "merit") });
    sheetData.items.meritsflaws.flaws = sheetData.items.filter(function (item) { return (item.type === "meritflaw") && (item.data.subType === "flaw") });
    //the rest of the items
    sheetData.items.backgrounds = sheetData.items.filter(function (item) { return item.type === "background" });
    sheetData.items.rotes = sheetData.items.filter(function (item) { return item.type === "rote" });
    sheetData.items.events = sheetData.items.filter(function (item) { return item.type === "event" });
    sheetData.items.miscellaneous = sheetData.items.filter(function (item) { return item.type === "misc" });

    //other usefull data
    sheetData.isGM = game.user.isGM;
    sheetData.isOwner = this.actor.isOwner;
    sheetData.config = CONFIG.M20E;
    sheetData.locks = this.locks;
    
    const paradigm = this.actor.paradigm;
    if( paradigm ) {
      sheetData.paraData = paradigm.data.data;
    }
    sheetData.dsnUserActive = utils.dsnUserActive();
    
    log({actor : sheetData.actor.name, sheetData : sheetData});
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
    }
    
    if ( game.user.isGM ) {
      new ContextMenu(html, '.resource-context', this._getResourceContextOptions());
    }
    
    super.activateListeners(html);
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
          this._removeItem(paradigm);
        },
        condition: () => {
          return this.actor.paradigm; 
        }
      }
    ];
  }

  /**
   * @return the context menu options for the '.trait' elements
   * link trait in chat, edit trait, remove JE link from trait that have one
   */
  _getTraitContextOptions() {
    return [
      {
        name: game.i18n.localize('M20E.context.linkInChat'),
        icon: '<i class="fas fa-share"></i>',
        callback: element => {
          this._linkInChat(new Trait(element[0]));
        },
        condition: element => {
          return element[0].classList.contains('linkable');
        }
      },
      {
        name: game.i18n.localize('M20E.context.editTrait'),
        icon: '<i class="fas fa-pencil-alt"></i>',
        callback: element => {
          this._editTrait(new Trait(element[0]));
        },//todo : maybe find different condition ?
        condition: element => {
          return element[0].classList.contains('linkable');
        }
      },
      {
        name: game.i18n.localize('M20E.context.removeLink'),
        icon: '<i class="fas fa-trash"></i>',
        callback: element => {
          this._removeJELink(new Trait(element[0]));
        },
        condition: element => {
          return element[0].dataset.linkId;
        }
      }
    ];
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
            relativePath: 'willpower.max',
            currentValue: foundry.utils.getProperty(this.actor.data.data, 'willpower.max'),
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
            relativePath: 'health.max',
            currentValue: foundry.utils.getProperty(this.actor.data.data, 'health.max'),
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
            relativePath: 'health.malusList',
            currentValue: foundry.utils.getProperty(this.actor.data.data, 'health.malusList'),
            name: `Malus ${game.i18n.localize("M20E.health")}`
          });
        },
        condition: element => {
          return (element[0].dataset.resource === 'health');
        }
      }
    ];
  } 

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

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
  * Updates actor with a toggled value for data.creationDone.
  * thus enabling/preventing edition of certain values
  * also changes the header button icon accordingly
  * 
  * @param {object} event the event that triggered (from header button '.toggle-creation-mode')
  */
  async _onToggleCreationMode(event) {
    if ( ! game.user.isGM ) {
      ui.notifications.error(game.i18n.localize(`M20E.notifications.gmPermissionNeeded`));
      return;
    }
    //update the actor status
    const buttonElem = event.currentTarget;
    const iElem = $(buttonElem).find('.fas'); 
    const toggle = this.actor.data.data.creationDone === true;
    await this.actor.update({['data.creationDone']: !toggle});

    //change the button icon
    let classToRemove, classToAdd = '';
    if ( toggle ) {
      classToRemove = 'fa-lock';
      classToAdd = 'fa-unlock-alt';
    } else {
      classToRemove = 'fa-unlock-alt';
      classToAdd = 'fa-lock';
    }
    //todo : add localized title property to the button
    iElem[0].classList.remove(classToRemove);
    iElem[0].classList.add(classToAdd);
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
  * Dispatches clicks on resource panel boxes acording to resource type and mouse button press
  * Foundry prefers a 'value/max' for resources whereas Mage counts wounds hence 
  * 'descreseResource' actually adds wounds and 'increaseResource' removes wounds
  * note: magepower is not a 'value/max' resource type but works in the same manner
  * note : event is actually a mousedown
  * 
  * @param {object} event the event that triggered (from div '.box')
  */
  _onResourceBoxClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const index = parseInt(element.dataset.index);
    const resourceName = element.closest('.resource-panel').dataset.resource;
    
    switch ( event.which ) {
      case 1://left button
        if ( resourceName === 'magepower' ) {
          this.actor.increaseMagepower(index);
        } else {
          this.actor.decreaseResource(resourceName, index);
        }
        break;
      case 3://right button
        if ( resourceName === 'magepower' ){
          this.actor.decreaseMagepower(index);
        } else {
          this.actor.increaseResource(resourceName, index);
        }
        break;
      default:
        break;
    };
  }

  /**
  * Updates an owned item's data.value from within the character sheet.
  * validates input value against dtype min max before updating
  * 
  * @param {object} event the event that triggered (from an input '.inline-input')
  */
  async _onInlineEditChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    if ( ! utils.isValidUpdate(element) ) {
      return this.render();
    }
    //value has been validated => update the item
    const itemId = element.closest(".trait").dataset.itemId;
    const item = this.actor.items.get(itemId);
    return await item.update({"data.value": element.value});
  }

  /**
  *  @override
  * added validation against dtype and min max before updating
  * re-renders the sheet to display the previous value if update is invalid
  * note: though data are validated against dtype by foundry,
  * updating a number with a string leaves the input blank
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
  * displays a warning upon clicking an empty link
  * triggers the creation of personnal JE upon clicking an empty link for that specific one
  */
  _onEntityLinkClick(event){
    const linkElem = event.currentTarget;
    const dataset = linkElem.dataset;
    const id = dataset.id;
    if ( !id ) {
      event.preventDefault();
      event.stopPropagation();
      ui.notifications.warn(game.i18n.localize(`M20E.notifications.noJournal`));
      if ( linkElem.classList.contains('personnal-je') ) {
        this._createPersonnalJE();
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
        const itemType = CONFIG.M20E.categoryToType[dataset.category];
        const itemSubtype = CONFIG.M20E.categoryToType[dataset.subCategory];
        this._addItem(itemType, itemSubtype);
        break;
      
      case 'edit': //edit regular or virtual Trait (item)
        this._editTrait(new Trait(buttonElem));
        break;
      
      case 'remove':
        const itemId = buttonElem.closest(".trait").dataset.itemId;
        const item = this.actor.items.get(itemId);
        this._removeItem(item);
        break;
      
      case 'roll-item':
        this._rollItem(buttonElem.closest(".trait").dataset.itemId, event.shiftKey);
        break;
      
      case 'expand':
        this._expandDescription(buttonElem);
        break;
    }
  }

  /* -------------------------------------------- */
  /*  Context Menus Callbacks                     */
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
  * 
  * @param {Trait} trait  the Trait to be displayed in chat
  */
  async _linkInChat(trait){
    const {category, itemId, key } = trait;
    let item = {};
    
    if ( itemId ) {
      //trait is actually a real item
      item = this.actor.items.get(itemId);
    } else {
      //trait is an attribute or sphere, build 'fake' itemData 
      
      //retrieve attribute (or sphere) name from paradigm item's lexicon if any
      const lexiconEntry = this.actor.getLexiconEntry(`${category}.${key}`);
      //get systemDescription from compendium given category and key
      const sysDesc = await utils.getSystemDescription(category, key);
      //build our fake item
      item = {
        type: game.i18n.localize(`M20E.category.${category}`),
        name: game.i18n.localize(`M20E.${category}.${key}`),
        data: {
          data: foundry.utils.getProperty(this.actor.data, `data.${category}.${key}`)
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
  * Removes link parameters from a specific trait
  * Called in response to a contextMenu click on a '.trait' that has an active link
  * 
  * @param {Trait} trait  the Trait the link should be removed from
  */
  async _removeJELink(trait){
    const {category, key } = trait;
    //prepare the update object
    let updateObj = {};
    const relativePath = `data.${category}.${key}.link`;
    updateObj[`${relativePath}.-=type`] = null;
    updateObj[`${relativePath}.-=pack`] = null;
    updateObj[`${relativePath}.-=id`] = null;

    return this.actor.update(updateObj);
  }

  /* -------------------------------------------- */
  /*  Implementation                              */
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
          return new Trait(traitElem);
        })];
    }, []);
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
          permissions: { drop: this._canDragDrop.bind(this) },
          callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDrop.bind(this) }
        })
        this._dragDrop.push(newDragDrop);
      }
    }
    //in any case, render to enact the changes to locks & dragDrop state
    this.render();
  }

  /**
  * Call for the display of an item sheet to edit a trait
  * trait can either be an item (=> display it's item.sheet) or 
  * an actor template property (=> display a 'fakeitem' sheet)
  * 
  * @param {Trait} trait  the Trait to be edited
  */
  _editTrait(trait) {
    const {category, key, itemId} = trait;
    if ( category === 'attributes' || category === 'spheres' ) {
      //use a fakeItem dialog to edit attribute (or sphere)
      this._editFakeItem(category, key);
    } else {
      // regular item edit
      const item = this.actor.items.get(itemId);
      item.sheet.render(true);
    }
  }

  /**
  * Prompts user for a name for the new item
  * creates itemData accordingly and updates actor's embeddedDocuments with it
  * 
  * @param {string} itemType type of the item to be created
  * @param {string} itemSubtype subType if any
  */
  async _addItem(itemType, itemSubtype = null) {
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

  /**
  * Prompts user for confirmation before deleting the item from this.actor embedded collection
   * 
  * @param {Item} item an item with a name an id, to be deleted
  */
  async _removeItem(item) {
    if ( !item ) { return; }

    const confirmation = await Dialog.confirm({
      options: {classes: ['dialog', 'm20e']},
      title: game.i18n.format("M20E.prompts.deleteTitle", {name: item.name}),
      content: game.i18n.format("M20E.prompts.deleteContent", {name: item.name})
    });
    if ( confirmation ) {
      this.actor.deleteEmbeddedDocuments('Item', [item.id]);
    }
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

  _rollItem(itemId, shiftKey, throwIndex = 0) {
    const item = this.actor.items.get(itemId);
    //retrieve traits to roll
    const traitsToRoll = item.getTraitsToRoll(throwIndex);
    const diceThrow = new DiceThrow({
      document: item,
      traitsToRoll: traitsToRoll
    });
    if ( shiftKey ) {
      //throw right away
      diceThrow.throwDice();
    } else {
      //display dice throw dialog
      diceThrow.render(true);
    }
  }

  /* -------------------------------------------- */
  /*  Drag n Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _canDragDrop(selector) {
    log(selector);
    //might be usefull at some point ?
    return super._canDragDrop(selector);
  }
  /** @override */
  _onDragStart(event) {
    super._onDragStart(event);
  }

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