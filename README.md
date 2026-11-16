# Nik's DnD5e Effects Helper

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-V14-orange.svg)](https://foundryvtt.com)
[![D&D 5e](https://img.shields.io/badge/D%26D%205e-6.1.0-red.svg)](https://github.com/foundryvtt/dnd5e)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/nschoenwald/niks-dnd5e-effects-helper?color=purple)](https://github.com/nschoenwald/niks-dnd5e-effects-helper/releases/latest)

Makes active effects in **D&D 5e** easy to set up for **Foundry VTT (v14)**: pick attributes by name instead of typing keys, see which change type and value they need, and set up the **rule** changes (advantage, roll bonuses, minimum and maximum rolls, ways past immunity and resistance) limited to exactly the rolls you want, without typing codes or JSON.

---

> [!NOTE]
> The module only fills in the effect fields D&D 5e already has. Effects made with it keep working for everyone, even without the module.

---

## ⚡ Quick Navigation

- [📋 Choosing Attributes](#-choosing-attributes)
- [🎲 What Rule Changes Are](#-what-rule-changes-are)
- [🎯 Readable Values](#-readable-values)
- [🧩 Condition Builder](#-condition-builder)
- [⚙️ Settings](#️-settings)
- [📦 Installation](#-installation)
- [❤️ Modules by Nik](#️-modules-by-nik)

---

## 📋 Choosing Attributes

For the standard change types (Add, Override, Upgrade and so on), the change configuration gets a **Choose attribute** button next to the attribute key.

- The picker lists about 80 attributes by name, grouped into Abilities & Saves, Skills, Tools, Attacks & Damage, Defenses, Hit Points, Movement & Senses, Traits & Proficiencies, Other Attributes, Special Traits, Class Scale Values, Sheet & Items, and Token Light. A search box filters them.
- For each attribute you see what it does, which change type to use, what kind of value it expects with an example, and the possible values where there's a fixed set.
- Attributes for one ability, skill, tool, attack type, damage type, speed or sense let you pick which one.
- **Class scale values** (Rages, Sneak Attack, Martial Arts and the like) are picked from lists: first the scale values of the character the effect is on, with their current values, then every class and subclass in your world and compendiums. The picker warns when a scale value's type doesn't fit, for example changing the number of dice of a scale value that isn't dice.
- **Use this attribute** fills in the key and switches to the recommended change type if the current one doesn't fit.

Under the key, a short box describes the attribute you typed or picked: its name, the change types that fit (with a warning if the chosen one usually doesn't), the expected value with an example, and a tip. The value field suggests the possible values, such as damage types, conditions, sizes or proficiency levels, and shows the example as a placeholder.

For formula values, an **@** button next to the value field opens a list of references to insert at the cursor: proficiency bonus, character level, challenge rating, hit point maximum, spellcasting modifier and DC, ability modifiers and scores, class and subclass levels, and scale values (for dice also the number of dice, die size and die). On a character's effect, scale values show their current value; elsewhere, open a class or subclass to see its scale values.

The Special Traits group lists D&D 5e's character flags (Jack of All Trades, Reliable Talent, Elven Accuracy and the rest) with D&D 5e's own descriptions. Enchantments, which change items rather than actors, keep the plain key field.

## 🎲 What Rule Changes Are

D&D 5e 6.1 adds change types to active effects that apply to rolls as they happen, instead of changing a number on the character sheet. In a change's configuration, pick the type from the **Rules** or **Damage Application Options** group:

| Type | Applies to | What it does |
|---|---|---|
| Advantage Mode | D20 tests, attack rolls, ability checks, saving throws | Gives advantage or disadvantage, or blocks one of them |
| Bonus | the rolls above, plus damage and healing | Adds a formula to the roll |
| Roll Minimum / Roll Maximum | D20 tests and the rolls above | Sets the lowest or highest the d20 can show |
| Downgrade Immunity & Resistance | damage | Immunity counts as resistance, resistance as normal damage |
| Ignore Immunity / Resistance / Vulnerability | damage | The target's immunity, resistance or vulnerability doesn't count |

Each change can have **conditions**, so it only applies to some rolls, for example only Stealth checks, only melee attacks or only fire damage.

## 🎯 Readable Values

- **Advantage Mode** offers a menu with a short explanation instead of codes: Advantage, Disadvantage, Always advantage, Always disadvantage, Can't have disadvantage, Can't have advantage.
- **Damage Application Options** offer a menu of damage types, including **All damage types**.
- The change list on the effect shows these values by name.

## 🧩 Condition Builder

Click the filter button next to **Conditions**, on a change or on the effect's Details tab, to open the builder.

- **Add condition**: pick a field, how to compare it, and the value. For example *Skill is Stealth*, *Attack type is Melee*, *Damage type is one of Fire, Cold*, *Item identifier is longsword* or *Condition Prone is active*.
- **Add group**: combine conditions with **All of these**, **Any of these** or **None of these**. Groups can be nested.
- The builder only offers fields that fit the roll the change applies to. Tick **Show fields for other rolls** to see everything.
- **Custom data path** covers anything that isn't in the list.
- **Edit JSON** switches to D&D 5e's own editor with what you built so far. The JSON preview at the bottom shows what will be saved.

Conditions on the effect itself work differently from those on a change: while they don't match, the whole effect is turned off. They are checked against the character, not a roll, so the builder offers character and item fields there.

Fields available:

| Group | Fields |
|---|---|
| Roll | Roll type, Ability, Skill, Tool, Proficient |
| Attack | Attack classification, Attack type, Attack mode |
| Damage | Damage type, Critical hit, Physical damage properties |
| Item & Activity | Item name, Item identifier, Item properties, Activity type |
| Actor | Condition, Character level, Challenge rating, Hit points (%) |
| Advanced | Custom data path |

## ⚙️ Settings

- **Visual Condition Builder** (per user, on by default): turn it off to always open D&D 5e's JSON editor.

## 📦 Installation

### Via Manifest URL
Paste the following manifest URL into Foundry's **Manifest URL** field:
```
https://github.com/nschoenwald/niks-dnd5e-effects-helper/releases/latest/download/module.json
```

Languages: English, German.

## ❤️ Modules by Nik

### 🧩 Nik's Tweaks
* **[Nik's Foundry Tweaks](https://github.com/nschoenwald/niks-foundry-tweaks)** – System-independent quality-of-life tweaks and the shared settings dashboard of Nik's Tweaks modules.

### 🎲 D&D 5e Specific
* **[Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks)** – Consolidated collection of quality-of-life enhancements and combat automation tweaks for DnD5e.
* **[Nik's Give & Take](https://github.com/nschoenwald/niks-give-and-take)** – Players hand items and money to other characters and the party, and take them from the party's stash.
* **[Nik's DnD5e Effects Helper](https://github.com/nschoenwald/niks-dnd5e-effects-helper)** – Set up active effects with readable attribute names, tips, scale values and references, plus rule changes and their conditions with menus instead of JSON.

### ⚔️ Combat & Token Tools
* **[Nik's Action HUD](https://github.com/nschoenwald/niks-action-hud)** – Sleek, modern canvas-docked Action HUD for quick access to attacks, spells, inventory, and utility rolls.
* **[Nik's Effects Panel](https://github.com/nschoenwald/niks-effects-panel)** – Floating panel next to the sidebar that shows the selected token's active effects, to check, disable or remove them without opening the character sheet.
* **[Nik's Token Tags](https://github.com/nschoenwald/niks-token-tags)** – Automatically numbers duplicate combatant NPCs (A, B, C…) with color-coded letter overlays.
* **[Nik's Shared NPC Initiative](https://github.com/nschoenwald/niks-shared-npc-initiative)** – Groups NPCs of the same type in combat so they share a single initiative roll.
* **[Nik's Movement Control](https://github.com/nschoenwald/niks-movement-control)** – GM controls to toggle player movement and automatically restrict/allow movement on combat start and end.
* **[Nik's Token Motion](https://github.com/nschoenwald/niks-token-motion)** – Tokens hop square by square like miniatures, lift and set down like chess pieces, or glide smoothly, and long moves no longer crawl across the map.
* **[Nik's Tiny Change Logs](https://github.com/nschoenwald/niks-tiny-changelogs)** – Compact, single-line chat messages logging token HP and Temp HP changes.

### 🎨 Visuals & Display
* **[Nik's Dynamic Roll Area](https://github.com/nschoenwald/niks-dynamic-roll-area)** – Dynamically restricts Dice So Nice 3D dice rolling area to exclude the sidebar / chat log across all screen resolutions and window sizes.

### ⚙️ Utilities & System Management
* **[Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks)** – Soft-lock and hard-lock client settings and keybindings across all connected players.
* **[Nik's Compendium Search Tweaks](https://github.com/nschoenwald/niks-compendium-search-tweaks)** – Configure which compendium packs are included or excluded from native sidebar search.
* **[Nik's Copy Environment](https://github.com/nschoenwald/niks-copy-environment)** – Copy the list of systems, modules, and versions, and export/import game and player settings.
* **[Nik's Show & Tell](https://github.com/nschoenwald/niks-show-and-tell)** – Share popout images to chat and paste image files directly into chat messages.
* **[Nik's Zoom / Pan Options](https://github.com/nschoenwald/niks-zoom-pan-options)** – Touchpad and scroll wheel pan/zoom controls and canvas navigation enhancements.
* **[Nik's Scene Transformations](https://github.com/nschoenwald/niks-scene-transformations)** – Rotate scenes or add playable space around them, with tokens, walls, lights, tiles and regions moved along so everything stays in place.
* **[Nik's Wall Height](https://github.com/nschoenwald/niks-wall-height)** – Give walls a bottom and top elevation, so tokens, lights and sounds above or below a wall ignore it.
* **[Nik's Scene Defaults](https://github.com/nschoenwald/niks-scene-defaults)** – Set your own defaults for new scenes (grid, vision, fog, lighting, background and more), so you don't have to change them on every scene.
