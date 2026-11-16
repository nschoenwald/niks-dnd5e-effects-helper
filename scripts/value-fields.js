/**
 * Readable value controls for dnd5e's rule change types in the change configuration (EffectChangeConfig) and readable
 * values in the effect sheet's change list (ActiveEffectSheet5e).
 *
 * dnd5e stores the value as a plain string. The value codes are the ones read by RulesIterator#toAdvantageCounts and
 * RulesIterator#toDamageApplicationOptions in dnd5e 6.1.0.
 */

import { t } from "./constants.js";

/** Advantage mode codes, in menu order. Aliases are the other spellings dnd5e accepts. */
const ADVANTAGE_MODES = [
  { value: "1", key: "Advantage", aliases: ["+1"] },
  { value: "-1", key: "Disadvantage" },
  { value: "=1", key: "ForceAdvantage", aliases: ["=+1"] },
  { value: "=-1", key: "ForceDisadvantage" },
  { value: ">=0", key: "NoDisadvantage" },
  { value: "<=0", key: "NoAdvantage" }
];

/** Change types whose value is a damage type (or "ALL"). */
const DAMAGE_OPTION_TYPES = new Set([
  "dnd5e.damage.downgrade", "dnd5e.damage.ignore.immunity", "dnd5e.damage.ignore.resistance",
  "dnd5e.damage.ignore.vulnerability"
]);

/* -------------------------------------------- */

/**
 * Normalize an advantage code to the value used in the menu.
 * @param {any} value
 * @returns {string}
 */
function normalizeAdvantage(value) {
  const string = String(value ?? "").trim();
  return ADVANTAGE_MODES.find(m => (m.value === string) || m.aliases?.includes(string))?.value ?? string;
}

/**
 * Options for a change type's value, or null if the type keeps the plain input.
 * @param {string} type
 * @returns {{value: string, label: string, hint?: string}[]|null}
 */
function valueOptions(type) {
  if ( type === "dnd5e.advantage" ) return ADVANTAGE_MODES.map(m => ({
    value: m.value, label: t(`Advantage.${m.key}.Label`), hint: t(`Advantage.${m.key}.Hint`)
  }));
  if ( DAMAGE_OPTION_TYPES.has(type) ) return [
    { value: "ALL", label: t("Damage.All") },
    ...Object.entries(CONFIG.DND5E.damageTypes)
      .map(([value, c]) => ({ value, label: game.i18n.localize(c.label) }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
  ];
  return null;
}

/**
 * Readable label for a rule change's value, or null if there is none.
 * @param {string} type
 * @param {any} value
 * @returns {string|null}
 */
function valueLabel(type, value) {
  const options = valueOptions(type);
  if ( !options ) return null;
  const normalized = type === "dnd5e.advantage" ? normalizeAdvantage(value) : String(value ?? "");
  return options.find(o => o.value === normalized)?.label ?? null;
}

/* -------------------------------------------- */
/*  Change configuration                        */
/* -------------------------------------------- */

/**
 * Replace the value input with a select for rule types that have a fixed set of values.
 * dnd5e re-renders the whole form when the type changes, so this runs again with the new type.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
export function onRenderEffectChangeConfig(app, element) {
  const type = element.querySelector('select[name$="type"]')?.value;
  const input = element.querySelector('input[name$="value"]');
  if ( !type || !input ) return;
  const options = valueOptions(type);
  if ( !options ) return;

  const current = type === "dnd5e.advantage" ? normalizeAdvantage(input.value) : input.value;
  // Keep a value the menu doesn't know about, so opening the window never changes the effect.
  if ( current && !options.some(o => o.value === current) ) options.push({ value: current, label: current });

  const select = foundry.applications.fields.createSelectInput({
    name: input.name, options, value: current || options[0].value
  });
  select.id = input.id;
  select.classList.add("nrb-value-select");
  input.replaceWith(select);

  // Explain the chosen advantage mode below the field.
  if ( type !== "dnd5e.advantage" ) return;
  const hint = document.createElement("p");
  hint.className = "hint nrb-value-hint";
  const updateHint = () => hint.textContent = options.find(o => o.value === select.value)?.hint ?? "";
  updateHint();
  select.addEventListener("change", updateHint);
  select.closest(".form-group")?.append(hint);
}

/* -------------------------------------------- */
/*  Effect sheet                                */
/* -------------------------------------------- */

/**
 * Show readable values for rule changes in the effect sheet's change list.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
export function onRenderActiveEffectSheet(app, element) {
  const changes = app.document?.system?.changes;
  if ( !changes?.length ) return;
  for ( const row of element.querySelectorAll("li.change[data-change-id]") ) {
    const change = changes.find(c => c._id === row.dataset.changeId);
    const label = change ? valueLabel(change.type, change.value) : null;
    const cell = row.querySelector(".effect-value");
    if ( !label || !cell ) continue;
    const span = document.createElement("span");
    span.className = "condensed";
    span.textContent = label;
    span.dataset.tooltip = String(change.value);
    cell.classList.remove("empty");
    cell.replaceChildren(span);
  }
}
