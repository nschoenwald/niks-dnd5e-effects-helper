/**
 * Scale values (ScaleValue advancements) that effects can change or refer to.
 *
 * In dnd5e 6.1.0 `system.scale` on an actor is `{ [itemIdentifier]: { [scaleIdentifier]: ScaleValueType } }`,
 * built from every owned item with ScaleValue advancements (CreatureTemplate#_prepareScaleValues), and the same object
 * is the `@scale` roll data. Classes and subclasses that aren't owned come from dnd5e's item registry
 * (`dnd5e.registry.classes` / `.subclasses`), which only knows names, identifiers and source UUIDs, so their
 * advancements are read by loading the source item when it's chosen.
 */

/**
 * @typedef ScaleSource
 * @property {string} identifier   Item identifier (first part after `system.scale.` / `@scale.`).
 * @property {string} name         Item name.
 * @property {"actor"|"class"|"subclass"} origin
 * @property {string} [uuid]       Source item to load, for registry entries.
 */

/**
 * @typedef ScaleEntry
 * @property {string} id       Scale identifier.
 * @property {string} title    Advancement title.
 * @property {string} type     Scale type: string, number, cr, dice, distance, usage.
 * @property {string} [display]  Current value on the actor.
 */

/** Scale lists of registry items, by item UUID. */
const CACHE = new Map();

/**
 * Localized label of a scale value type.
 * @param {string} type
 * @returns {string}
 */
export function scaleTypeLabel(type) {
  const label = CONFIG.DND5E.advancementTypes.ScaleValue?.documentClass?.TYPES?.[type]?.metadata?.label;
  return label ? game.i18n.localize(label) : type;
}

/**
 * Scale entries of a loaded item.
 * @param {Item5e} item
 * @param {boolean} [withValues=false]  Include the current value (for owned items).
 * @returns {ScaleEntry[]}
 */
function scalesOfItem(item, withValues=false) {
  const advancements = item?.advancement?.byType?.ScaleValue ?? [];
  const values = withValues ? item.scaleValues ?? {} : {};
  return advancements.map(a => ({
    id: a.identifier,
    title: a.title,
    type: a.configuration.type,
    display: values[a.identifier]?.display !== undefined ? String(values[a.identifier].display) : undefined
  }));
}

/**
 * Items of an actor that grant scale values.
 * @param {Actor5e} [actor]
 * @returns {(ScaleSource & {scales: ScaleEntry[]})[]}
 */
export function actorScaleSources(actor) {
  if ( !actor?.items ) return [];
  return actor.items
    .filter(item => item.advancement?.byType?.ScaleValue?.length)
    .map(item => ({ identifier: item.identifier, name: item.name, origin: "actor", scales: scalesOfItem(item, true) }))
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

/**
 * Classes and subclasses from dnd5e's registry (world items and compendiums).
 * @returns {ScaleSource[]}
 */
export function registryScaleSources() {
  const sources = [];
  for ( const origin of ["class", "subclass"] ) {
    const registry = dnd5e.registry?.[`${origin}es`];
    for ( const { value } of registry?.options ?? [] ) {
      const data = registry.get(value);
      if ( data?.sources?.length ) sources.push({ identifier: value, name: data.name, origin, uuid: data.sources[0] });
    }
  }
  return sources;
}

/**
 * Scale entries for a source, loading the item if needed.
 * @param {ScaleSource & {scales?: ScaleEntry[]}} source
 * @returns {Promise<ScaleEntry[]>}
 */
export async function loadScales(source) {
  if ( source.scales ) return source.scales;
  if ( !source.uuid ) return [];
  if ( !CACHE.has(source.uuid) ) {
    CACHE.set(source.uuid, fromUuid(source.uuid).then(item => scalesOfItem(item)).catch(() => []));
  }
  return CACHE.get(source.uuid);
}

/**
 * All sources for a picker: the actor's own first, then registry classes and subclasses the actor doesn't have.
 * @param {Actor5e} [actor]
 * @returns {(ScaleSource & {scales?: ScaleEntry[]})[]}
 */
export function allScaleSources(actor) {
  const own = actorScaleSources(actor);
  const known = new Set(own.map(s => s.identifier));
  return [...own, ...registryScaleSources().filter(s => !known.has(s.identifier))];
}

/**
 * Roll data references for a scale value.
 * @param {string} itemIdentifier
 * @param {ScaleEntry} scale
 * @returns {{value: string, part: string}[]}  `part` is a localization id below `NRB.ScalePart.`.
 */
export function scaleReferences(itemIdentifier, scale) {
  const base = `@scale.${itemIdentifier}.${scale.id}`;
  const refs = [{ value: base, part: "Formula" }];
  if ( scale.type === "dice" ) refs.push(
    { value: `${base}.number`, part: "Number" },
    { value: `${base}.faces`, part: "Faces" },
    { value: `${base}.die`, part: "Die" }
  );
  return refs;
}
