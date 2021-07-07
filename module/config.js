// Namespace
export const M20E = {};

M20E.WOUND_TYPE_BASHING = 1;
M20E.WOUND_TYPE_LETHAL = 2;
M20E.WOUND_TYPE_AGGRAVATED = 3;

M20E.abilitySubTypes = {
    talent: "M20E.subType.talent",
    skill: "M20E.subType.skill",
    knowledge: "M20E.subType.knowledge"
}


M20E.categoriesWithLocks = [
  "attributes",
  "abilities",
  "spheres",
  "description",
  "backgrounds",
  "meritsflaws",
  "chronic",
  "contacts",
  "rotes",
  "equipement"
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
  "chronic": "event",
  "contacts": "contact"
}

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

M20E.defaultImg = { // todo : find suitable svgs and add default for caterogies
  merit: "icons/svg/upgrade.svg",
  flaw: "icons/svg/downgrade.svg",
  background: "icons/svg/hanging-sign.svg",
  event: "icons/svg/book.svg",
  contact: "icons/svg/angel.svg",
  rote: "icons/svg/daze.svg",
  default: "icons/svg/item-bag.svg"
}

M20E.dragDropCategories = [
  "abilities",
  "backgrounds",
  "meritsflaws",
  "chronic",
  "contacts",
  "rotes"
]

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

M20E.itemSheetOptions = {
  paradigm:{
    width: 400,
    height: 500
  },
  ability:{
    width: 400,
    height: 415
  },
  fakeitem:{
    width: 400,
    height: 360
  },
  background:{
    width: 400,
    height: 310
  }
}