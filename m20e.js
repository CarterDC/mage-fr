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
import M20eActor from './module/documents/m20e-actor.js'
import M20eMageActor from './module/documents/m20e-mage-actor.js'
import M20eItem from './module/documents/m20e-item.js'
import M20eParadigmItem from './module/documents/m20e-paradigm-item.js'
import M20eRollableItem from './module/documents/m20e-rollable-item.js'
import M20eRoteItem from './module/documents/m20e-rote-item.js'
// Import Applications
import M20eActorSheet from './module/apps/sheets/m20e-actor-sheet.js'
import M20eMageActorSheet from './module/apps/sheets/mage-actor-sheet.js'
import M20eItemSheet from './module/apps/sheets/m20e-item-sheet.js'
import M20eAeSheet from './module/apps/sheets/m20e-ae-sheet.js'
import M20eParadigmSheet from './module/apps/sheets/paradigm-sheet.js'
import M20eRollableSheet from './module/apps/sheets/rollable-sheet.js'
import M20eRoteSheet from './module/apps/sheets/rote-sheet.js'

import DiceThrower from './module/dice/dice-thrower.js'
import DiceThrowerApp from './module/dice/dice-thrower-app.js'

// Other Imports
import { M20E } from './module/utils/config.js'
import { registerSystemSettings } from "./module/utils/settings.js";
import { registerHotbarOverride } from "./module/utils/macro.js";
import * as dice from "./module/dice/dice-helpers.js";
import * as utils from './module/utils/utils.js';
import { log } from "./module/utils/utils.js";
import * as chat from "./module/utils/chat.js";


/* -------------------------------------------- */
/*  System Initialization                       */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  log('Initialisation du système');

  game.m20e = { //store some things here for later access
    config: M20E,
    mageMacro: DiceThrower.fromMacro,
    socketCallbacks: {
      sacrificeWillpower: (messageId) => chat.sacrificeWillpower(messageId)
    }
  };

  CONFIG.M20E = M20E;
  CONFIG.M20E.stats = {}; //list of stats used by stats selection App (GM tools + rollables) 

  CONFIG.Actor.documentClass = M20eActor;
  //add references to subclasses for use in the M20eActor constructor
  CONFIG.Actor.documentClasses = {
    "charmage": M20eMageActor,
    "npcmage": M20eMageActor
  }
  CONFIG.Item.documentClass = M20eItem;
  //add references to subclasses for use in the M20eItem constructor
  CONFIG.Item.documentClasses = {
    "paradigm": M20eParadigmItem,
    "rote": M20eRoteItem,
    "weapon": M20eRollableItem
  };
  CONFIG.ChatMessage.documentClass = chat.M20eChatMessage;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet("m20e", M20eActorSheet, {
    types: ["npcsleeper"],
    makeDefault: true
  });
  Actors.registerSheet("m20e", M20eMageActorSheet, {
    types: ["charmage", "npcmage"],
    makeDefault: true
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('m20e', M20eItemSheet, {
    types: ["ability", "background", "meritflaw", "event", "misc", "contact"], //todo , add all the other base item types
    makeDefault: true
  });
  Items.registerSheet("m20e", M20eParadigmSheet, {
    types: ["paradigm"],
    makeDefault: true
  });
  Items.registerSheet("m20e", M20eRoteSheet, { //todo, make rotesheet an extension of rollable
    types: ["rote"],
    makeDefault: true
  });
  Items.registerSheet("m20e", M20eRollableSheet, {
    types: ["weapon"],//todo add other rollable types (wonders...)
    makeDefault: true
  });
  //ActiveEffect sheet
  CONFIG.ActiveEffect.sheetClass = M20eAeSheet;
  
  registerSystemSettings(); //system settings
  registerHotbarOverride(); //hack on the hotbar for shifKey on macros
  utils.registerHandlebarsHelpers(); //all of our HB helpers
  utils.preloadHandlebarsTemplates(); //preload all partials and some templates
  
  //DICE thingies
  CONFIG.M20E.DiceThrower.appClass = DiceThrowerApp; //store class here for later access
  CONFIG.Dice.MageRoll = dice.MageRoll; //store class here for later access
  CONFIG.Dice.rolls.push(dice.MageRoll); //Add it to the list of roll classes
  CONFIG.Dice.terms["s"] = dice.DieSuccess; //new dice term
  dice.registerDieModifier(); //adds the 'xs' (success on explode) modifier
  dice.registerInitiative();

  //declare socket
  game.socket.on('system.mage-fr', chat.onSocketReceived);

  //test shit here !

})

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {

  const sysVersion = game.system.data.version;
  //display welcome message or version warning
  if (!game.user.getFlag("mage-fr", "welcomeMessageShown") ) {
    chat.welcomeMessage();
  } else if ( sysVersion !== game.user.getFlag("mage-fr", `versionWarning`) ) {
    chat.versionWarningMessage(sysVersion);
  }

  //manages drops on th ehotbar (macros or throws)
  Hooks.on('hotbarDrop', DiceThrower.toMacro);

  //create a hook on rollMode setting change
  const onRollModeChange = function(newRollMode) {
    ChatLog._setRollMode(newRollMode);
    Hooks.callAll('updateCoreRollMode', newRollMode);
  };
  //todo : maybe put that in libwraper
  //replace the original onChange function (_setRollMode) with our own that has an extra Hooks call
  const rollModeSetting = game.settings.settings.get('core.rollMode');
  rollModeSetting.onChange = onRollModeChange;

  //create and display a GM panel if user is a GM (or assistant)
  if ( game.user.isGM ) {

  }
});

/* -------------------------------------------- */
/*  Other usefull Hooks                         */
/* -------------------------------------------- */
Hooks.on('renderSidebar', function(sideBarApp, html, appData) {
  log("onRenderSidebar");
});

Hooks.on("chatMessage", (chatLog, message, chatData) => {
  return chat.onProcessMessage(chatLog, message, chatData);
});
Hooks.on('renderChatLog', chat.addChatListeners);
Hooks.on('getChatLogEntryContext', chat.addChatMessageContextOptions);

//test shit here !

