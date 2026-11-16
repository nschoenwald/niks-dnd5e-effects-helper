/**
 * Visual editor for dnd5e's FiltersField (rule conditions on a change, and the effect-wide conditions).
 *
 * dnd5e's `<filters-input>` dispatches a cancelable, bubbling "edit" event before it opens its JSON editor
 * (FiltersInputElement#onOpenEditor in dnd5e 6.1.0). `interceptFilterEdit` cancels it and opens this builder instead.
 * The builder writes the result back through the input's `value` setter, which refreshes dnd5e's breakdown and fires
 * the form's change event.
 */

import { MODULE_ID, SETTINGS, t } from "./constants.js";
import {
  COMPARISONS, GROUP_OPERATORS, changeOperator, createGroup, createRule, fieldsForContext, getField,
  parseFilters, serializeFilters
} from "./fields.js";

const { ApplicationV2 } = foundry.applications.api;
const { createSelectInput, createMultiSelectInput } = foundry.applications.fields;

/** Labels of dnd5e's change keys, used to tell the user which roll the conditions are checked against. */
const CONTEXT_LABELS = {
  d20: "DND5E.EFFECT.Change.Key.D20",
  attack: "DND5E.EFFECT.Change.Key.Attack",
  check: "DND5E.EFFECT.Change.Key.Check",
  save: "DND5E.EFFECT.Change.Key.Save",
  damage: "DND5E.EFFECT.Change.Key.Damage",
  healing: "DND5E.EFFECT.Change.Key.Healing"
};

/** Marks a `<filters-input>` whose next "edit" event should open dnd5e's own JSON editor. */
const BYPASS = "nrbBypass";

/** Open builders, so a second click brings the existing window forward. */
const OPEN = new WeakMap();

/* -------------------------------------------- */
/*  Interception                                */
/* -------------------------------------------- */

/** Elements that already have the listener. */
const WIRED = new WeakSet();

/**
 * Listen for dnd5e's filter "edit" event below an application's element. Called for every rendered ApplicationV2,
 * so it also works in detached windows, which have their own document.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
export function interceptFilterEdit(app, element) {
  if ( WIRED.has(element) || !element.querySelector("filters-input") ) return;
  WIRED.add(element);
  element.addEventListener("edit", event => {
    const input = event.target;
    if ( (input?.tagName !== "FILTERS-INPUT") || event.defaultPrevented ) return;
    if ( input.dataset[BYPASS] ) {
      delete input.dataset[BYPASS];
      return;
    }
    if ( !game.settings.get(MODULE_ID, SETTINGS.conditionBuilder) ) return;
    event.preventDefault();
    ConditionBuilder.openFor(input);
  });
}

/**
 * Open dnd5e's JSON editor for an input, skipping the builder once.
 * @param {HTMLElement} input
 */
function openRawEditor(input) {
  input.dataset[BYPASS] = "1";
  input.querySelector("button")?.click();
}

/**
 * Work out which roll the conditions are checked against.
 * @param {HTMLElement} input
 * @returns {string|null}  A change key ("attack", "damage", …), "effect" for effect-wide conditions, or null.
 */
function contextFor(input) {
  if ( input.name === "system.conditions" ) return "effect";
  const key = input.closest("form")?.querySelector('select[name$="key"]')?.value;
  return key in CONTEXT_LABELS ? key : null;
}

/* -------------------------------------------- */
/*  Application                                 */
/* -------------------------------------------- */

export class ConditionBuilder extends ApplicationV2 {
  /**
   * @param {object} options
   * @param {HTMLElement} options.input       The `<filters-input>` being edited.
   * @param {BuilderGroup} options.root        Parsed conditions.
   * @param {string|null} options.context     Roll the conditions apply to.
   */
  constructor({ input, root, context, ...options }) {
    super(options);
    this.input = input;
    this.root = root;
    this.context = context;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["nrb-condition-builder"],
    window: {
      title: "NRB.Builder.Title",
      icon: "fa-solid fa-filter",
      resizable: true,
      contentClasses: ["standard-form"]
    },
    position: { width: 680, height: "auto" },
    actions: {
      addRule: ConditionBuilder.#onAddRule,
      addGroup: ConditionBuilder.#onAddGroup,
      remove: ConditionBuilder.#onRemove,
      save: ConditionBuilder.#onSave,
      cancel: ConditionBuilder.#onCancel,
      rawJson: ConditionBuilder.#onRawJson
    }
  };

  /**
   * The conditions being edited.
   * @type {BuilderGroup}
   */
  root;

