// Namespace
export const M20E = {
  //
  THROWMODE: {
    BLAND: 0b000,
    DEDUCT_FAILURES: 0b001,
    XPLODE_SUCCESS: 0b010,
    RESULT_CRITICAL: 0b100,
    DEFAULT: 0b101,
    XTRA: 0b111
  },
  WOUNDTYPE: {
    NONE: 0,
    BASHING: 1,
    LETHAL: 2,
    AGGRAVATED: 3
  },
  //subtypes
  abilitySubTypes: {
    talent: "M20E.subType.talent",
    skill: "M20E.subType.skill",
    knowledge: "M20E.subType.knowledge"
  },
  meritflawSubTypes: {
    merit: "M20E.subType.merit",
    flaw: "M20E.subType.flaw"
  },
  weaponSubTypes: {
    handtohand: "M20E.subType.handtohand",
    melee: "M20E.subType.melee",
    throw: "M20E.subType.throw",
    lightfire: "M20E.subType.lightfire",
    heavyfire: "M20E.subType.heavyfire"
  },
  damageTypes: {
    bashing: "M20E.damageType.bashing",
    lethal: "M20E.damageType.lethal",
    aggravated: "M20E.damageType.aggravated"
  },
  magickTypes: {
    coincidental: "M20E.magickType.coincidental",
    vulgar: "M20E.magickType.vulgar",
    vulgarWitness: "M20E.magickType.vulgarWitness"
  },
  resonnanceFlavors: {
    devotional: "M20E.resonnanceFlavor.devotional",
    elemental: "M20E.resonnanceFlavor.elemental",
    stabilizing: "M20E.resonnanceFlavor.stabilizing",
    temperamental: "M20E.resonnanceFlavor.temperamental"
  },
  synergyFlavors: {
    dynamic: "M20E.synergyFlavor.dynamic",
    entropic: "M20E.synergyFlavor.entropic",
    static: "M20E.synergyFlavor.static"
  },
  //defaults
  defaultAbilities: {
    alertness: 'talent',
    art: 'talent',
    athletics: 'talent',
    awareness: 'talent',
    brawl: 'talent',
    empathy: 'talent',
    expression: 'talent',
    intimidation: 'talent',
    leadership: 'talent',
    streetwise: 'talent',
    subterfuge: 'talent',
    crafts: 'skill',
    drive: 'skill',
    etiquette: 'skill',
    firearms: 'skill',
    martialarts: 'skill',
    meditation: 'skill',
    melee: 'skill',
    research: 'skill',
    stealth: 'skill',
    survival: 'skill',
    technology: 'skill',
    academics: 'knowledge',
    computer: 'knowledge',
    cosmology: 'knowledge',
    enigmas: 'knowledge',
    esoterica: 'knowledge',
    investigation: 'knowledge',
    law: 'knowledge',
    medicine: 'knowledge',
    occult: 'knowledge',
    politics: 'knowledge',
    science: 'knowledge'
  },
  defaultImg: {
    ability: "systems/mage-fr/assets/icons/auto-repair.svg",
    paradigm: "systems/mage-fr/assets/icons/abstract-013.svg",
    merit: "icons/svg/upgrade.svg",
    flaw: "icons/svg/downgrade.svg",
    background: "icons/svg/hanging-sign.svg",
    event: "icons/svg/book.svg",
    contact: "icons/svg/angel.svg",
    rote: "icons/svg/daze.svg",
    ActiveEffect: "icons/svg/upgrade.svg",
    handtohand: "systems/mage-fr/assets/icons/fist.svg",
    melee: "systems/mage-fr/assets/icons/sword-brandish.svg",
    throw: "systems/mage-fr/assets/icons/thrown-daggers.svg",
    lightfire: "systems/mage-fr/assets/icons/pistol-gun.svg",
    heavyfire: "systems/mage-fr/assets/icons/famas.svg",
    default: "icons/svg/item-bag.svg"
  },
  rollModeExtras: {
    gmroll: {
      icon: "fas fa-user-friends",
      title: "M20E.context.throwGmRoll"
    },
    blindroll: {
      icon: "fas fa-eye-slash",
      title: "M20E.context.throwBlindRoll",
    },
    selfroll: {
      icon: "fas fa-user",
      title: "M20E.context.throwSelfRoll"
    },
    roll: {
      icon: "fas fa-users",
      title: "M20E.context.throwPublicRoll"
    },
    stealth: {
      icon: "fas fa-user-secret",
      title: "M20E.context.throwStealthRoll"
    }
  },
  characterTokenConfig: {
    actorLink: true,
    disposition: CONST.TOKEN_DISPOSITIONS['FRIENDLY'],
    displayName: CONST.TOKEN_DISPLAY_MODES['HOVER'],
    displayBars: CONST.TOKEN_DISPLAY_MODES['ALWAYS']
  },

  spheres: [
    "forc",
    "matt",
    "life",
    "corr",
    "entr",
    "time",
    "spir",
    "prim",
    "mind"
  ],
  lockedCategories: [
    "attributes",
    "abilities",
    "magick",
    "spheres",
    "description",
    "backgrounds",
    "meritsflaws",
    "events",
    "contacts",
    "rotes",
    "equipables",
    "xp",
    "aeffects"
  ],
  protectedCategories: [
    "attributes",
    "abilities",
    "magick",
    "spheres",
    "backgrounds",
    "meritsflaws",
    "contacts"
  ],
  categoryToType:{
    aeffects: "ActiveEffect",
    abilities: "ability",
    talents: "talent",
    skills: "skill",
    knowledges: "knowledge",
    rotes: "rote",
    backgrounds : "background",
    meritsflaws: "meritflaw",
    merits: "merit",
    flaws: "flaw",
    events: "event",
    contacts: "contact",
    equipables: ["weapon", "miscequipable"]
  },
  traitToCat: {
    ability: "abilities",
    background: "backgrounds",
    contact: "contacts",
    talent: "talents",
    skill: "skills",
    knowledge: "knowledges"
  },
  equipablesTypes: { //itemtypes that are equipable=true
    weapon: "ITEM.TypeWeapon",
    miscequipable: "ITEM.TypeMiscequipable"
  },
  rollableCategories: [
    "attribute",
    "ability",
    "magick",
    "sphere",
    "willpower",
    "background",
    "contact"
  ],
  dragDropCategories: [
    "abilities",
    "backgrounds",
    "meritsflaws",
    "chronic",
    "contacts",
    "rotes",
    "equipables"
  ],
  extraDecorations: {//whatever the name, only the value is stored anyway
    extra0: "",
    extra1: "⮱",
    extra2: "⮚",
    extra3: "⮩",
    extra4: "♆",
    extra5: "⚠",
    extra6: "✠",
    extra7: "🗸",
    extra8: "⛧",
    extra9: "⛥"
  },

  DiceThrower: {} //for storing the app class
};


