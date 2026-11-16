# Changelog

All notable changes to Nik's DnD5e Effects Helper are documented in this file.

## [14.3.0] - 2026-11-15
### Added
- **Scale values from lists**: The attribute picker's scale value entries let you pick the class or feature and the scale value from lists instead of typing identifiers: the character's own scale values with their current values first, then every class and subclass in your world and compendiums. A warning shows when the scale value's type doesn't fit the entry.
- **References for values**: An @ button next to formula values inserts references like proficiency bonus, ability modifiers, class levels or scale values (including number of dice and die size) at the cursor.

## [14.2.0] - 2026-11-15
### Added
- **Attribute picker**: A button next to an effect change's attribute key opens a searchable list of about 80 attributes with readable names, from ability scores and skill bonuses to resistances, speeds, senses, special traits and token light. It shows what each attribute does, which change type to use, what value it expects and an example, and fills in the key for you.
- **Attribute info**: Under the attribute key, a short box explains the attribute you entered, warns when the change type usually doesn't fit, and the value field suggests possible values like damage types, conditions or proficiency levels.

## [14.1.0] - 2026-11-13
### Added
- **Item identifier condition**: Conditions can check the identifier of the item being used, for example to make a change apply only to rolls with a specific weapon or spell. "Is one of" accepts several identifiers.

## [14.0.0] - 2026-11-13
### Added
- **Readable advantage choices**: The Advantage Mode change offers a menu (Advantage, Disadvantage, Always advantage, Always disadvantage, Can't have disadvantage, Can't have advantage) with a short explanation, instead of codes like `=1` or `>=0`.
- **Damage type menus**: The Downgrade Immunity & Resistance and Ignore Immunity / Resistance / Vulnerability changes offer a menu of damage types, including "All damage types".
- **Readable values in the change list**: The effect's change list shows these values by name.
- **Visual condition builder**: Conditions on a change, and the conditions of a whole effect, are edited with menus: pick a field such as Skill, Attack type, Damage type or Condition, how to compare it, and the value. Conditions can be grouped with "all of", "any of" or "none of". The builder only offers fields that make sense for the roll the change applies to, and the JSON editor is still one click away.
