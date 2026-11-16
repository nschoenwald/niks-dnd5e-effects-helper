/**
 * Nik's DnD5e Effects Helper: entry point.
 */

import { MODULE_ID, SETTINGS } from "./constants.js";
import { onRenderChangeConfigKey } from "./attribute-picker.js";
import { interceptFilterEdit } from "./condition-builder.js";
import { onRenderActiveEffectSheet, onRenderEffectChangeConfig } from "./value-fields.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.conditionBuilder, {
    name: "NRB.Settings.ConditionBuilder.Name",
    hint: "NRB.Settings.ConditionBuilder.Hint",
    scope: "user",
    config: true,
    type: Boolean,
    default: true
  });

  // dnd5e's change configuration and effect sheet (dnd5e.applications.effects.*)
  Hooks.on("renderEffectChangeConfig", onRenderEffectChangeConfig);
  Hooks.on("renderEffectChangeConfig", onRenderChangeConfigKey);
  Hooks.on("renderActiveEffectSheet5e", onRenderActiveEffectSheet);

  // Every `<filters-input>`, wherever dnd5e renders one
  Hooks.on("renderApplicationV2", interceptFilterEdit);
});
