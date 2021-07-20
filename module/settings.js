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

  game.settings.register("mage-fr", "specialisationRule", {
    name: "SETTINGS.specialisationRule",
    hint: "SETTINGS.specialisationRuleHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("mage-fr", "roteRule", {
    name: "SETTINGS.roteRule",
    hint: "SETTINGS.roteRuleHint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("mage-fr", "useHealthMalus", {
    name: "SETTINGS.useHealthMalus",
    hint: "SETTINGS.useHealthMalusHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("mage-fr", "untrainedMalus", {
    name: "SETTINGS.untrainedMalus",
    hint: "SETTINGS.untrainedMalusHint",
    scope: "world",
    config: true,
    default: "123",
    type: String,
    choices: {
      "000": "SETTINGS.untrMalusNone",
      "001": "SETTINGS.untrMalusSoft",
      "012": "SETTINGS.untrMalusBalanced",
      "111": "SETTINGS.untrMalusMed",
      "123": "SETTINGS.untrMalusHard"
    }
  });

  game.settings.register("mage-fr", "defaultThrowSettings", {
    name: "SETTINGS.defaultThrowSettings",
    hint: "SETTINGS.defaultThrowSettingsHint",
    scope: "world",
    config: true,
    default: 1,
    type: Number,
    choices: {
      1 : "SETTINGS.throwSettingsBlandRoll",
      2 : "SETTINGS.throwSettingsDeductFailure",
      3 : "SETTINGS.throwSettingsDFXS"
    }
  });

  /**
   * Register wether players can see their paradox points setting
   */
   game.settings.register("mage-fr", "playersCanSeeParadoxPoints", {
    name: "SETTINGS.playersCanSeeParadoxPoints",
    hint: "SETTINGS.playersCanSeeParadoxPointsHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

}