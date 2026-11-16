/**
 * Catalog of the standard (non-rule) active effect attribute keys of dnd5e actors: readable names, the change types
 * that make sense, the expected value and a usage tip.
 *
 * Source: the dnd5e wiki "Active Effect Guide" (marked up to date for 6.1.0), with every path checked against the
 * dnd5e 6.1.0 data models (CharacterData / NPCData schemas, RollConfigField, D20RollModificationField).
 * Character flags are read from CONFIG.DND5E.characterFlags, so their names and hints come from dnd5e itself.
 */

import { t } from "./constants.js";

/* -------------------------------------------- */
/*  Choice lists                                */
/* -------------------------------------------- */

/**
 * Sorted options from a dnd5e config object.
 * @param {object} config
 * @param {function(any, string): string} [getLabel]
 * @returns {{value: string, label: string}[]}
 */
function fromConfig(config, getLabel) {
  getLabel ??= (c, k) => (typeof c === "string" ? c : c?.label ?? c?.name ?? k);
  return Object.entries(config ?? {})
    .map(([value, c]) => ({ value, label: game.i18n.localize(getLabel(c, value)) }))
    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
}

/**
 * Options from a list of values with labels below `NRB.<prefix>.`.
 * @param {string} prefix
 * @param {string[]} values
 * @returns {{value: string, label: string}[]}
 */
function fromKeys(prefix, values) {
  return values.map(value => ({ value, label: t(`${prefix}.${value}`) }));
}

const traitLabel = trait => (c, k) => dnd5e.documents.Trait.keyLabel(k, { trait }) ?? k;

/** Choice lists, used for key parameters and value suggestions. */
const CHOICES = {
  ability: () => fromConfig(CONFIG.DND5E.abilities),
  skill: () => fromConfig(CONFIG.DND5E.skills),
  tool: () => fromConfig(CONFIG.DND5E.tools, traitLabel("tool")),
  attackType: () => ["mwak", "rwak", "msak", "rsak"].map(value => ({
    value, label: game.i18n.localize(CONFIG.DND5E.itemActionTypes[value] ?? value)
  })),
  damageType: () => fromConfig(CONFIG.DND5E.damageTypes),
  damageTypeOrAll: () => [{ value: "ALL", label: t("Damage.All") }, ...CHOICES.damageType()],
  condition: () => fromConfig(CONFIG.DND5E.conditionTypes, c => c.name),
  movement: () => fromConfig(CONFIG.DND5E.movementTypes),
  sense: () => fromConfig(CONFIG.DND5E.senses),
  encumbrance: () => fromKeys("Encumbrance", ["encumbered", "heavilyEncumbered", "maximum", "overall"]),
  size: () => Object.entries(CONFIG.DND5E.actorSizes)
    .map(([value, c]) => ({ value, label: game.i18n.localize(c.label) })),
  creatureType: () => fromConfig(CONFIG.DND5E.creatureTypes),
  terrain: () => [
    ...fromKeys("Terrain", ["all", "magical", "nonmagical"]),
    ...fromConfig(CONFIG.DND5E.difficultTerrainTypes)
  ],
  weapon: () => [
    ...fromConfig(CONFIG.DND5E.weaponProficiencies),
    ...fromConfig(CONFIG.DND5E.weaponIds, traitLabel("weapon"))
  ],
  weaponId: () => fromConfig(CONFIG.DND5E.weaponIds, traitLabel("weapon")),
  mastery: () => fromConfig(CONFIG.DND5E.weaponMasteries),
  armor: () => fromConfig(CONFIG.DND5E.armorProficiencies),
  proficiency: () => [0, 0.5, 1, 2].map(v => ({
    value: String(v), label: game.i18n.localize(CONFIG.DND5E.proficiencyLevels[v])
  })),
  saveProficiency: () => [0, 1].map(v => ({
    value: String(v), label: game.i18n.localize(CONFIG.DND5E.proficiencyLevels[v])
  })),
  mode: () => [["1", "Advantage"], ["-1", "Disadvantage"], ["0", "Normal"]]
    .map(([value, key]) => ({ value, label: t(`Mode.${key}`) })),
  boolean: () => [{ value: "true", label: t("Builder.Yes") }, { value: "false", label: t("Builder.No") }],
  lightAnimation: () => fromConfig(CONFIG.Canvas.lightAnimations)
};

