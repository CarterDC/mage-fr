
// Import Modules
import * as utils from './module/utils.js'
import { M20E } from './module/config.js'
import M20eActor from './module/actor/actor.js'
import M20eActorSheet from './module/actor/actor-sheet.js'
import M20eItem from './module/item/item.js'
import M20eItemSheet from './module/item/item-sheet.js'

Hooks.once('init', async function () {
  console.log('MAGE | Initialisation du système')

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
  Actors.registerSheet('mage', M20eActorSheet, { makeDefault: true });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('mage', M20eItemSheet, { makeDefault: true });

  //
  utils.preloadHandlebarsTemplates();
  utils.RegisterHandlebarsHelpers();

  //console.log('MAGE | config : ', CONFIG);
})

Hooks.on('createActor', async function (actor, options, userID) {

  //check current user is the one that triggered the création
  //(don't add abilities to the actor multiple times)
  if (userID != game.user.id) { return;}

})

Hooks.on('createItem', async function (item, options, userID) {

  //check current user is the one that triggered the création
  if (userID != game.user.id) { return; }


})
