// Import Applications
import M20eActorSheet from './m20e-actor-sheet.js'
// Import Helpers
import * as utils from '../../utils.js'
import { log } from "../../utils.js";

/**
* Not really necessary atm but will be much cleaner if other actor types are added later on
* Extension of the base m20eActorsheet for mages types actors (character and npc)
* Provides support for 'magepower' quintessence/paradox
* @extends {M20eActorSheet}
*/
export default class M20eMageActorSheet extends M20eActorSheet {

  /** @override */
  constructor(...args) {
    super(...args);
  }

  /** @override */
   get template() {
    return 'systems/mage-fr/templates/actor/mage-sheet.hbs';
  }

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    //add mage specific data (magepower & rote items)
    sheetData.resources.magepower = this.getMagepowerData();
    sheetData.items.rotes = sheetData.items.filter((item) => item.type === "rote");

    sheetData.canSeeParadox = utils.canSeeParadox();
    
    log({actor : this.actor.name, sheetData : sheetData});
    return sheetData;
  }

  /** @override */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    if ( this.actor.isCharacter ) {
      // Toggle character-creation lock
      const icon = this.actor.data.data.creationDone ? 'fas fa-lock' : 'fas fa-unlock-alt';
      buttons = [
        {
          class: "toggle-creation-mode",
          label: game.i18n.localize('M20E.labels.creation'),
          icon: icon,
          onclick: ev => this._onToggleCreationMode(ev)
        }
      ].concat(buttons);
    }

    return buttons;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

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
  * @override adds support for magepower
  */
  _onResourceBoxClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const index = parseInt(element.dataset.index);
    const resourceName = element.closest('.resource-panel').dataset.resource;
    
    if ( resourceName !== 'magepower' ) {
      return super._onResourceBoxClick(event);
    }
    switch ( event.which ) {
      case 1://left button
          this.actor.increaseMagepower(index);
        break;
      case 3://right button
          this.actor.decreaseMagepower(index);
        break;
    };
  }

  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */

  /**
   * Returns an Array with pre-digested data for direct use by handlebars in order to renders some helpers superfluous
   * Populates the array with the relevant number of entries like {state: '', title: ''},
   * based on quintessence and paradox values (as well as whether players can see their own paradox)
   * 
   * @returns {Array} [{state:'', title:''},]
  */
  getMagepowerData() {
    const mp = this.actor.data.data.resources['magepower'];
    const canSeePara = utils.canSeeParadox();

    return [...Array(20)].map((element, index) => {
      const state = mp.quintessence > index ? 1 : 
        ( (canSeePara && (20 - mp.paradox) <= index) ? 2 : 0 );
      const title = canSeePara ? game.i18n.localize(`M20E.hints.magepower.${state}`) : '';
      return {state: state, title: title};
    });
  }

  /**
   * checks whether dropped item can be 'safely' created on this actor
   * @override
   * @param  {M20eItem} item item being dropped
   * @return {Boolean}
  */
  _isDropAllowed(item) {
    if ( !super._isDropAllowed(item) ) { return false; }
    const itemData = item.data;
    //check against spheres levels
    if ( itemData.type === 'rote' && !item._isActuallyRollable(this.actor) ) {
      ui.notifications.error(game.i18n.format('M20E.notifications.unrollableRote',
        {actorName:this.actor.name, itemName: item.name}));
      return false;
    }
    return true;
  }

}