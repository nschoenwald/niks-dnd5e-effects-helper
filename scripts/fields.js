/**
 * The condition vocabulary: which roll data paths a condition can test, how they are labelled and edited, and the
 * conversion between dnd5e's filter JSON (`{k, o, v}` nodes, see `Filter` in dnd5e.mjs) and the builder's tree.
 *
 * All paths were traced in dnd5e 6.1.0:
 * - `roll.*` is set by the roll that collects the rules (Actor5e#rollSkill / #rollToolCheck / #rollD20Test,
 *   AttackActivity#getRollData, Activity#getDamageConfig, DamageRoll config building).
 * - `statuses.*` comes from Actor5e#getRollData (level for leveled conditions, otherwise 1).
 * - `item.*` / `activity.*` exist when the roll comes from an item or activity.
 */

import { t } from "./constants.js";

/* -------------------------------------------- */
/*  Operators                                   */
/* -------------------------------------------- */

/** Logical operators a group can use, in menu order. NOT is read as a one-child NOR. */
export const GROUP_OPERATORS = ["AND", "OR", "NOR", "NAND", "XOR"];

/** Comparisons offered by the builder. The keys are dnd5e's COMPARISON_FUNCTIONS names. */
export const COMPARISONS = {
  exact: { label: "Op.exact", multiple: false },
  in: { label: "Op.in", multiple: true },
  gt: { label: "Op.gt", multiple: false },
  gte: { label: "Op.gte", multiple: false },
  lt: { label: "Op.lt", multiple: false },
  lte: { label: "Op.lte", multiple: false },
  has: { label: "Op.has", multiple: false },
  hasany: { label: "Op.hasany", multiple: true },
  hasall: { label: "Op.hasall", multiple: true },
  icontains: { label: "Op.icontains", multiple: false },
  istartswith: { label: "Op.istartswith", multiple: false },
  empty: { label: "Op.empty", multiple: false }
};

const SELECT_OPS = ["exact", "in"];
const SET_OPS = ["has", "hasany", "hasall"];
const NUMBER_OPS = ["gte", "lte", "exact", "gt", "lt"];
const TEXT_OPS = ["exact", "icontains", "istartswith"];
const BOOLEAN_OPS = ["exact"];
const CUSTOM_OPS = Object.keys(COMPARISONS);

/* -------------------------------------------- */
/*  Choice helpers                              */
/* -------------------------------------------- */

/**
 * Turn a dnd5e config object into sorted select options.
 * @param {object} config
 * @param {function(object, string): string} [getLabel]
 * @returns {{value: string, label: string}[]}
 */
function fromConfig(config, getLabel) {
  getLabel ??= (c, k) => (typeof c === "string" ? c : c?.label ?? c?.name ?? k);
  return Object.entries(config ?? {})
    .map(([value, c]) => ({ value, label: game.i18n.localize(getLabel(c, value)) }))
    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
}

const ROLL_TYPES = ["ability", "skill", "tool", "attack", "initiative", "concentration", "death"];

