
// Import Modules
import * as utils from './module/utils.js'
import { log } from "./module/utils.js";
import { M20E } from './module/config.js'
import { registerSystemSettings } from "./module/settings.js";
import M20eActor from './module/actor/actor.js'
import M20eActorSheet from './module/actor/actor-sheet.js'
import M20eItem from './module/item/item.js'
import M20eItemSheet from './module/item/baseitem-sheet.js'
import M20eParadigmSheet from './module/item/paradigm-sheet.js'

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

  // Register System Settings
  registerSystemSettings();

  utils.preloadHandlebarsTemplates();
  utils.RegisterHandlebarsHelpers();
})

Hooks.on('createActor', async function (actor, options, userID) {
  //todo :  maybe use precreate or something ?
  //check current user is the one that triggered the création
  //(don't add abilities to the actor multiple times)
  if ( userID != game.user.id ) { return;}

})

Hooks.on('createItem', async function (item, options, userID) {

  //check current user is the one that triggered the création
  if ( userID != game.user.id ) { return; }


})
