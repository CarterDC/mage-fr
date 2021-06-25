export const registerSystemSettings = function() {
  /**
   * Register base roll difficulty (threshold)
   */
  game.settings.register("m20e", "baseRollThreshold", {
    name: "SETTINGS.baseRollThreshold",
    scope: "world",
    config: true,
    default: 6,
    type: Number
  });

  /**
   * Register wether players can see their paradox points setting
   */
   game.settings.register("m20e", "playersCanSeeParadoxPoints", {
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