  /**
   * Show fields that don't apply to the current context.
   * @type {boolean}
   */
  showAll = false;

  /* -------------------------------------------- */
  /*  Factory                                     */
  /* -------------------------------------------- */

  /**
   * Open the builder for a `<filters-input>`, or bring an already open one forward.
   * @param {HTMLElement} input
   * @returns {ConditionBuilder|void}
   */
  static openFor(input) {
    const existing = OPEN.get(input);
    if ( existing?.rendered ) return existing.bringToFront();

    let root;
    try {
      root = parseFilters(input.value);
    } catch {
      // Hand-written JSON the builder can't read: never risk overwriting it.
      ui.notifications.warn("NRB.Builder.Unreadable", { localize: true });
      return openRawEditor(input);
    }

    const app = new this({ input, root, context: contextFor(input) });
    OPEN.set(input, app);
    app.render({ force: true, window: { windowId: input.ownerDocument.defaultView.id } });
    return app;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _renderHTML(context, options) {
    const content = document.createElement("div");
    content.className = "nrb-content";

    // Which roll these conditions are checked against
    const intro = document.createElement("p");
    intro.className = "hint";
    intro.textContent = this.context === "effect" ? t("Builder.IntroEffect")
      : this.context ? game.i18n.format("NRB.Builder.IntroRoll", { roll: game.i18n.localize(CONTEXT_LABELS[this.context]) })
        : t("Builder.IntroGeneric");
    content.append(intro);

    if ( this.context ) {
      const label = document.createElement("label");
      label.className = "nrb-show-all checkbox";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = this.showAll;
      box.dataset.role = "show-all";
      label.append(box, t("Builder.ShowAll"));
      content.append(label);
    }

    content.append(this.#renderGroup(this.root, ""));

    // JSON preview
    const details = document.createElement("details");
    details.className = "nrb-preview";
    const summary = document.createElement("summary");
    summary.textContent = t("Builder.Preview");
    const pre = document.createElement("pre");
    pre.textContent = this.#previewText();
    details.append(summary, pre);
    content.append(details);

    // Footer
    const footer = document.createElement("footer");
    footer.className = "form-footer";
    footer.innerHTML = `
      <button type="button" data-action="rawJson"><i class="fa-solid fa-code"></i>${t("Builder.RawJson")}</button>
      <button type="button" data-action="cancel"><i class="fa-solid fa-xmark"></i>${game.i18n.localize("Cancel")}</button>
      <button type="button" data-action="save"><i class="fa-solid fa-floppy-disk"></i>${game.i18n.localize("Save")}</button>`;
    content.append(footer);
    return content;
  }

  /* -------------------------------------------- */

  /** @override */
  _replaceHTML(result, content, options) {
    content.replaceChildren(result);
  }

  /* -------------------------------------------- */

  /**
   * Render a group and its children.
   * @param {BuilderGroup} group
   * @param {string} path  Index path of the group ("" for the root).
   * @returns {HTMLElement}
   */
  #renderGroup(group, path) {
    const element = document.createElement("fieldset");
    element.className = "nrb-group";
    element.dataset.path = path;

    const header = document.createElement("div");
    header.className = "nrb-group-header";
    const op = createSelectInput({
      options: GROUP_OPERATORS.map(value => ({ value, label: t(`GroupOp.${value}`) })),
      value: group.op
    });
    op.dataset.role = "group-op";
    op.dataset.path = path;
    header.append(op, this.#button("addRule", path, "fa-plus", "Builder.AddRule"),
      this.#button("addGroup", path, "fa-folder-plus", "Builder.AddGroup"));
    if ( path ) header.append(this.#button("remove", path, "fa-trash", "Builder.Remove"));
    element.append(header);

    const list = document.createElement("ol");
    list.className = "nrb-children unlist";
    group.children.forEach((child, i) => {
      const childPath = path ? `${path}.${i}` : String(i);
      const li = document.createElement("li");
      li.append(child.kind === "group" ? this.#renderGroup(child, childPath) : this.#renderRule(child, childPath));
      list.append(li);
    });
    if ( !group.children.length ) {
      const empty = document.createElement("li");
      empty.className = "nrb-empty hint";
      empty.textContent = t(path ? "Builder.EmptyGroup" : "Builder.EmptyRoot");
      list.append(empty);
    }
    element.append(list);
    return element;
  }

  /* -------------------------------------------- */

  /**
   * Render a single rule row: field, parameter, operator, value, remove.
   * @param {BuilderRule} rule
   * @param {string} path
   * @returns {HTMLElement}
   */
  #renderRule(rule, path) {
    const field = getField(rule.field);
    const row = document.createElement("div");
    row.className = "nrb-rule";
    row.dataset.path = path;

    // Field
    const fields = [...fieldsForContext(this.showAll ? null : this.context)];
    if ( !fields.includes(field) ) fields.push(field);
    const fieldSelect = createSelectInput({
      options: fields.map(f => ({ value: f.id, label: t(`Field.${f.id}`), group: t(`Group.${f.group}`) })),
      value: field.id
    });
    fieldSelect.dataset.role = "field";
    row.append(this.#withPath(fieldSelect, path));

    // Parameter (condition or custom path)
    if ( field.param === "status" ) {
      const options = field.choices();
      if ( rule.param && !options.some(o => o.value === rule.param) ) options.push({ value: rule.param, label: rule.param });
      const select = createSelectInput({ options, value: rule.param });
      select.dataset.role = "param";
      row.append(this.#withPath(select, path));
    } else if ( field.param === "path" ) {
      const input = document.createElement("input");
      Object.assign(input, { type: "text", value: rule.param ?? "", placeholder: "roll.type" });
      input.dataset.role = "param";
      row.append(this.#withPath(input, path));
    }

    // Operator
    if ( field.operators.length > 1 ) {
      const op = createSelectInput({
        options: field.operators.map(value => ({ value, label: t(COMPARISONS[value].label) })),
        value: rule.op
      });
      op.dataset.role = "op";
      row.append(this.#withPath(op, path));
    } else {
      const label = document.createElement("span");
      label.className = "nrb-op-label";
      label.textContent = t(field.param === "status" ? "Op.statusLevel" : COMPARISONS[rule.op].label);
      row.append(label);
    }

    // Value
    row.append(this.#withPath(this.#renderValue(field, rule), path));

    row.append(this.#button("remove", path, "fa-trash", "Builder.Remove"));
    return row;
  }

  /* -------------------------------------------- */

  /**
   * Create the value control for a rule.
   * @param {FieldDefinition} field
   * @param {BuilderRule} rule
   * @returns {HTMLElement}
   */
  #renderValue(field, rule) {
    const multiple = COMPARISONS[rule.op]?.multiple;
    let element;

    if ( (field.input === "boolean") || (rule.op === "empty") ) {
      element = createSelectInput({
        options: [{ value: "true", label: t("Builder.Yes") }, { value: "false", label: t("Builder.No") }],
        value: String(rule.value !== false)
      });
      element.dataset.type = "boolean";
    }

    else if ( field.choices && (field.param !== "status") ) {
      const options = field.choices();
      const values = multiple ? (rule.value ?? []) : [rule.value];
      for ( const v of values ) {
        if ( v && !options.some(o => o.value === v) ) options.push({ value: v, label: v });
      }
      if ( multiple ) {
        element = createMultiSelectInput({ options, value: rule.value ?? [] });
        element.dataset.type = "multi";
      } else {
        element = createSelectInput({ options, value: rule.value });
        element.dataset.type = "string";
      }
    }

    else if ( multiple && (field.input === "text") ) {
      element = foundry.applications.elements.HTMLStringTagsElement.create({ value: rule.value ?? [] });
      element.dataset.type = "multi";
    }

    else if ( field.input === "number" ) {
      element = document.createElement("input");
      Object.assign(element, { type: "number", value: rule.value ?? 0, step: "any" });
      if ( field.param === "status" ) element.min = 1;
      element.dataset.type = "number";
    }

    else {
      element = document.createElement("input");
      element.type = "text";
      const json = field.input === "json";
      element.value = json ? formatLoose(rule.value) : (rule.value ?? "");
      if ( json ) element.placeholder = t(multiple ? "Builder.JsonListPlaceholder" : "Builder.JsonPlaceholder");
      element.dataset.type = json ? "json" : "string";
    }

    element.dataset.role = "value";
    element.classList.add("nrb-value");
    return element;
  }

  /* -------------------------------------------- */

  /**
   * Create a small icon button.
   * @param {string} action
   * @param {string} path
   * @param {string} icon
   * @param {string} label
   * @returns {HTMLButtonElement}
   */
  #button(action, path, icon, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon fa-solid ${icon}`;
    button.dataset.action = action;
    button.dataset.path = path;
    button.dataset.tooltip = "";
    button.ariaLabel = t(label);
    return button;
  }

  /**
   * Tag a control with its node path.
   * @param {HTMLElement} element
   * @param {string} path
   * @returns {HTMLElement}
   */
  #withPath(element, path) {
    element.dataset.path = path;
    return element;
  }

  /**
   * Text shown in the JSON preview.
   * @returns {string}
   */
  #previewText() {
    return JSON.stringify(JSON.parse(serializeFilters(this.root)), null, 2);
  }

  /* -------------------------------------------- */
  /*  Event handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.element.addEventListener("change", this.#onChange.bind(this));
  }

  /** @inheritDoc */
  _onClose(options) {
    super._onClose(options);
    if ( OPEN.get(this.input) === this ) OPEN.delete(this.input);
  }

  /* -------------------------------------------- */

  /**
   * Find a node by its index path.
   * @param {string} path
   * @returns {BuilderNode}
   */
  #getNode(path) {
    if ( !path ) return this.root;
    return path.split(".").reduce((node, i) => node?.children?.[Number(i)], this.root);
  }

  /**
   * Find a node's parent group and its index in it.
   * @param {string} path
   * @returns {{parent: BuilderGroup, index: number}}
   */
  #getParent(path) {
    const parts = path.split(".");
    const index = Number(parts.pop());
    return { parent: this.#getNode(parts.join(".")), index };
  }

  /* -------------------------------------------- */

  /**
   * Update the tree from a changed control. Structural changes re-render, value edits only refresh the preview.
   * @param {Event} event
   */
  #onChange(event) {
    const target = event.target;
    const role = target.dataset?.role;
    if ( !role ) return;
    if ( role === "show-all" ) {
      this.showAll = target.checked;
      return this.render();
    }

    const node = this.#getNode(target.dataset.path);
    if ( !node ) return;
    switch ( role ) {
      case "group-op":
        node.op = target.value;
        break;
      case "field":
        Object.assign(node, createRule(target.value));
        return this.render();
      case "param":
        node.param = target.value.trim();
        break;
      case "op":
        changeOperator(node, target.value);
        return this.render();
      case "value":
        node.value = readValue(target);
        break;
    }
    const preview = this.element.querySelector(".nrb-preview pre");
    if ( preview ) preview.textContent = this.#previewText();
  }

  /* -------------------------------------------- */

  /**
   * @this {ConditionBuilder}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onAddRule(event, target) {
    const group = this.#getNode(target.dataset.path);
    group.children.push(createRule(fieldsForContext(this.context)[0].id));
    this.render();
  }

  /**
   * @this {ConditionBuilder}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onAddGroup(event, target) {
    const group = this.#getNode(target.dataset.path);
    const child = createGroup(group.op === "OR" ? "AND" : "OR");
    child.children.push(createRule(fieldsForContext(this.context)[0].id));
    group.children.push(child);
    this.render();
  }

  /**
   * @this {ConditionBuilder}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onRemove(event, target) {
    const { parent, index } = this.#getParent(target.dataset.path);
    parent.children.splice(index, 1);
    this.render();
  }

  /**
   * @this {ConditionBuilder}
   */
  static #onSave() {
    this.input.value = serializeFilters(this.root);
    this.close();
  }

  /**
   * @this {ConditionBuilder}
   */
  static #onCancel() {
    this.close();
  }

  /**
   * Hand the current state to dnd5e's JSON editor.
   * @this {ConditionBuilder}
   */
  static #onRawJson() {
    const input = this.input;
    input.value = serializeFilters(this.root);
    this.close();
    openRawEditor(input);
  }
}

/* -------------------------------------------- */
/*  Value helpers                               */
/* -------------------------------------------- */

/**
 * Read a value control, converting to the stored type.
 * @param {HTMLElement} element
 * @returns {any}
 */
function readValue(element) {
  switch ( element.dataset.type ) {
    case "boolean": return element.value === "true";
    case "number": {
      const number = Number(element.value);
      return Number.isFinite(number) ? number : 0;
    }
    case "multi": return Array.from(element.value ?? []);
    case "json": return parseLoose(element.value);
    default: return element.value;
  }
}

/**
 * Read a custom value: JSON where it parses (numbers, true/false, lists), otherwise the text itself.
 * @param {string} text
 * @returns {any}
 */
function parseLoose(text) {
  const trimmed = String(text ?? "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

/**
 * Show a custom value so that `parseLoose` reads it back unchanged.
 * @param {any} value
 * @returns {string}
 */
function formatLoose(value) {
  if ( value === null || value === undefined ) return "";
  if ( typeof value !== "string" ) return JSON.stringify(value);
  // Quote strings that would otherwise read back as something else (e.g. "1" or "true").
  return typeof parseLoose(value) === "string" ? value : JSON.stringify(value);
}