/* -------------------------------------------- */
/*  Catalog                                     */
/* -------------------------------------------- */

/**
 * @typedef AttributeEntry
 * @property {string} id            Localization id below `NRB.Attr.` (Label, optional Tip).
 * @property {string} group         Localization id below `NRB.AttrGroup.`.
 * @property {string} key           Key pattern; `{name}` marks a parameter.
 * @property {Record<string, string>} [params]  Parameter name → CHOICES key, "text" for free input, or
 *                                              "scaleSource" / "scale" for the scale value pickers.
 * @property {string[]} [scaleTypes]  Scale value types the entry works with (ScaleValue advancement types).
 * @property {string[]} types       Change types that fit, the first is recommended.
 * @property {string} value         Value kind, localization id below `NRB.Value.`.
 * @property {string} [choices]     CHOICES key for value suggestions.
 * @property {string} [example]     Example value, shown as placeholder.
 * @property {boolean} [tip]        Has a tip (`NRB.Attr.<id>.Tip`).
 * @property {string} [label]       Ready label (character flags).
 * @property {string} [hint]        Ready tip (character flags).
 */

/** @type {AttributeEntry[]} */
const ENTRIES = [
  // Abilities
  { id: "abilityScore", group: "Abilities", key: "system.abilities.{ability}.value", params: { ability: "ability" },
    types: ["upgrade", "override", "add"], value: "number", example: "19", tip: true },
  { id: "abilityMax", group: "Abilities", key: "system.abilities.{ability}.max", params: { ability: "ability" },
    types: ["upgrade", "override"], value: "number", example: "22", tip: true },
  { id: "abilityCheckBonus", group: "Abilities", key: "system.abilities.{ability}.check.roll.bonus",
    params: { ability: "ability" }, types: ["add"], value: "formula", example: "+1" },
  { id: "abilityCheckMode", group: "Abilities", key: "system.abilities.{ability}.check.roll.mode",
    params: { ability: "ability" }, types: ["add", "override", "upgrade", "downgrade"], value: "mode",
    choices: "mode", example: "1", tip: true },
  { id: "abilitySaveBonus", group: "Abilities", key: "system.abilities.{ability}.save.roll.bonus",
    params: { ability: "ability" }, types: ["add"], value: "formula", example: "+1" },
  { id: "abilitySaveMode", group: "Abilities", key: "system.abilities.{ability}.save.roll.mode",
    params: { ability: "ability" }, types: ["add", "override", "upgrade", "downgrade"], value: "mode",
    choices: "mode", example: "1", tip: true },
  { id: "abilitySaveProficiency", group: "Abilities", key: "system.abilities.{ability}.proficient",
    params: { ability: "ability" }, types: ["upgrade"], value: "number", choices: "saveProficiency", example: "1" },
  { id: "abilityAttackBonus", group: "Abilities", key: "system.abilities.{ability}.attack.roll.bonus",
    params: { ability: "ability" }, types: ["add"], value: "formula", example: "+1" },
  { id: "abilityAttackMode", group: "Abilities", key: "system.abilities.{ability}.attack.roll.mode",
    params: { ability: "ability" }, types: ["add", "override", "upgrade", "downgrade"], value: "mode",
    choices: "mode", example: "-1", tip: true },
  { id: "allChecksBonus", group: "Abilities", key: "system.rolls.ability.check.bonus", types: ["add"],
    value: "formula", example: "+1" },
  { id: "allChecksMode", group: "Abilities", key: "system.rolls.ability.check.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "allChecksProficiency", group: "Abilities", key: "system.rolls.ability.check.proficiency",
    types: ["upgrade"], value: "number", choices: "proficiency", example: "0.5", tip: true },
  { id: "allSavesBonus", group: "Abilities", key: "system.rolls.ability.save.bonus", types: ["add"],
    value: "formula", example: "+@abilities.cha.mod" },
  { id: "allSavesMode", group: "Abilities", key: "system.rolls.ability.save.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "-1", tip: true },
  { id: "allSavesProficiency", group: "Abilities", key: "system.rolls.ability.save.proficiency",
    types: ["upgrade"], value: "number", choices: "saveProficiency", example: "1" },

  // Skills
  { id: "skillBonus", group: "Skills", key: "system.skills.{skill}.roll.bonus", params: { skill: "skill" },
    types: ["add"], value: "formula", example: "+1d4" },
  { id: "skillMode", group: "Skills", key: "system.skills.{skill}.roll.mode", params: { skill: "skill" },
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "skillProficiency", group: "Skills", key: "system.skills.{skill}.value", params: { skill: "skill" },
    types: ["upgrade"], value: "number", choices: "proficiency", example: "1", tip: true },
  { id: "skillPassive", group: "Skills", key: "system.skills.{skill}.bonuses.passive", params: { skill: "skill" },
    types: ["add"], value: "number", example: "+5" },
  { id: "skillMinimum", group: "Skills", key: "system.skills.{skill}.roll.min", params: { skill: "skill" },
    types: ["upgrade"], value: "number", example: "10", tip: true },
  { id: "allSkillsBonus", group: "Skills", key: "system.rolls.ability.skill.bonus", types: ["add"],
    value: "formula", example: "+1" },
  { id: "allSkillsMode", group: "Skills", key: "system.rolls.ability.skill.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "allSkillsProficiency", group: "Skills", key: "system.rolls.ability.skill.proficiency",
    types: ["upgrade"], value: "number", choices: "proficiency", example: "0.5", tip: true },

  // Tools
  { id: "toolBonus", group: "Tools", key: "system.tools.{tool}.roll.bonus", params: { tool: "tool" },
    types: ["add"], value: "formula", example: "+1" },
  { id: "toolProficiency", group: "Tools", key: "system.tools.{tool}.value", params: { tool: "tool" },
    types: ["upgrade"], value: "number", choices: "proficiency", example: "1", tip: true },
  { id: "allToolsBonus", group: "Tools", key: "system.rolls.ability.tool.bonus", types: ["add"],
    value: "formula", example: "+1" },
  { id: "allToolsProficiency", group: "Tools", key: "system.rolls.ability.tool.proficiency", types: ["upgrade"],
    value: "number", choices: "proficiency", example: "0.5", tip: true },

  // Attacks & damage
  { id: "attackBonus", group: "Attacks", key: "system.rolls.attack.{attackType}.bonus",
    params: { attackType: "attackType" }, types: ["add"], value: "formula", example: "+1" },
  { id: "attackMode", group: "Attacks", key: "system.rolls.attack.{attackType}.mode",
    params: { attackType: "attackType" }, types: ["add", "override", "upgrade", "downgrade"], value: "mode",
    choices: "mode", example: "1", tip: true },
  { id: "allAttacksBonus", group: "Attacks", key: "system.rolls.attack.bonus", types: ["add"], value: "formula",
    example: "+1" },
  { id: "allAttacksMode", group: "Attacks", key: "system.rolls.attack.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "damageBonus", group: "Attacks", key: "system.rolls.damage.{attackType}.bonus",
    params: { attackType: "attackType" }, types: ["add"], value: "formula", example: "1d6[fire]", tip: true },
  { id: "spellDC", group: "Attacks", key: "system.bonuses.spell.dc", types: ["add"], value: "number",
    example: "+1" },

  // Defenses
  { id: "acBonus", group: "Defenses", key: "system.attributes.ac.bonus", types: ["add"], value: "number",
    example: "+1" },
  { id: "acFormula", group: "Defenses", key: "system.attributes.ac.formulas", types: ["add"], value: "acFormula",
    example: "12 + @abilities.int.mod", tip: true },
  { id: "damageResistance", group: "Defenses", key: "system.traits.dr.value", types: ["add", "subtract"],
    value: "set", choices: "damageTypeOrAll", example: "fire", tip: true },
  { id: "damageImmunity", group: "Defenses", key: "system.traits.di.value", types: ["add", "subtract"],
    value: "set", choices: "damageTypeOrAll", example: "poison", tip: true },
  { id: "damageVulnerability", group: "Defenses", key: "system.traits.dv.value", types: ["add", "subtract"],
    value: "set", choices: "damageTypeOrAll", example: "cold", tip: true },
  { id: "damageModification", group: "Defenses", key: "system.traits.dm.amount.{damageType}",
    params: { damageType: "damageType" }, types: ["add"], value: "formula", example: "-3", tip: true },
  { id: "conditionImmunity", group: "Defenses", key: "system.traits.ci.value", types: ["add", "subtract"],
    value: "set", choices: "condition", example: "frightened", tip: true },

  // Hit points
  { id: "hpTempMax", group: "HitPoints", key: "system.attributes.hp.tempmax", types: ["add"], value: "number",
    example: "+5", tip: true },
  { id: "hpBonusOverall", group: "HitPoints", key: "system.attributes.hp.bonuses.overall", types: ["add"],
    value: "formula", example: "+@details.level" },
  { id: "hpBonusLevel", group: "HitPoints", key: "system.attributes.hp.bonuses.level", types: ["add"],
    value: "formula", example: "+2", tip: true },
  { id: "hpThreshold", group: "HitPoints", key: "system.attributes.hp.dt", types: ["override", "upgrade"],
    value: "number", example: "10", tip: true },
  { id: "hpMax", group: "HitPoints", key: "system.attributes.hp.max", types: ["override", "add"],
    value: "number", example: "50", tip: true },

  // Movement & senses
  { id: "speed", group: "Movement", key: "system.attributes.movement.speeds.{movement}",
    params: { movement: "movement" }, types: ["upgrade", "override", "add"], value: "formula", example: "30",
    tip: true },
  { id: "speedBonus", group: "Movement", key: "system.attributes.movement.bonus", types: ["add"],
    value: "formula", example: "+10", tip: true },
  { id: "speedMultiplier", group: "Movement", key: "system.attributes.movement.multiplier", types: ["multiply"],
    value: "number", example: "2", tip: true },
  { id: "hover", group: "Movement", key: "system.attributes.movement.hover", types: ["override"],
    value: "boolean", choices: "boolean", example: "true" },
  { id: "ignoredTerrain", group: "Movement", key: "system.attributes.movement.ignoredDifficultTerrain",
    types: ["add", "subtract"], value: "set", choices: "terrain", example: "nonmagical", tip: true },
  { id: "senseRange", group: "Movement", key: "system.attributes.senses.ranges.{sense}",
    params: { sense: "sense" }, types: ["upgrade", "override"], value: "number", example: "60", tip: true },

  // Traits & proficiencies
  { id: "size", group: "Traits", key: "system.traits.size", types: ["override", "upgrade"], value: "choice",
    choices: "size", example: "lg", tip: true },
  { id: "creatureType", group: "Traits", key: "system.details.type.value", types: ["override"], value: "choice",
    choices: "creatureType", example: "undead" },
  { id: "creatureSubtype", group: "Traits", key: "system.details.type.subtype", types: ["override"],
    value: "text", example: "elf" },
  { id: "weaponProficiency", group: "Traits", key: "system.traits.weaponProf.value", types: ["add", "subtract"],
    value: "set", choices: "weapon", example: "mar", tip: true },
  { id: "weaponMastery", group: "Traits", key: "system.traits.weaponProf.mastery.value",
    types: ["add", "subtract"], value: "set", choices: "weaponId", example: "longsword", tip: true },
  { id: "weaponMasteryBonus", group: "Traits", key: "system.traits.weaponProf.mastery.bonus",
    types: ["add", "subtract"], value: "set", choices: "mastery", example: "topple", tip: true },
  { id: "armorProficiency", group: "Traits", key: "system.traits.armorProf.value", types: ["add", "subtract"],
    value: "set", choices: "armor", example: "hvy", tip: true },

  // Spellcasting & other attributes
  { id: "proficiencyBonus", group: "Attributes", key: "system.attributes.prof", types: ["override", "add"],
    value: "number", example: "3" },
  { id: "initiativeBonus", group: "Attributes", key: "system.attributes.init.roll.bonus", types: ["add"],
    value: "formula", example: "+@prof" },
  { id: "initiativeMode", group: "Attributes", key: "system.attributes.init.roll.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "concentrationBonus", group: "Attributes", key: "system.attributes.concentration.roll.bonus",
    types: ["add"], value: "formula", example: "+@prof" },
  { id: "concentrationMode", group: "Attributes", key: "system.attributes.concentration.roll.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "concentrationLimit", group: "Attributes", key: "system.attributes.concentration.limit",
    types: ["override", "upgrade"], value: "number", example: "2" },
  { id: "deathSaveMode", group: "Attributes", key: "system.attributes.death.roll.mode",
    types: ["add", "override", "upgrade", "downgrade"], value: "mode", choices: "mode", example: "1", tip: true },
  { id: "attunementMax", group: "Attributes", key: "system.attributes.attunement.max", types: ["add"],
    value: "number", example: "+1" },
  { id: "encumbranceMultiplier", group: "Attributes", key: "system.attributes.encumbrance.multipliers.{threshold}",
    params: { threshold: "encumbrance" }, types: ["override"], value: "number", example: "2", tip: true },
  { id: "encumbranceBonus", group: "Attributes", key: "system.attributes.encumbrance.bonuses.{threshold}",
    params: { threshold: "encumbrance" }, types: ["add"], value: "formula", example: "+50" },

  // Class features
  { id: "scaleValue", group: "Scale", key: "system.scale.{classId}.{scaleId}.value",
    params: { classId: "scaleSource", scaleId: "scale" }, scaleTypes: ["number", "cr", "distance", "usage"],
    types: ["add", "override"], value: "number", example: "+1",
    tip: true },
  { id: "scaleNumber", group: "Scale", scaleTypes: ["dice"], key: "system.scale.{classId}.{scaleId}.number",
    params: { classId: "scaleSource", scaleId: "scale" }, types: ["add"], value: "number", example: "+1", tip: true },
  { id: "scaleFaces", group: "Scale", scaleTypes: ["dice"], key: "system.scale.{classId}.{scaleId}.faces",
    params: { classId: "scaleSource", scaleId: "scale" }, types: ["add", "override"], value: "number", example: "+2",
    tip: true },
  { id: "scaleModifiers", group: "Scale", scaleTypes: ["dice"], key: "system.scale.{classId}.{scaleId}.modifiers",
    params: { classId: "scaleSource", scaleId: "scale" }, types: ["add"], value: "text", example: "r=1", tip: true },

  // Sheet, token and items
  { id: "hiddenItems", group: "Sheet", key: "items.hidden", types: ["add"], value: "text",
    example: "spell:mage-hand", tip: true },
  { id: "name", group: "Sheet", key: "name", types: ["override"], value: "text", example: "{} (Enlarged)",
    tip: true },
  { id: "img", group: "Sheet", key: "img", types: ["override"], value: "text", example: "icons/svg/aura.svg" },
  { id: "lightDim", group: "Token", key: "token.light.dim", types: ["override", "upgrade"], value: "number",
    example: "40" },
  { id: "lightBright", group: "Token", key: "token.light.bright", types: ["override", "upgrade"],
    value: "number", example: "20" },
  { id: "lightColor", group: "Token", key: "token.light.color", types: ["override"], value: "color",
    example: "#a2642a" },
  { id: "lightAlpha", group: "Token", key: "token.light.alpha", types: ["override"], value: "number",
    example: "0.5" },
  { id: "lightAnimation", group: "Token", key: "token.light.animation.type", types: ["override"],
    value: "choice", choices: "lightAnimation", example: "torch" },
  { id: "lightNegative", group: "Token", key: "token.light.negative", types: ["override"], value: "boolean",
    choices: "boolean", example: "true", tip: true },
  { id: "light", group: "Token", key: "token.light", types: ["override"], value: "json",
    example: "{\"dim\": 40, \"bright\": 20, \"color\": \"#a2642a\", \"animation\": {\"type\": \"torch\"}}",
    tip: true }
];

/**
 * Character flag entries (Special Traits on the character sheet), built from dnd5e's config.
 * @returns {AttributeEntry[]}
 */
function flagEntries() {
  return Object.entries(CONFIG.DND5E.characterFlags ?? {}).map(([k, c]) => {
    const isBoolean = c.type === Boolean;
    const isNumber = c.type === Number;
    return {
      id: `flag-${k}`, group: "Flags", key: `flags.dnd5e.${k}`, types: ["override"],
      value: isBoolean ? "boolean" : isNumber ? "number" : "text",
      choices: isBoolean ? "boolean" : undefined,
      example: isBoolean ? "true" : c.placeholder !== undefined ? String(c.placeholder) : "",
      label: game.i18n.localize(c.name), hint: c.hint ? game.i18n.localize(c.hint) : ""
    };
  });
}

/* -------------------------------------------- */
/*  Access                                      */
/* -------------------------------------------- */

/** Group order in the picker. */
export const ATTRIBUTE_GROUPS = [
  "Abilities", "Skills", "Tools", "Attacks", "Defenses", "HitPoints", "Movement", "Traits", "Attributes", "Flags",
  "Scale", "Sheet", "Token"
];

let _entries;

/**
 * All entries, with compiled key patterns. Built on first use, after dnd5e's config is ready.
 * @returns {(AttributeEntry & {regex: RegExp, paramNames: string[]})[]}
 */
export function getAttributes() {
  _entries ??= [...ENTRIES, ...flagEntries()].map(entry => {
    const paramNames = [...entry.key.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    const pattern = entry.key.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, "([^.]+)");
    return { ...entry, paramNames, regex: new RegExp(`^${pattern}$`) };
  });
  return _entries;
}

/**
 * Readable label of an entry.
 * @param {AttributeEntry} entry
 * @returns {string}
 */
export function attributeLabel(entry) {
  return entry.label ?? t(`Attr.${entry.id}.Label`);
}

/**
 * Usage tip of an entry, or an empty string.
 * @param {AttributeEntry} entry
 * @returns {string}
 */
export function attributeTip(entry) {
  if ( entry.hint !== undefined ) return entry.hint;
  return entry.tip ? t(`Attr.${entry.id}.Tip`) : "";
}

/**
 * Find the entry for a concrete key, with its parameter values.
 * @param {string} key
 * @returns {{entry: object, params: Record<string, string>}|null}
 */
export function matchAttribute(key) {
  if ( !key ) return null;
  for ( const entry of getAttributes() ) {
    const match = entry.regex.exec(key);
    if ( match ) return { entry, params: Object.fromEntries(entry.paramNames.map((n, i) => [n, match[i + 1]])) };
  }
  return null;
}

/**
 * Build a concrete key from an entry and parameter values.
 * @param {AttributeEntry} entry
 * @param {Record<string, string>} params
 * @returns {string}
 */
export function buildKey(entry, params) {
  return entry.key.replace(/\{(\w+)\}/g, (m, name) => params[name] || m);
}

/**
 * Options for a parameter or value suggestion list.
 * @param {string} choices  CHOICES key.
 * @returns {{value: string, label: string}[]}
 */
export function attributeChoices(choices) {
  return CHOICES[choices]?.() ?? [];
}
