// Namespace
export const M20E = {};

M20E.WOUND_TYPE_BASHING = 1; //not used atm
M20E.WOUND_TYPE_LETHAL = 2;
M20E.WOUND_TYPE_AGGRAVATED = 3;

M20E.abilitySubTypes = {
    talent: "M20E.subType.talent",
    skill: "M20E.subType.skill",
    knowledge: "M20E.subType.knowledge"
}

M20E.meritflawSubTypes = {
  merit: "M20E.subType.merit",
  flaw: "M20E.subType.flaw"
}

M20E.damageTypes = {
  bashing: "M20E.damageType.bashing",
  lethal: "M20E.damageType.lethal",
  aggravated: "M20E.damageType.aggravated"
}

M20E.weaponSubTypes = {
  handtohand: "M20E.subType.handtohand",
  melee: "M20E.subType.melee",
  throw: "M20E.subType.throw",
  lightfire: "M20E.subType.lightfire",
  heavyfire: "M20E.subType.heavyfire"
}

M20E.spheres = [
  "forc",
  "matt",
  "life",
  "corr",
  "entr",
  "time",
  "spir",
  "prim",
  "mind"
]

M20E.lockedCategories = [
  "attributes",
  "abilities",
  "spheres",
  "description",
  "backgrounds",
  "meritsflaws",
  "events",
  "contacts",
  "rotes",
  "equipables",
  "xp"
]

//
M20E.protectedCategories = [
  "attributes",
  "abilities",
  "spheres",
  "backgrounds",
  "meritsflaws",
  "arete"
]


M20E.categoryToType ={
  "abilities": "ability",
  "talents": "talent",
  "skills": "skill",
  "knowledges": "knowledge",
  "rotes": "rote",
  "backgrounds" : "background",
  "meritsflaws": "meritflaw",
  "merits": "merit",
  "flaws": "flaw",
  "events": "event",
  "contacts": "contact",
  "equipables": ["weapon", "miscequipable"]
}

M20E.equipablesTypes = { //itemtypes that are equipable=true
  "weapon": "ITEM.TypeWeapon",
  "miscequipable": "ITEM.TypeMiscequipable"
}

//categories that are actively checked for highlighted traits for dice throw creation
M20E.rollableCategories = [
  "attribute",
  "ability",
  "sphere",
  "willpower",
  "arete",
  "background",
  "contact"
]

M20E.rollModeExtras = {
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
}

//list of abilityKey/abilitySubtype for base abilities creation without CompendiumColl
M20E.defaultAbilities = {
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
}

M20E.defaultImg = { // todo : find suitable svgs and add default for categories
  ability: "systems/mage-fr/assets/icons/auto-repair.svg",
  paradigm: "systems/mage-fr/assets/icons/abstract-013.svg",
  merit: "icons/svg/upgrade.svg",
  flaw: "icons/svg/downgrade.svg",
  background: "icons/svg/hanging-sign.svg",
  event: "icons/svg/book.svg",
  contact: "icons/svg/angel.svg",
  rote: "icons/svg/daze.svg",
  default: "icons/svg/item-bag.svg"
}

//categories that implement drag/drop when unloked
M20E.dragDropCategories = [
  "abilities",
  "backgrounds",
  "meritsflaws",
  "chronic",
  "contacts",
  "rotes"
]

//useless but fun
M20E.extraDecorations = {//whatever the name, only the value is stored anyway
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
}

// default options for itemSheets depending on itemType
M20E.itemSheetOptions = {
  paradigm:{
    width: 400,
    height: 600
  }
}