/**
 * Picker for roll data references (`@prof`, `@abilities.dex.mod`, `@scale.rogue.sneak-attack`, …) that inserts the
 * chosen reference into a change's value at the cursor.
 *
 * Paths checked in dnd5e 6.1.0: `prof` (CreatureTemplate#getRollData), `abilities.*.mod`, `attributes.hp.max`,
 * `attributes.spell.mod` / `.dc` (prepared in CharacterData/NPCData), `details.level`, `details.cr`,
 * `classes.<id>.levels` and `subclasses.<id>.levels` (CharacterData#getRollData), `scale.<item>.<scale>` (system.scale).
 */

import { t } from "./constants.js";
import { actorScaleSources, loadScales, registryScaleSources, scaleReferences, scaleTypeLabel } from "./scale-values.js";

const { ApplicationV2 } = foundry.applications.api;

/**
 * Insert a reference into an input at the cursor, joined with " + " when it follows a value.
 * @param {HTMLInputElement} input
 * @param {string} reference
 */
export function insertReference(input, reference) {
  const value = input.value;
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? start;
  const before = value.slice(0, start);
  const after = value.slice(end);
  let join = "";
  if ( /[+\-*/,]$/.test(before) ) join = " ";
  else if ( before.trim() && !/[(\s]$/.test(before) ) join = " + ";
  const text = `${join}${reference}`;
  input.value = before + text + after;
  input.focus();
  const position = before.length + text.length;
  input.setSelectionRange(position, position);
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/* -------------------------------------------- */

/**
 * @typedef ReferenceItem
 * @property {string} value   The reference, e.g. "@prof".
 * @property {string} label
 * @property {string} [note]  Extra text, e.g. the current value.
 */

/**
 * Fixed references, grouped.
 * @param {Actor5e|null} actor
 * @returns {{group: string, items: ReferenceItem[]}[]}
 */
function staticReferences(actor) {
  const groups = [];
  groups.push({ group: t("References.Group.Common"), items: [
    { value: "@prof", label: t("References.Prof") },
    { value: "@details.level", label: t("References.Level") },
    { value: "@details.cr", label: t("References.CR") },
    { value: "@attributes.hp.max", label: t("References.HPMax") },
    { value: "@attributes.spell.mod", label: t("References.SpellMod") },
    { value: "@attributes.spell.dc", label: t("References.SpellDC") }
  ] });

  groups.push({ group: t("References.Group.Abilities"), items: Object.entries(CONFIG.DND5E.abilities).flatMap(([k, c]) => {
    const label = game.i18n.localize(c.label);
    return [
      { value: `@abilities.${k}.mod`, label: game.i18n.format("NRB.References.AbilityMod", { ability: label }) },
      { value: `@abilities.${k}.value`, label: game.i18n.format("NRB.References.AbilityScore", { ability: label }) }
    ];
  }) });

  // Class levels: the actor's classes, or every known class when there's no actor.
  const classes = actor?.classes
    ? Object.entries(actor.classes).map(([identifier, item]) => ({ identifier, name: item.name, subclass: item.subclass }))
    : (dnd5e.registry?.classes?.options ?? []).map(o => ({ identifier: o.value, name: o.label }));
  const levelItems = [];
  for ( const { identifier, name, subclass } of classes ) {
    levelItems.push({ value: `@classes.${identifier}.levels`, label: game.i18n.format("NRB.References.ClassLevels", { name }) });
    if ( subclass ) levelItems.push({
      value: `@subclasses.${subclass.identifier}.levels`,
      label: game.i18n.format("NRB.References.ClassLevels", { name: subclass.name })
    });
  }
  if ( levelItems.length ) groups.push({ group: t("References.Group.Classes"), items: levelItems });
  return groups;
}

/**
 * Reference items for the scale values of one source.
 * @param {string} identifier
 * @param {string} name
 * @param {object[]} scales
 * @returns {ReferenceItem[]}
 */
function scaleItems(identifier, name, scales) {
  return scales.flatMap(scale => scaleReferences(identifier, scale).map(({ value, part }) => ({
    value,
    label: part === "Formula" ? `${name}: ${scale.title}` : `${name}: ${scale.title} – ${t(`ScalePart.${part}`)}`,
    note: part === "Formula" ? [scaleTypeLabel(scale.type), scale.display].filter(_ => _ !== undefined).join(": ") : ""
  })));
}

/* -------------------------------------------- */

export class ReferencePicker extends ApplicationV2 {
  /**
   * @param {object} options
   * @param {Actor5e|null} options.actor
   * @param {function(string): void} options.onSelect
   */
  constructor({ actor, onSelect, ...options }) {
    super(options);
    this.actor = actor;
    this.onSelect = onSelect;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["nrb-reference-picker"],
    window: {
      title: "NRB.References.Title",
      icon: "fa-solid fa-at",
      resizable: true
    },
    position: { width: 440, height: 520 }
  };

  /**
   * The open picker, so only one exists at a time.
   * @type {ReferencePicker|null}
   */
  static #open = null;

  /**
   * Open the picker.
   * @param {Actor5e|null} actor
   * @param {function(string): void} onSelect
   */
  static openFor(actor, onSelect) {
    this.#open?.close();
    this.#open = new this({ actor, onSelect });
    this.#open.render({ force: true });
  }

  /** @inheritDoc */
  _onClose(options) {
    super._onClose(options);
    if ( ReferencePicker.#open === this ) ReferencePicker.#open = null;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _renderHTML(context, options) {
    const root = document.createElement("div");
    root.className = "nrb-references";

    const intro = document.createElement("p");
    intro.className = "hint";
    intro.textContent = t(this.actor ? "References.IntroActor" : "References.IntroItem");
    const search = document.createElement("input");
    Object.assign(search, { type: "search", placeholder: t("References.Search") });
    search.addEventListener("input", () => this.#filter(search.value));

    const list = document.createElement("div");
    list.className = "nrb-picker-list";
    for ( const { group, items } of staticReferences(this.actor) ) list.append(this.#renderGroup(group, items));

    // Scale values: the actor's own with their current values, otherwise classes and subclasses to load on demand.
    if ( this.actor ) {
      const items = actorScaleSources(this.actor).flatMap(s => scaleItems(s.identifier, s.name, s.scales));
      if ( items.length ) list.append(this.#renderGroup(t("References.Group.Scale"), items));
    } else {
      for ( const source of registryScaleSources() ) list.append(this.#renderLazyGroup(source));
    }

    root.append(intro, search, list);
    return root;
  }

  /** @override */
  _replaceHTML(result, content, options) {
    content.replaceChildren(result);
    content.querySelector('input[type="search"]')?.focus();
  }

  /* -------------------------------------------- */

  /**
   * A group of reference buttons.
   * @param {string} label
   * @param {ReferenceItem[]} items
   * @returns {HTMLElement}
   */
  #renderGroup(label, items) {
    const section = document.createElement("section");
    section.className = "nrb-picker-group";
    const heading = document.createElement("h4");
    heading.textContent = label;
    section.append(heading, ...items.map(item => this.#renderItem(item, label)));
    return section;
  }

  /**
   * A collapsed group for a class or subclass whose scale values load when it's opened.
   * @param {object} source
   * @returns {HTMLElement}
   */
  #renderLazyGroup(source) {
    const details = document.createElement("details");
    details.className = "nrb-picker-group nrb-lazy-group";
    const summary = document.createElement("summary");
    summary.textContent = game.i18n.format("NRB.References.ScaleOf", { name: source.name });
    details.append(summary);
    details.dataset.search = `${source.name} ${source.identifier}`.toLocaleLowerCase(game.i18n.lang);
    details.addEventListener("toggle", async () => {
      if ( !details.open || details.dataset.loaded ) return;
      details.dataset.loaded = "1";
      const scales = await loadScales(source);
      const items = scaleItems(source.identifier, source.name, scales);
      if ( !items.length ) {
        const empty = document.createElement("p");
        empty.className = "hint";
        empty.textContent = t("Scale.None");
        details.append(empty);
      }
      details.append(...items.map(item => this.#renderItem(item, source.name)));
    });
    return details;
  }

  /**
   * A single reference button.
   * @param {ReferenceItem} item
   * @param {string} group
   * @returns {HTMLButtonElement}
   */
  #renderItem(item, group) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nrb-picker-item nrb-reference";
    const label = document.createElement("span");
    label.textContent = item.label;
    const code = document.createElement("code");
    code.textContent = item.value;
    button.append(label, code);
    if ( item.note ) {
      const note = document.createElement("span");
      note.className = "nrb-reference-note";
      note.textContent = item.note;
      button.append(note);
    }
    button.dataset.search = [item.label, item.value, group].join(" ").toLocaleLowerCase(game.i18n.lang);
    button.addEventListener("click", () => {
      this.onSelect?.(item.value);
      this.close();
    });
    return button;
  }

  /**
   * Show only references that match the search text.
   * @param {string} query
   */
  #filter(query) {
    const terms = query.toLocaleLowerCase(game.i18n.lang).split(/\s+/).filter(_ => _);
    for ( const group of this.element.querySelectorAll(".nrb-picker-group") ) {
      const items = group.querySelectorAll(".nrb-reference");
      let visible = 0;
      for ( const item of items ) {
        const show = terms.every(term => item.dataset.search.includes(term));
        item.hidden = !show;
        if ( show ) visible++;
      }
      // Unloaded class groups match on their name.
      const lazyMatch = group.dataset.search && terms.every(term => group.dataset.search.includes(term));
      group.hidden = !!terms.length && !visible && !lazyMatch;
    }
  }
}
