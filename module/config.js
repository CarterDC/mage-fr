// Namespace
export const M20E = {};

M20E.WOUND_TYPE_BASHING = 1;
M20E.WOUND_TYPE_LETHAL = 2;
M20E.WOUND_TYPE_AGGRAVATED = 3;

M20E.abilityType = {
    talent: "MAGE.subType.talent",
    skill: "MAGE.subType.skill",
    knowledge: "MAGE.subType.knowledge"
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


M20E.itemSheetOptions = {
  ability:{
    width: 400,
    height: 500
  },
  paradigm:{
    width: 400,
    height: 500,
    classes: ['mage']
  }

}