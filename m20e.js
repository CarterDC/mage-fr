/**************************************************************
 * The Mage-Fr game system for Foundry Virtual Tabletop       
 * A system for playing the 20th anniversary edition of Mage  
 * This is NOT official World of Darkness material.           
 * Author: Carter_DC                                          
 * Software License: MIT                                      
 * Content License: https://www.worldofdarkness.com/dark-pack 
 * Repository: https://github.com/CarterDC/mage-fr            
 */

// Import Modules
import { M20E } from './module/config.js'
import { registerSystemSettings } from "./module/settings.js";
// Import Documents
import M20eActor from './module/actor/actor.js'
import M20eItem from './module/item/item.js'
import M20eParadigmItem from './module/item/para-item.js'
// Import Applications
import M20eActorSheet from './module/actor/actor-sheet.js'
import M20eItemSheet from './module/item/baseitem-sheet.js'
import M20eParadigmSheet from './module/item/paradigm-sheet.js'
// Import Helpers
import * as utils from './module/utils/utils.js'
import { log } from "./module/utils/utils.js";
import { registerHandlebarsHelpers } from "./module/utils/hb-helpers.js";
import { preloadHandlebarsTemplates } from "./module/utils/hb-templates.js";
import * as chat from "./module/chat.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once('init', async function () {
  log('Initialisation du système');

  game.m20e = {
    entities: {
      M20eActor,
      M20eItem
    },
    config: M20E
  };

  CONFIG.M20E = M20E;
  CONFIG.Actor.documentClass = M20eActor;
  CONFIG.Item.documentClass = M20eItem;
  //add references to subclasses for use in the generic constructor
  CONFIG.Item.documentClasses = {"paradigm": M20eParadigmItem};

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('m20e', M20eActorSheet, { makeDefault: true });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('m20e', M20eItemSheet, { 
    types: ["ability", "background"], //todo , add all the other base item types
    makeDefault: true 
  });
  Items.registerSheet("m20e", M20eParadigmSheet, {
    types: ["paradigm"],
    makeDefault: true
  });

  registerSystemSettings();
  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();

  //test shit here !


})

/* -------------------------------------------- */
/*  Other usefull Hooks                         */
/* -------------------------------------------- */


Hooks.on('renderChatLog', (app, html, data) => chat.addChatListeners(html));


