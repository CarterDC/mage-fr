export const registerSystemSettings = function() {
  /**
   * Register desired compendium module name (scope)
   */
   game.settings.register("mage-fr", "compendiumScope", {
    name: "SETTINGS.compendiumScope",
    hint: "SETTINGS.compendiumScopeHint",
    scope: "world",
    config: true,
    default: "mage-packs-fr",
    type: String
  });

  /**
   * Register base roll difficulty (threshold)
   */
  game.settings.register("mage-fr", "baseRollThreshold", {
    name: "SETTINGS.baseRollThreshold",
    scope: "world",
    config: true,
    default: 6,
    type: Number
  });

  /**
   * Register wether players can see their paradox points setting
   */
   game.settings.register("mage-fr", "playersCanSeeParadoxPoints", {
    name: "SETTINGS.playersCanSeeParadoxPoints",
    hint: "SETTINGS.playersCanSeeParadoxPointsHint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  

    
    /**
   * TODO : 
   *
   *
   */
}