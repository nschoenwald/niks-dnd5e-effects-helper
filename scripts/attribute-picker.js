/**
 * Attribute keys for the standard change types in dnd5e's change configuration (EffectChangeConfig):
 * - a button next to the key that opens a searchable picker of readable attribute names,
 * - an info box under the key with the recommended change type, the expected value, an example and a tip,
 * - value suggestions (a datalist) where the attribute takes one of a known set of values,
 * - a button next to formula values that inserts roll data references (see reference-picker.js).
 *
 * The key field is only a text input for change types without `keyOptions` (dnd5e's rule types use a select), so the
 * rule types are left alone. Enchantments target items, not actors, and are skipped as well.
 */

import { t } from "./constants.js";
import {
  ATTRIBUTE_GROUPS, attributeChoices, attributeLabel, attributeTip, buildKey, getAttributes, matchAttribute
} from "./attributes.js";
import { ReferencePicker, insertReference } from "./reference-picker.js";
import { allScaleSources, loadScales, scaleTypeLabel } from "./scale-values.js";

const { ApplicationV2 } = foundry.applications.api;
const { createSelectInput } = foundry.applications.fields;

/**
 * Localized label of a change type.
 * @param {string} type
 * @returns {string}
 */
function typeLabel(type) {
  return game.i18n.localize(ActiveEffect.CHANGE_TYPES[type]?.label ?? type);
}

/**
 * dnd5e's own label for a key, if it has one that differs from the key.
 * @param {string} key
 * @returns {string}
 */
function systemLabel(key) {
  try {
    const label = dnd5e.utils.getHumanReadableAttributeLabel(key);
    return label && (label !== key) ? game.i18n.localize(label) : "";
  } catch {
    return "";
  }
}

/* -------------------------------------------- */
/*  Change configuration                        */
/* -------------------------------------------- */

/**
 * Add the picker button, info box and value suggestions to the change configuration.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
export function onRenderChangeConfigKey(app, element) {
  if ( app.effect?.type === "enchantment" ) return;
  const keyInput = element.querySelector('input[name$="key"]');
  const typeSelect = element.querySelector('select[name$="type"]');
  if ( !keyInput || !typeSelect ) return;

  // Picker button
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon fa-solid fa-list-ul nrb-key-pick";
  button.dataset.tooltip = "";
  button.ariaLabel = t("Attributes.Pick");
  keyInput.after(button);

  // Info box
  const info = document.createElement("div");
  info.className = "nrb-key-info";
  keyInput.closest(".form-group")?.after(info);

  // Value suggestions
  const valueInput = element.querySelector('input[name$="value"]');
  const datalist = document.createElement("datalist");
  datalist.id = `${app.id}-nrb-values`;
  element.append(datalist);
  valueInput?.setAttribute("list", datalist.id);

  // Roll data references for formula values
  const actor = effectActor(app.effect);
  let refButton;
  if ( valueInput ) {
    refButton = document.createElement("button");
    refButton.type = "button";
    refButton.className = "icon fa-solid fa-at nrb-ref-pick";
    refButton.dataset.tooltip = "";
    refButton.ariaLabel = t("References.Pick");
    valueInput.after(refButton);
    refButton.addEventListener("click", () => {
      ReferencePicker.openFor(actor, ref => insertReference(valueInput, ref));
    });
  }

  const refresh = () => refreshInfo({
    key: keyInput.value.trim(), type: typeSelect.value, info, datalist, valueInput, refButton
  });
  refresh();
  keyInput.addEventListener("input", refresh);

  button.addEventListener("click", () => {
    AttributePicker.openFor(keyInput.value.trim(), actor, (key, entry) => {
      keyInput.value = key;
      if ( entry.types.includes(typeSelect.value) ) return refresh();
      // dnd5e re-renders the form on a type change and keeps the other form values, so the new key survives.
      typeSelect.value = entry.types[0];
      typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

/**
 * The actor an effect belongs to, directly or through its item.
 * @param {ActiveEffect5e} [effect]
 * @returns {Actor5e|null}
 */
function effectActor(effect) {
  const parent = effect?.parent;
  if ( parent instanceof Actor ) return parent;
  return parent?.actor ?? null;
}

/** Value kinds that take formulas, where roll data references help. */
const FORMULA_VALUES = new Set(["formula", "acFormula"]);

/**
 * Fill the info box and value suggestions for the current key.
 * @param {object} config
 * @param {string} config.key
 * @param {string} config.type
 * @param {HTMLElement} config.info
 * @param {HTMLDataListElement} config.datalist
 * @param {HTMLInputElement} [config.valueInput]
 * @param {HTMLButtonElement} [config.refButton]
 */
