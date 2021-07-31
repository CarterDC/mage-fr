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
import M20eActor from './module/actor/actor.js'
import M20eItem from './module/item/baseitem.js'
import M20eRoteItem from './module/item/rote-item.js'
// Import Applications
import M20eActorSheet from './module/actor/actor-sheet.js'
import M20eItemSheet from './module/item/baseitem-sheet.js'
import M20eParadigmSheet from './module/item/paradigm-sheet.js'
import M20eRoteSheet from './module/item/rote-sheet.js'
import DiceDialogue from './module/dice/dice-throw-dialog.js'
// Other Imports
import { M20E } from './module/config.js'
import { registerSystemSettings } from "./module/settings.js";
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
  //add references to subclasses for use in the M20eItem constructor
  //proprty names must be valid item types
  CONFIG.Item.documentClasses = {
    "rote": M20eRoteItem
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
  Items.registerSheet("m20e", M20eRoteSheet, {
    types: ["rote"],
    makeDefault: true
  });

  registerSystemSettings();
  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();

  //DICE thingies
  CONFIG.Dice.MageRoll = dice.MageRoll; //store class here for later use
  CONFIG.Dice.rolls.push(dice.MageRoll); //make it official
  CONFIG.M20E.diceThrowApp = DiceDialogue; //store class here for later use
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
  if ( !game.user.getFlag("mage-fr","welcomeMessageShown") ) {
    const msgTemplate = "systems/mage-fr/templates/chat/welcome-message.hbs";
    //prepare the template Data
    const templateData = game.i18n.localize('M20E.welcomeMessage');
    templateData.isGM = game.user.isGM;
    const module = game.modules.get(game.settings.get("mage-fr", "compendiumScope"));
    templateData.packModuleActivated = module && module.active;

    const htmlContent =  await renderTemplate(msgTemplate, templateData);
    //send message
    ChatMessage.create({
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: htmlContent,
      flavor: templateData.welcome,
      speaker: {alias: "Carter_DC"},
      whisper:[game.user.id]
    });
    //flag the user
    game.user.setFlag("mage-fr","welcomeMessageShown", true);
  }
});

Hooks.on('renderChatLog', (app, html, data) => chat.addChatListeners(html));


