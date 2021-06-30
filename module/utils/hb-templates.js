/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
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
    // Item Sheet Partials
    "systems/mage-fr/templates/item/parts/header-block.hbs",
    "systems/mage-fr/templates/item/parts/nav-block.hbs",
    "systems/mage-fr/templates/item/parts/description-block.hbs"
  ]);
}