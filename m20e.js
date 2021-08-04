/**************************************************************
 * The Mage-Fr game system for Foundry Virtual Tabletop       
 * A system for playing the 20th anniversary edition of Mage  
 * This is NOT official World of Darkness material.           
 * Author: Carter_DC - Discord @Carter_DC#1097                
 * Discord server : https://discord.gg/6kB5wJaZTf             
 * Content License: https://www.worldofdarkness.com/dark-pack 
 * Software License: MIT                                      
 * Repository: https://github.com/CarterDC/mage-fr            
 */

// Import Documents
import M20eActor from './module/actor/base-actor.js'
import M20eMageActor from './module/actor/mage-actor.js'
import M20eItem from './module/item/base-item.js'
import M20eRoteItem from './module/item/rote-item.js'
import M20eRollableItem from './module/item/rollable-item.js'
// Import Applications
import M20eActorSheet from './module/actor/base-actor-sheet.js'
import M20eItemSheet from './module/item/base-item-sheet.js'
import M20eParadigmSheet from './module/item/paradigm-sheet.js'
import M20eRoteSheet from './module/item/rote-sheet.js'
import M20eRollableSheet from './module/item/rollable-sheet.js'
import DiceThrow from './module/dice/dice-throw.js'
import DiceDialogue from './module/dice/dice-throw-dialog.js'
// Other Imports
import { M20E } from './module/config.js'
import { registerSystemSettings } from "./module/settings.js";
import { registerHotbarOverride } from "./module/macro.js";
import * as dice from "./module/dice/dice.js";
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
  //CONFIG.debug.hooks = true;

  game.m20e = { //store some things here for later access
    config: M20E,
    mageMacro: DiceThrow.fromMacro
  };

  CONFIG.M20E = M20E;
  CONFIG.Actor.documentClass = M20eActor;
  //add references to subclasses for use in the M20eActor constructor
  CONFIG.Actor.documentClasses = {
    "charmage": M20eMageActor,
    "npcmage": M20eMageActor
  }
  CONFIG.Item.documentClass = M20eItem;
  //add references to subclasses for use in the M20eItem constructor
  CONFIG.Item.documentClasses = {
    "rote": M20eRoteItem,
    "weapon": M20eRollableItem
  };

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('m20e', M20eActorSheet, { makeDefault: true });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('m20e', M20eItemSheet, {
    types: ["ability", "background", "meritflaw", "event", "misc"], //todo , add all the other base item types
    makeDefault: true
  });
  Items.registerSheet("m20e", M20eParadigmSheet, {
    types: ["paradigm"],
    makeDefault: true
  });
  //TODO : make rotes share the same item class and item sheet as other rollables.
  Items.registerSheet("m20e", M20eRoteSheet, {
    types: ["rote"],
    makeDefault: true
  });
  Items.registerSheet("m20e", M20eRollableSheet, {
    types: ["weapon"],//todo add other rollable types (wonders...)
    makeDefault: true
  });

  registerSystemSettings(); //system settings
  registerHotbarOverride(); //hack on the hotbar for shifKey on macros
  registerHandlebarsHelpers(); //all of our HB helpers
  preloadHandlebarsTemplates(); //preload all partials and some templates

  //DICE thingies
  CONFIG.Dice.MageRoll = dice.MageRoll; //store class here for later access
  CONFIG.Dice.rolls.push(dice.MageRoll); //make it official
  CONFIG.M20E.diceThrowApp = DiceDialogue; //store class here for later access
  CONFIG.Dice.terms["s"] = dice.DieSuccess; //new dice term
  dice.registerDieModifier(); //adds the 'xs' (success on explode) modifier
  dice.registerInitiative();

  //test shit here !


})

/* -------------------------------------------- */
/*  Other usefull Hooks                         */
/* -------------------------------------------- */

Hooks.once('ready', async function () {

  //display welcome message if needed
  if (!game.user.getFlag("mage-fr", "welcomeMessageShown")) {
    chat.welcomeMessage();
  }

  Hooks.on('hotbarDrop', DiceThrow.toMacro);
});

Hooks.on('renderChatLog', chat.addChatListeners);
Hooks.on('getChatLogEntryContext', chat.addChatMessageContextOptions);

