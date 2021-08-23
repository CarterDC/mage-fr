/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * 
 * 'Partials' are actually partials referenced in other hbs files
 * 'Templates' are just used by renderTemplate and listed here for convenience
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function () {
  return loadTemplates ([
    // Actor Sheet Partials
    "systems/mage-fr/templates/actor/parts/header-cat.hbs",
    "systems/mage-fr/templates/actor/parts/cat-banner.hbs",
    "systems/mage-fr/templates/actor/parts/attributes-cat.hbs",
    "systems/mage-fr/templates/actor/parts/abilities-cat.hbs",
    "systems/mage-fr/templates/actor/parts/spheres-cat.hbs",
    "systems/mage-fr/templates/actor/parts/bio-cat.hbs",
    "systems/mage-fr/templates/actor/parts/bg-cat.hbs",
    "systems/mage-fr/templates/actor/parts/mf-cat.hbs",
    "systems/mage-fr/templates/actor/parts/rotes-cat.hbs",
    "systems/mage-fr/templates/actor/parts/xp-cat.hbs",
    "systems/mage-fr/templates/actor/parts/events-cat.hbs",
    "systems/mage-fr/templates/actor/parts/a-effects-cat.hbs",
    "systems/mage-fr/templates/actor/parts/gear-cat.hbs",
    // Item Sheet Partials
    "systems/mage-fr/templates/item/parts/header-block.hbs",
    "systems/mage-fr/templates/item/parts/nav-block.hbs",
    "systems/mage-fr/templates/item/parts/description-block.hbs",
    //default descriptions Template
    "systems/mage-fr/templates/chat/default-descriptions.hbs",
    // Chat Templates
    "systems/mage-fr/templates/chat/trait-card.hbs",
    "systems/mage-fr/templates/chat/trait-flavor.hbs"
  ]);
}