function refreshInfo({ key, type, info, datalist, valueInput, refButton }) {
  const match = matchAttribute(key);
  // Unknown keys keep the button: they may well take a formula.
  if ( refButton ) refButton.hidden = !!match && !FORMULA_VALUES.has(match.entry.value);
  info.replaceChildren();
  datalist.replaceChildren();
  if ( valueInput ) valueInput.placeholder = "";
  info.hidden = !match;
  if ( !match ) return;
  const { entry } = match;

  const title = document.createElement("strong");
  title.textContent = attributeLabel(entry);
  info.append(title);

  const types = document.createElement("p");
  types.textContent = game.i18n.format("NRB.Attributes.Types", {
    types: entry.types.map(typeLabel).join(", ")
  });
  info.append(types);

  if ( !entry.types.includes(type) ) {
    const warn = document.createElement("p");
    warn.className = "nrb-key-warning";
    warn.textContent = game.i18n.format("NRB.Attributes.TypeWarning", {
      type: typeLabel(type), recommended: typeLabel(entry.types[0])
    });
    info.append(warn);
  }

  const value = document.createElement("p");
  value.textContent = t(`Value.${entry.value}`);
  if ( entry.example ) {
    const code = document.createElement("code");
    code.textContent = entry.example;
    value.append(" ", t("Attributes.Example"), " ", code);
  }
  info.append(value);

  const tip = attributeTip(entry);
  if ( tip ) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = tip;
    info.append(p);
  }

  if ( valueInput && entry.example ) valueInput.placeholder = entry.example;
  if ( entry.choices ) {
    for ( const { value: v, label } of attributeChoices(entry.choices) ) {
      const option = document.createElement("option");
      option.value = v;
      option.label = label;
      datalist.append(option);
    }
  }
}

/* -------------------------------------------- */
/*  Picker                                      */
/* -------------------------------------------- */

export class AttributePicker extends ApplicationV2 {
  /**
   * @param {object} options
   * @param {string} [options.currentKey]                       Key in the change, preselected if known.
   * @param {Actor5e} [options.actor]                           Actor of the effect, for its scale values.
   * @param {function(string, object): void} options.onSelect   Called with the chosen key and its entry.
   */
  constructor({ currentKey, actor, onSelect, ...options }) {
    super(options);
    this.onSelect = onSelect;
    this.scaleSources = allScaleSources(actor);
    const match = matchAttribute(currentKey);
    this.selected = match?.entry ?? null;
    this.params = match?.params ?? {};
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["nrb-attribute-picker"],
    window: {
      title: "NRB.Attributes.Title",
      icon: "fa-solid fa-list-ul",
      resizable: true
    },
    position: { width: 760, height: 560 }
  };

  /**
   * The open picker, so only one exists at a time.
   * @type {AttributePicker|null}
   */
  static #open = null;

  /**
   * The scale select of the current detail pane, to ignore loads that finish after it was replaced.
   * @type {HTMLElement|null}
   */
  #scaleWrapper = null;

  /**
   * Open the picker.
   * @param {string} currentKey
   * @param {Actor5e|null} actor
   * @param {function(string, object): void} onSelect
   */
  static openFor(currentKey, actor, onSelect) {
    this.#open?.close();
    this.#open = new this({ currentKey, actor, onSelect });
    this.#open.render({ force: true });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _renderHTML(context, options) {
    const root = document.createElement("div");
    root.className = "nrb-picker";

    // List with search
    const side = document.createElement("div");
    side.className = "nrb-picker-side";
    const search = document.createElement("input");
    Object.assign(search, { type: "search", placeholder: t("Attributes.Search") });
    search.addEventListener("input", () => this.#filter(search.value));
    side.append(search, this.#renderList());

    const detail = document.createElement("div");
    detail.className = "nrb-picker-detail";

    root.append(side, detail);
    this.#renderDetail(detail);
    return root;
  }

  /** @override */
  _replaceHTML(result, content, options) {
    content.replaceChildren(result);
    content.querySelector(".nrb-picker-item.active")?.scrollIntoView({ block: "center" });
    content.querySelector('input[type="search"]')?.focus();
  }

  /** @inheritDoc */
  _onClose(options) {
    super._onClose(options);
    if ( AttributePicker.#open === this ) AttributePicker.#open = null;
  }

  /* -------------------------------------------- */

  /**
   * Build the grouped entry list.
   * @returns {HTMLElement}
   */
  #renderList() {
    const list = document.createElement("div");
    list.className = "nrb-picker-list";
    const entries = getAttributes();
    for ( const group of ATTRIBUTE_GROUPS ) {
      const items = entries.filter(e => e.group === group);
      if ( !items.length ) continue;
      const section = document.createElement("section");
      section.className = "nrb-picker-group";
      const heading = document.createElement("h4");
      heading.textContent = t(`AttrGroup.${group}`);
      section.append(heading);
      for ( const entry of items ) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "nrb-picker-item";
        item.classList.toggle("active", entry === this.selected);
        item.textContent = attributeLabel(entry);
        item.dataset.search = [attributeLabel(entry), entry.key, attributeTip(entry), t(`AttrGroup.${group}`)]
          .join(" ").toLocaleLowerCase(game.i18n.lang);
        item.addEventListener("click", () => {
          list.querySelector(".active")?.classList.remove("active");
          item.classList.add("active");
          this.#select(entry);
        });
        section.append(item);
      }
      list.append(section);
    }
    return list;
  }

  /**
   * Show only entries that match the search text.
   * @param {string} query
   */
  #filter(query) {
    const terms = query.toLocaleLowerCase(game.i18n.lang).split(/\s+/).filter(_ => _);
    for ( const section of this.element.querySelectorAll(".nrb-picker-group") ) {
      let visible = 0;
      for ( const item of section.querySelectorAll(".nrb-picker-item") ) {
        const show = terms.every(term => item.dataset.search.includes(term));
        item.hidden = !show;
        if ( show ) visible++;
      }
      section.hidden = !visible;
    }
  }

