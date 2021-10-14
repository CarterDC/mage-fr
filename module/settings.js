//import { RulesConfig } from './apps/rules-config.js'

class DummyDiscord extends FormApplication {
  render() {
    window.open("https://discord.gg/er4TUtV", "_blank");
  }
}

class DummyWiki extends FormApplication {
  render() {
    window.open("https://github.com/CarterDC/mage-fr/wiki", "_blank");
    /*new FrameViewer("https://github.com/CarterDC/mage-fr/wiki", {
      title: "Wiki Mage-Fr"
    }).render(true);
    doesn't work, too bad
    */
  }
}

export const registerSystemSettings = function () {

  Hooks.on('renderSettingsConfig', async function (app, html, data) {
    html.on('change', 'input', onInputChange);
  });

  /**
   * Show/hide all the settings that have a dependency to the setting that was just clicked
   * Note : as a conséquence, form is sumbitted and rerendered bypassing the submit button.
   * also, using the 'reset' button would F everything up, till world reload ^^
   */
  const onInputChange = async function (event) {
    const inputElem = event.currentTarget;
    const [moduleName, settingName] = inputElem.name.split('.');
    if (moduleName !== game.system.id) { return; }
    if (inputElem.dataset.dtype !== 'Boolean') { return; }

    //all settings that have the 'clicked setting' as a dependency
    const dependents = Array.from(game.settings.settings, ([key, value]) => (
      { key, value }
    )).filter(setting => (
      setting.key.split('.')[0] === moduleName && setting.value.dependency === settingName
    ));
    //if we got dependencies, update their config status, submit the form and rerender
    if (dependents.length > 0) {
      dependents.forEach(dependent => {
        const newValue = { ...dependent.value, ...{ config: inputElem.checked } };
        game.settings.settings.set(dependent.key, newValue);
      });
      await game.settings.sheet._onSubmit(event, { updateData: { [inputElem.name]: inputElem.checked }, preventClose: true });
      game.settings.sheet.render(true);
    }
  }

  const onSettingChange = async function (newValue, settingName) {
    Hooks.callAll('systemSettingChanged', newValue, settingName);
  }

  /**
   * Display button to open a link to Mage-fr discord server
   * uses Dummy formApp
   */
  game.settings.registerMenu("mage-fr", "discordInvite", {
    name: "SETTINGS.discordInvite",
    label: "SETTINGS.discordInvite",
    hint: "SETTINGS.discordInviteHint",
    icon: "fab fa-discord",
    type: DummyDiscord,
    restricted: false
  });

  /**
   * Display button to open an ingame frame of the wiki
   * uses Dummy formApp
   */
   game.settings.registerMenu("mage-fr", "openWiki", {
    name: "SETTINGS.openWiki",
    label: "SETTINGS.openWiki",
    hint: "SETTINGS.openWikiHint",
    icon: "fab fa-github",
    type: DummyWiki,
    restricted: false
  });

  /**
   * Base roll difficulty
   */
  game.settings.register("mage-fr", "difficultyBase", {
    name: "SETTINGS.difficultyBase",
    scope: "world",
    config: true,
    default: 6,
    type: Number,
    onChange: (newValue) => onSettingChange(newValue, 'difficultyBase')
  });

  /**
   * Choice of 5 malus sets for untrained Talent, Skills and Knowledges
   * penalty to the Difficulty
   */
  game.settings.register("mage-fr", "untrainedMalus", {
    name: "SETTINGS.untrainedMalus",
    hint: "SETTINGS.untrainedMalusHint",
    scope: "world",
    config: true,
    default: "01X",
    type: String
  });

  /**
   * Whether specialty rolls use the xs modifier
   */
  game.settings.register("mage-fr", "specialtyRule", {
    name: "SETTINGS.specialtyRule",
    hint: "SETTINGS.specialtyRuleHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /**
   * Whether rote rolls use the xs modifier
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
   * Whether players can remove aggravated wounds
   */
  game.settings.register("mage-fr", "playersCanRemoveAggravated", {
    name: "SETTINGS.playersCanRemoveAggravated",
    hint: "SETTINGS.playersCanRemoveAggravatedHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
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

  /**
 * Whether players will see visual cues of effect Difficulty recommandations
 */
  game.settings.register("mage-fr", "displayDifficultyCues", {
    name: "SETTINGS.displayDifficultyCues",
    hint: "SETTINGS.displayDifficultyCuesHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /**
   * Whether actor names can use the aliases system
   */
  game.settings.register("mage-fr", "allowAliases", {
    name: "SETTINGS.allowAliases",
    hint: "SETTINGS.allowAliasesHint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

}