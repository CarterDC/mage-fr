// Import Applications
import { FakeItem } from '../apps/fakeitem-sheet.js'
// Import Helpers
import * as utils from '../utils/utils.js'
import { log } from "../utils/utils.js";


/**
 * Implements M20eActorSheet as an extension of the ActorSheet class
 * @extends {ActorSheet}
 */
export default class M20eActorSheet extends ActorSheet {

  /** @override */
  constructor(...args) {
    super(...args);

    //creates the 'locks' object like {attributes: true, } from an array of categories
    this.locks = CONFIG.M20E.categoriesWithLocks.reduce((acc, cur) =>
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
      dragDrop: [{ dragSelector: ".dice-button" }]
    })
  }

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);

    // The Actor's data
    const actorData = this.actor.data.toObject(false);
    sheetData.actor = actorData;
    sheetData.data = actorData.data;

    //dispatch items into categories and subtypes
    //Abilities
    sheetData.data.abilities = { talents: {}, skills: {}, knowledges: {} };
    sheetData.data.abilities.talents = sheetData.items.filter(function (item) { return (item.type === "ability") && (item.data.subType === "talent") });
    sheetData.data.abilities.skills = sheetData.items.filter(function (item) { return (item.type === "ability") && (item.data.subType === "skill") });
    sheetData.data.abilities.knowledges = sheetData.items.filter(function (item) { return (item.type === "ability") && (item.data.subType === "knowledge") });
    

    //other usefull data
    sheetData.isGM = game.user.isGM;
    sheetData.config = CONFIG.M20E;
    sheetData.locks = this.locks;
    sheetData.canSeeParadox = utils.canSeeParadox();

    const paradigm = this.actor.paradigm;
    if( paradigm ) {
      sheetData.paraData = paradigm.data.data;
    }

    log({actor : sheetData.actor.name, sheetData : sheetData});
    return sheetData;
  }

  /** @override */
  activateListeners(html) {

    //actions for everyone
    //(dice thows & trait link)
    html.find('a.trait-label').click(this._onTraitLabelClick.bind(this));
    new ContextMenu(html, '.trait', this._itemContextMenu);

    //editable only (roughly equals 'isOwner')
    if ( this.isEditable ) {
      //interactions & editions
      html.find('.mini-button').click(this._onMiniButtonClick.bind(this));
      html.find('.resource-panel .box[data-clickable="true"]').mousedown(this._onResourceBoxClick.bind(this)); //todo maybe add clickable ?
    }

    if ( game.user.isGM ) {
      new ContextMenu(html, '.resource-context', this._resourceContextMenu);
    }

    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Context Menus                               */
  /* -------------------------------------------- */

  _itemContextMenu = [
    {
      name: game.i18n.localize('M20E.context.linkInChat'),
      icon: '<i class="fas fa-share"></i>',
      callback: element => {
        this.linkInChat(element[0]);
      }//TODO : Maybe add condition that element is linkable ? 
    }
  ]

  _resourceContextMenu = [
    {
      name: game.i18n.localize('M20E.context.editWillpowerMax'),
      icon: '<i class="fas fa-pencil-alt"></i>',
      callback: element => {
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
      callback: element => {
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
      callback: element => {
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
  ]

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  async linkInChat(traitElement){
    const category = traitElement.closest(".category").dataset.category;
    const itemId = traitElement?.dataset.itemId;
    const key = traitElement?.dataset.key;
    let item = {};

    if ( itemId ) {
      //trait is actually a real item
      item = this.actor.items.get(itemId);
    } else {
      //trait is an attribute or sphere, treat it like a fake item

      //retrieve attribute (or sphere) name from paradigm item's lexicon if any
      const lexiconEntry = this.actor.getLexiconEntry(`${category}.${key}`);
      //get systemDescription from compendium given category and key
      const packName = `mage-fr.${category}-desc`;
      const packItem = await utils.getCompendiumDocumentByName(packName, key);

      item = {
        type: game.i18n.localize(`M20E.category.${category}`),
        name: game.i18n.localize(`M20E.${category}.${key}`),
        data: {
          data: foundry.utils.getProperty(this.actor.data, `data.${category}.${key}`)
        }
      };
      item.data.data.displayName = lexiconEntry || '';
      item.data.data.systemDescription = packItem ? packItem.data.content : '';
    }
    this.displayCard({
      category : category,
      itemId: itemId,
      key: key,
      item: item
    });
  }

  //TODO : ranger ça ailleurs genre dans chat !
  async displayCard(templateData) {
    const flavorTemplate = "systems/mage-fr/templates/chat/trait-flavor.hbs";
    const contentTemplate = "systems/mage-fr/templates/chat/trait-card.hbs";
    const htmlFlavor = await renderTemplate(flavorTemplate, templateData);
    const htmlContent = await renderTemplate(contentTemplate, templateData);

    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: htmlContent,
      flavor: htmlFlavor,
      speaker: ChatMessage.getSpeaker({actor: this.actor})
    };

    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
    return ChatMessage.create(chatData);
  }


  async _editResource(promptData) {
    if( utils.isNumeric(promptData.currentValue)){
      promptData.min = 0;
      promptData.max = 10;
    }
    const inputElement = await utils.promptNewValue(promptData);
    if ( utils.isValidUpdate(inputElement) ) {
      const newValue = isNaN(promptData.currentValue) ? inputElement.value : parseInt(inputElement.value);
      //only update if it's actually a different value
      if ( newValue !== promptData.currentValue ) {
        await this.actor.safeUpdateProperty(promptData.relativePath, newValue);
      }
    }
  }

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

  async _onChangeInput(event) {
    const element = event.target;
    if ( ! utils.isValidUpdate(element) ) {
      event.preventDefault();
      return this.render();
    }
    super._onChangeInput(event);
  }

  _onTraitLabelClick(event) {
    event.preventDefault()
    const traitElement = this._getTraitElement(event);
    const toggle = (traitElement.dataset.active === 'true');
    traitElement.dataset.active = !toggle;
  }

  _onMiniButtonClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    switch ( dataset.action ) {
      case 'lock':
        const category = dataset.category;
        const toggle = this.locks[category];
        this.locks[category] = !toggle;
        this.render();
        break;

      case 'add':
        //this._addItem(element, dataset);
        break;

      case 'edit':
        this._editItem(element);
        break;

      case 'remove':
        //let itemId = element.closest(".trait").dataset.itemId;
        //this._removeItem(itemId);
        break;

      case 'roll':
        
        break;

      case 'expand':
        
        break;
    }
  }

  //utile ?
  _getTraitElement(event) {
    const element = event.currentTarget;
    return element.closest(".trait");
  }

  _editItem(element) {
    const category = element.closest(".category").dataset.category;
    if ( category === 'attributes' || category === 'spheres' ) {
      const key = element.closest(".trait").dataset.key;
      //use a fakeItem dialog to edit attribute (or sphere)
      this._editFakeItem(category, key);
    } else {
      // regular item edit
      let itemId = element.closest(".trait").dataset.itemId;
      let item = this.actor.items.get(itemId);
      item.sheet.render(true);
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
    //get systemDescription from compendium given category and key
    const packName = `mage-fr.${category}-desc`;
    const packItem = await utils.getCompendiumDocumentByName(packName, key);

    const itemData = {
      category: category,
      key: key,
      relativePath: `${category}.${key}`,
      type: game.i18n.localize(`M20E.category.${category}`),
      lexiconName: lexiconEntry || '',
      placeholderName : game.i18n.localize(`M20E.${category}.${key}`),
      systemDescription: packItem ? packItem.data.content : game.i18n.localize(`M20E.errors.missingContent`)
    }
    //display fake sheet
    const fakeItem = new FakeItem(this.actor, itemData);
    fakeItem.render(true);
  }

}