  /**
   * Select an entry and show its details.
   * @param {object} entry
   */
  #select(entry) {
    if ( entry !== this.selected ) this.params = {};
    this.selected = entry;
    this.#renderDetail(this.element.querySelector(".nrb-picker-detail"));
  }

  /* -------------------------------------------- */

  /**
   * Fill the detail pane for the selected entry.
   * @param {HTMLElement} detail
   */
  #renderDetail(detail) {
    detail.replaceChildren();
    const entry = this.selected;
    if ( !entry ) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = t("Attributes.Intro");
      detail.append(empty);
      return;
    }

    const heading = document.createElement("h3");
    heading.textContent = attributeLabel(entry);
    detail.append(heading);

    const tip = attributeTip(entry);
    if ( tip ) {
      const p = document.createElement("p");
      p.className = "nrb-picker-tip";
      p.textContent = tip;
      detail.append(p);
    }

    // Parameters
    const keyCode = document.createElement("code");
    const systemName = document.createElement("span");
    systemName.className = "hint";
    const useButton = document.createElement("button");
    const scaleWarning = document.createElement("p");
    scaleWarning.className = "nrb-key-warning";
    const update = () => {
      const key = buildKey(entry, this.params);
      keyCode.textContent = key;
      const complete = !/\{\w+\}/.test(key);
      useButton.disabled = !complete;
      systemName.textContent = complete ? systemLabel(key) : "";
      const type = this.scaleType;
      scaleWarning.hidden = !type || !entry.scaleTypes || entry.scaleTypes.includes(type);
      scaleWarning.textContent = scaleWarning.hidden ? "" : game.i18n.format("NRB.Scale.TypeMismatch", {
        type: scaleTypeLabel(type)
      });
    };
    this.scaleType = null;

    for ( const name of entry.paramNames ) {
      const kind = entry.params?.[name];
      let control;
      if ( kind === "scaleSource" ) control = this.#scaleSourceControl(name, entry, detail);
      else if ( kind === "scale" ) control = this.#scaleControl(name, entry, update);
      else if ( kind && (kind !== "text") ) {
        const options = attributeChoices(kind);
        this.params[name] ||= options[0]?.value ?? "";
        if ( this.params[name] && !options.some(o => o.value === this.params[name]) ) {
          options.push({ value: this.params[name], label: this.params[name] });
        }
        control = createSelectInput({ options, value: this.params[name] });
      } else {
        control = document.createElement("input");
        Object.assign(control, { type: "text", value: this.params[name] ?? "", placeholder: t(`Param.${name}Hint`) });
      }
      if ( !["scaleSource", "scale"].includes(kind) ) {
        control.addEventListener(control.tagName === "INPUT" ? "input" : "change", () => {
          this.params[name] = control.value.trim();
          update();
        });
      }
      detail.append(this.#row(t(`Param.${name}`), control));
    }
    if ( entry.scaleTypes ) detail.append(scaleWarning);

    // Key, types, value
    const keyBlock = document.createElement("div");
    keyBlock.append(keyCode, document.createElement("br"), systemName);
    detail.append(this.#row(t("Attributes.Key"), keyBlock));

    const types = document.createElement("span");
    types.textContent = entry.types.map((type, i) => (i === 0
      ? game.i18n.format("NRB.Attributes.Recommended", { type: typeLabel(type) }) : typeLabel(type))).join(", ");
    detail.append(this.#row(t("Attributes.Type"), types));

    const value = document.createElement("span");
    value.textContent = t(`Value.${entry.value}`);
    if ( entry.example ) {
      const code = document.createElement("code");
      code.textContent = entry.example;
      value.append(" ", t("Attributes.Example"), " ", code);
    }
    detail.append(this.#row(t("Attributes.Value"), value));

    if ( entry.choices ) {
      const choices = document.createElement("span");
      choices.className = "nrb-picker-choices";
      choices.textContent = attributeChoices(entry.choices).map(o => `${o.label} (${o.value})`).join(", ");
      detail.append(this.#row(t("Attributes.Choices"), choices));
    }

    useButton.type = "button";
    useButton.className = "nrb-picker-use";
    useButton.innerHTML = `<i class="fa-solid fa-check"></i>${t("Attributes.Use")}`;
    useButton.addEventListener("click", () => {
      this.onSelect?.(buildKey(entry, this.params), entry);
      this.close();
    });
    detail.append(useButton);
    update();
  }

  /**
   * Select of the items that grant scale values: the actor's own, then classes and subclasses from the registry.
   * Choosing one re-renders the detail pane, so the scale select loads that item's scale values.
   * @param {string} name     Parameter name.
   * @param {object} entry
   * @param {HTMLElement} detail
   * @returns {HTMLSelectElement}
   */
  #scaleSourceControl(name, entry, detail) {
    const groups = { actor: t("Scale.Own"), class: t("Scale.Classes"), subclass: t("Scale.Subclasses") };
    const options = this.scaleSources.map(s => ({ value: s.identifier, label: s.name, group: groups[s.origin] }));
    this.params[name] ||= options[0]?.value ?? "";
    if ( this.params[name] && !options.some(o => o.value === this.params[name]) ) {
      options.unshift({ value: this.params[name], label: this.params[name] });
    }
    const select = createSelectInput({ options, value: this.params[name], blank: options.length ? undefined : "" });
    select.addEventListener("change", () => {
      this.params[name] = select.value;
      for ( const [n, k] of Object.entries(entry.params) ) if ( k === "scale" ) this.params[n] = "";
      this.#renderDetail(detail);
    });
    return select;
  }

  /**
   * Select of the scale values of the chosen item, filled once they're loaded. Falls back to a text input when the
   * item isn't known or has no scale values.
   * @param {string} name       Parameter name.
   * @param {object} entry
   * @param {Function} update   Refreshes the key preview.
   * @returns {HTMLElement}
   */
  #scaleControl(name, entry, update) {
    const sourceParam = Object.entries(entry.params).find(([, k]) => k === "scaleSource")?.[0];
    const source = this.scaleSources.find(s => s.identifier === this.params[sourceParam]);
    const wrapper = this.#scaleWrapper = document.createElement("div");
    wrapper.className = "nrb-scale-control";

    const textInput = () => {
      const input = document.createElement("input");
      Object.assign(input, { type: "text", value: this.params[name] ?? "", placeholder: t(`Param.${name}Hint`) });
      input.addEventListener("input", () => {
        this.params[name] = input.value.trim();
        this.scaleType = null;
        update();
      });
      wrapper.replaceChildren(input);
    };
    if ( !source ) {
      textInput();
      return wrapper;
    }

    const loading = document.createElement("span");
    loading.className = "hint";
    loading.textContent = t("Scale.Loading");
    wrapper.append(loading);

    loadScales(source).then(scales => {
      // The detail pane was rebuilt meanwhile (another item or entry chosen).
      if ( this.#scaleWrapper !== wrapper ) return;
      if ( !scales.length ) {
        textInput();
        update();
        return;
      }
      // Prefer a scale value of a type this entry works with.
      const fits = scales.filter(s => !entry.scaleTypes || entry.scaleTypes.includes(s.type));
      if ( !scales.some(s => s.id === this.params[name]) ) this.params[name] = (fits[0] ?? scales[0]).id;
      const options = scales.map(s => ({
        value: s.id,
        label: `${s.title} (${scaleTypeLabel(s.type)}${s.display !== undefined ? `: ${s.display}` : ""})`
      }));
      const select = createSelectInput({ options, value: this.params[name] });
      const setType = () => this.scaleType = scales.find(s => s.id === select.value)?.type ?? null;
      select.addEventListener("change", () => {
        this.params[name] = select.value;
        setType();
        update();
      });
      setType();
      wrapper.replaceChildren(select);
      update();
    });
    return wrapper;
  }

  /**
   * A labelled row in the detail pane.
   * @param {string} label
   * @param {HTMLElement} content
   * @returns {HTMLElement}
   */
  #row(label, content) {
    const row = document.createElement("div");
    row.className = "form-group";
    const l = document.createElement("label");
    l.textContent = label;
    const fields = document.createElement("div");
    fields.className = "form-fields";
    fields.append(content);
    row.append(l, fields);
    return row;
  }
}
