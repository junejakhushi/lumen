# StoneSwatch

A small faceted disc for choosing a stone: diamond, ruby, emerald, sapphire, pearl or polki. Group them with `SwatchGroup`.

- **StoneSwatch props:** `stone`, `selected`, `onSelect`, `showLabel`, `disabled` (draws a diagonal), `state` (docs only).
- **SwatchGroup props:** `kind` `"stone" | "metal"`, `options` (default all six stones or three metals), `value` / `defaultValue`, `onChange`, `label`, `showLabels`, `unavailable` (array of ids).
- Facets are flat polygons over a `gem-*` base (pearl gets one highlight, polki broad irregular facets). No gradients.
- The disc is 28px inside a 44px hit area; selection is a `control-line` ring with a surface-coloured gap. SwatchGroup is a radio group with arrow keys and announces the chosen stone by name.
