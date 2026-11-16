/**
 * Shared constants and small helpers. No imports from other module files.
 */

export const MODULE_ID = "niks-dnd5e-effects-helper";

/** Setting keys. */
export const SETTINGS = {
  /** Client: open the visual builder instead of dnd5e's JSON editor for conditions. */
  conditionBuilder: "conditionBuilder"
};

/**
 * Localize a key below `NRB.`.
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  return game.i18n.localize(`NRB.${key}`);
}

/**
 * Localize and format a key below `NRB.`.
 * @param {string} key
 * @param {object} data
 * @returns {string}
 */
export function tf(key, data) {
  return game.i18n.format(`NRB.${key}`, data);
}

/**
 * Log an error to the console with the module prefix.
 * @param {...any} args
 */
export function logError(...args) {
  console.error(`${MODULE_ID} |`, ...args);
}
