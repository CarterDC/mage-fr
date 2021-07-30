import { RulesConfig } from './apps/rules-config.js'

class Dummy extends FormApplication {
  render(){
    window.open("https://discord.gg/er4TUtV", "_blank");
  }
}

export const registerSystemSettings = function() {

  Hooks.on('renderSettingsConfig', async function (app, html, data) {
    html.on('change', 'input', onInputChange);
  });

  /**
   * Show/hide all the settings that have a dependency to the setting that was just clicked
   * Note : as a conséquence, form is sumbitted and rerendered bypassing the submit button.
   * also, using the 'reset' button would F everything up, till world reload ^^
   */
  const onInputChange = async function(event) {
    const inputElem = event.currentTarget;
    const [moduleName, settingName] = inputElem.name.split('.');
    if ( moduleName !== game.system.id ) { return ;}
    if ( inputElem.dataset.dtype !== 'Boolean' ) { return; }

    //all settings that have the 'clicked setting' as a dependency
    const dependents = Array.from(game.settings.settings, ([key, value]) => (
      {key, value}
      )).filter( setting => (
        setting.key.split('.')[0] === moduleName && setting.value.dependency === settingName
      ));
    //if we got dependencies, update their config status, submit the form and rerender
    if ( dependents.length > 0 ) {
      dependents.forEach( dependent => {
        const newValue = {...dependent.value,...{config:inputElem.checked}};
        game.settings.settings.set(dependent.key, newValue);
      });
      await game.settings.sheet._onSubmit(event, {updateData:{[inputElem.name]:inputElem.checked},preventClose: true});
      game.settings.sheet.render(true);
    }
  }

  /**
   * Display button to open a link to Mage-fr discord server
   * uses dummy formApp
   */
  game.settings.registerMenu("mage-fr", "discordInvite", {
    name: "SETTINGS.discordInvite",
    label: "SETTINGS.discordInvite",
    hint: "SETTINGS.discordInviteHint",
    icon: "fab fa-discord",
    type: Dummy,
    restricted: false
  });

  /**
   * Display button to open the rules config panel
   */
   game.settings.registerMenu("mage-fr", "rulesConfig", {
    name: "SETTINGS.rulesConfig",
    label: "SETTINGS.rulesConfig",
    hint: "SETTINGS.rulesConfigHint",
    icon: "fas fa-dice",
    type: RulesConfig,
    restricted: false
  });

  /**
   * Display button to open the rules config panel
   */
   game.settings.register("mage-fr", "rules", {
    scope: "world",
    config: false,
    default: [{type: 'talent', value: 2}, {type: 'skill', value: 3}],
    type: Object
  });

  /**
   * Chosen compendium module name (scope of the compendiumCollections)
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
   * Base roll difficulty (threshold)
   */
  game.settings.register("mage-fr", "baseRollThreshold", {
    name: "SETTINGS.baseRollThreshold",
    scope: "world",
    config: true,
    default: 6,
    type: Number
  });

  /**
   * Whether specialisation rolls use the xs modifier
   */
  game.settings.register("mage-fr", "specialisationRule", {
    name: "SETTINGS.specialisationRule",
    hint: "SETTINGS.specialisationRuleHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /**
   * Whether specialisation rolls use the xs modifier
   */
  game.settings.register("mage-fr", "roteRule", {
    name: "SETTINGS.roteRule",
    hint: "SETTINGS.roteRuleHint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  /**
   * Whether to take into account the Health Malus to the dice pool
   */
  game.settings.register("mage-fr", "useHealthMalus", {
    name: "SETTINGS.useHealthMalus",
    hint: "SETTINGS.useHealthMalusHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /**
   * if useHealthMalus, should it also apply to magic rolls ?
   */
  game.settings.register("mage-fr", "useHealthMalusForMagic", {
    name: "SETTINGS.useHealthMalusForMagic",
    hint: "SETTINGS.useHealthMalusForMagicHint",
    scope: "world",
    config: game.settings.get('mage-fr', 'useHealthMalus'),
    default: false,
    type: Boolean,
    dependency: "useHealthMalus"
  })

  /**
   * Choice of 5 malus sets for untrained Talent, Skills and Knowledges
   */
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

  /**
   * Whether players can see their paradox points(and interract with them)
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