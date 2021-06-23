import {log} from "../utils.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class M20eActorSheet extends ActorSheet {

  /** @override */
  constructor(...args) {
    super(...args);

    this.locks = { //todo refaire cette merde !
      attributes: true,
      abilities: true,
      spheres: true,
      description: true,
      backgrounds: true,
      meritsflaws: true,
      chronic: true,
      contacts: true,
      rotes: true,
      equipement: true
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'actor'],
      template: 'systems/mage-fr/templates/actor/actor-sheet.hbs',
      width: 500,
      height: 720,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'stats' }],
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

    const paradigm = this.actor.paradigm;
    if(paradigm) {
      sheetData.paraData = paradigm.data.data;
    }
    log({actor : sheetData.actor.name, paraData: sheetData.paraData});
    return sheetData
  }

  /** @override */
  activateListeners(html) {
    
    //actions for everyone

    //editable only 
    if (this.options.editable) {

    }

    if(game.user.isGM){

    }

    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */


}