const CHOICES = {
  rollType: () => ROLL_TYPES.map(value => ({ value, label: t(`RollType.${value}`) })),
  abilities: () => fromConfig(CONFIG.DND5E.abilities),
  skills: () => fromConfig(CONFIG.DND5E.skills),
  tools: () => fromConfig(CONFIG.DND5E.tools, (c, k) => dnd5e.documents.Trait.keyLabel(k, { trait: "tool" }) ?? k),
  attackClassifications: () => fromConfig(CONFIG.DND5E.attackClassifications),
  attackTypes: () => fromConfig(CONFIG.DND5E.attackTypes),
  attackModes: () => fromConfig(CONFIG.DND5E.attackModes),
  damageTypes: () => [
    ...fromConfig(CONFIG.DND5E.damageTypes),
    ...fromConfig(CONFIG.DND5E.healingTypes)
  ],
  physicalProperties: () => fromConfig(
    Object.fromEntries(Object.entries(CONFIG.DND5E.itemProperties).filter(([, c]) => c.isPhysical))
  ),
  itemProperties: () => fromConfig(CONFIG.DND5E.itemProperties),
  activityTypes: () => fromConfig(CONFIG.DND5E.activityTypes, (c, k) => c.documentClass?.metadata?.title ?? k),
  statuses: () => CONFIG.statusEffects
    .filter(s => s.id && s.name)
    .map(s => ({ value: s.id, label: game.i18n.localize(s.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
};

/* -------------------------------------------- */
/*  Field catalog                               */
/* -------------------------------------------- */

const D20 = ["d20", "attack", "check", "save"];
const ATTACK = ["d20", "attack", "damage", "healing"];
const DAMAGE = ["damage", "healing"];
const ALWAYS = [...D20, ...DAMAGE, "effect"];

/**
 * @typedef FieldDefinition
 * @property {string} id
 * @property {string} group          Menu group (localization key below `NRB.Group.`).
 * @property {string} [path]         Roll data path. Missing for fields with a `param`.
 * @property {"select"|"set"|"number"|"text"|"boolean"|"json"} input
 * @property {string[]} operators    Allowed comparisons, the first is the default.
 * @property {string[]} contexts     Change keys (and "effect") where the field is meaningful.
 * @property {function(): object[]} [choices]
 * @property {"status"|"path"} [param]  The field needs an extra parameter that becomes part of the path.
 */

/** @type {FieldDefinition[]} */
export const FIELDS = [
  // Roll
  { id: "rollType", group: "Roll", path: "roll.type", input: "select", operators: SELECT_OPS, contexts: D20,
    choices: CHOICES.rollType },
  { id: "ability", group: "Roll", path: "roll.ability", input: "select", operators: SELECT_OPS,
    contexts: [...D20, ...DAMAGE], choices: CHOICES.abilities },
  { id: "skill", group: "Roll", path: "roll.skill", input: "select", operators: SELECT_OPS,
    contexts: ["d20", "check"], choices: CHOICES.skills },
  { id: "tool", group: "Roll", path: "roll.tool", input: "select", operators: SELECT_OPS,
    contexts: ["d20", "check"], choices: CHOICES.tools },
  { id: "proficient", group: "Roll", path: "roll.proficient", input: "boolean", operators: BOOLEAN_OPS,
    contexts: ["d20", "check", "save"] },

  // Attack
  { id: "attackClassification", group: "Attack", path: "roll.attack.classification", input: "select",
    operators: SELECT_OPS, contexts: ATTACK, choices: CHOICES.attackClassifications },
  { id: "attackType", group: "Attack", path: "roll.attack.type", input: "select", operators: SELECT_OPS,
    contexts: ATTACK, choices: CHOICES.attackTypes },
  { id: "attackMode", group: "Attack", path: "roll.attack.mode", input: "select", operators: SELECT_OPS,
    contexts: ATTACK, choices: CHOICES.attackModes },

  // Damage
  { id: "damageType", group: "Damage", path: "roll.damage.type", input: "select", operators: SELECT_OPS,
    contexts: DAMAGE, choices: CHOICES.damageTypes },
  { id: "critical", group: "Damage", path: "roll.isCritical", input: "boolean", operators: BOOLEAN_OPS,
    contexts: DAMAGE },
  { id: "physicalProperties", group: "Damage", path: "roll.properties", input: "set", operators: SET_OPS,
    contexts: DAMAGE, choices: CHOICES.physicalProperties },

  // Item & activity
  { id: "itemName", group: "Item", path: "item.name", input: "text", operators: TEXT_OPS, contexts: ALWAYS },
  // `identifier` comes from ItemDescriptionTemplate, copied into the item's roll data with the rest of `system`.
  { id: "itemIdentifier", group: "Item", path: "item.identifier", input: "text", operators: ["exact", "in"],
    contexts: ALWAYS },
  { id: "itemProperties", group: "Item", path: "item.properties", input: "set", operators: SET_OPS,
    contexts: ALWAYS, choices: CHOICES.itemProperties },
  { id: "activityType", group: "Item", path: "activity.type", input: "select", operators: SELECT_OPS,
    contexts: ATTACK, choices: CHOICES.activityTypes },

  // Actor
  { id: "status", group: "Actor", param: "status", input: "number", operators: ["gte"], contexts: ALWAYS,
    choices: CHOICES.statuses },
  { id: "level", group: "Actor", path: "details.level", input: "number", operators: NUMBER_OPS, contexts: ALWAYS },
  { id: "cr", group: "Actor", path: "details.cr", input: "number", operators: NUMBER_OPS, contexts: ALWAYS },
  { id: "hpPct", group: "Actor", path: "attributes.hp.pct", input: "number", operators: NUMBER_OPS,
    contexts: ALWAYS },

  // Anything else
  { id: "custom", group: "Advanced", param: "path", input: "json", operators: CUSTOM_OPS, contexts: ALWAYS }
];

const FIELDS_BY_ID = Object.fromEntries(FIELDS.map(f => [f.id, f]));

/**
 * Look up a field definition.
 * @param {string} id
 * @returns {FieldDefinition}
 */
export function getField(id) {
  return FIELDS_BY_ID[id] ?? FIELDS_BY_ID.custom;
}

/**
 * Fields offered in a context, grouped for a select menu. Fields used by existing rules stay listed.
 * @param {string|null} context  Change key, "effect", or null for everything.
 * @returns {FieldDefinition[]}
 */
export function fieldsForContext(context) {
  if ( !context ) return FIELDS;
  return FIELDS.filter(f => f.contexts.includes(context));
}

/* -------------------------------------------- */
/*  Builder tree                                */
/* -------------------------------------------- */

/**
 * @typedef {{kind: "group", op: string, children: BuilderNode[]}} BuilderGroup
 * @typedef {{kind: "rule", field: string, param?: string, op: string, value: any}} BuilderRule
 * @typedef {BuilderGroup|BuilderRule} BuilderNode
 */

/**
 * Create an empty group.
 * @param {string} [op="AND"]
 * @returns {BuilderGroup}
 */
export function createGroup(op="AND") {
  return { kind: "group", op, children: [] };
}

/**
 * Create a rule for a field with its default operator and value.
 * @param {string} fieldId
 * @returns {BuilderRule}
 */
export function createRule(fieldId) {
  const field = getField(fieldId);
  const op = field.operators[0];
  const rule = { kind: "rule", field: field.id, op, value: null };
  if ( field.param === "status" ) rule.param = field.choices()[0]?.value ?? "";
  if ( field.param === "path" ) rule.param = "";
  rule.value = defaultValue(field, op);
  return rule;
}

/**
 * The starting value for a field and operator.
 * @param {FieldDefinition} field
 * @param {string} op
 * @returns {any}
 */
export function defaultValue(field, op) {
  if ( COMPARISONS[op]?.multiple ) return [];
  switch ( field.input ) {
    case "boolean": return true;
    case "number": return field.param === "status" ? 1 : 0;
    case "select":
    case "set": return field.choices?.()[0]?.value ?? "";
    case "json": return op === "empty" ? true : "";
    default: return "";
  }
}

/**
 * Adjust a rule's value after its operator changed (single value ↔ list).
 * @param {BuilderRule} rule
 * @param {string} op
 */
export function changeOperator(rule, op) {
  const wasMultiple = COMPARISONS[rule.op]?.multiple;
  const isMultiple = COMPARISONS[op]?.multiple;
  rule.op = op;
  if ( wasMultiple && !isMultiple ) rule.value = Array.isArray(rule.value) && rule.value.length ? rule.value[0]
    : defaultValue(getField(rule.field), op);
  else if ( !wasMultiple && isMultiple ) rule.value = (rule.value === "") || (rule.value === null) ? [] : [rule.value];
}

/* -------------------------------------------- */
/*  JSON → tree                                 */
/* -------------------------------------------- */

/**
 * Parse dnd5e filter JSON into a builder tree. The root is always a group.
 * @param {string} json
 * @returns {BuilderGroup}
 * @throws {Error} If the JSON can't be parsed.
 */
export function parseFilters(json) {
  const data = JSON.parse(json || "{}");
  if ( foundry.utils.isEmpty(data) ) return createGroup();
  if ( Array.isArray(data) ) return { kind: "group", op: "AND", children: data.map(parseNode) };
  const node = parseNode(data);
  return node.kind === "group" ? node : { kind: "group", op: "AND", children: [node] };
}

/**
 * Parse a single filter node.
 * @param {object} filter
 * @returns {BuilderNode}
 */
function parseNode(filter) {
  if ( !foundry.utils.isPlainObject(filter) ) throw new Error("Invalid filter node");
  const { k, v, o="exact" } = filter;

  // Logical operators
  if ( o === "NOT" ) return { kind: "group", op: "NOR", children: [parseNode(v)] };
  if ( GROUP_OPERATORS.includes(o) ) {
    const children = Array.isArray(v) ? v : (v ? [v] : []);
    return { kind: "group", op: o, children: children.map(parseNode) };
  }

  // Status: `statuses.<id>` ≥ level
  if ( (typeof k === "string") && k.startsWith("statuses.") && (o === "gte") && (typeof v === "number") ) {
    return { kind: "rule", field: "status", param: k.slice(9), op: o, value: v };
  }

  // Known field with a supported operator and a value of the right shape
  const field = FIELDS.find(f => f.path && (f.path === k));
  if ( field && field.operators.includes(o) && valueFits(field, o, v) ) {
    return { kind: "rule", field: field.id, op: o, value: v };
  }

  // Anything else is kept as it is
  return { kind: "rule", field: "custom", param: k ?? "", op: o, value: v };
}

/**
 * Whether a stored value can be edited with a field's controls.
 * @param {FieldDefinition} field
 * @param {string} op
 * @param {any} value
 * @returns {boolean}
 */
function valueFits(field, op, value) {
  if ( COMPARISONS[op]?.multiple ) return Array.isArray(value) && value.every(v => typeof v === "string");
  switch ( field.input ) {
    case "boolean": return typeof value === "boolean";
    case "number": return typeof value === "number";
    default: return typeof value === "string";
  }
}

/* -------------------------------------------- */
/*  Tree → JSON                                 */
/* -------------------------------------------- */

/**
 * Serialize a builder tree into the JSON string dnd5e stores. A root AND becomes a plain array, an empty root "{}".
 * @param {BuilderGroup} root
 * @returns {string}
 */
export function serializeFilters(root) {
  if ( !root.children.length ) return "{}";
  if ( root.op === "AND" ) return JSON.stringify(root.children.map(serializeNode));
  return JSON.stringify(serializeNode(root));
}

/**
 * Serialize one node.
 * @param {BuilderNode} node
 * @returns {object}
 */
function serializeNode(node) {
  if ( node.kind === "group" ) {
    if ( (node.op === "NOR") && (node.children.length === 1) ) return { o: "NOT", v: serializeNode(node.children[0]) };
    return { o: node.op, v: node.children.map(serializeNode) };
  }
  const field = getField(node.field);
  let k = field.path;
  if ( field.param === "status" ) k = `statuses.${node.param}`;
  else if ( field.param === "path" ) k = node.param;
  return { k, o: node.op, v: node.value };
}
