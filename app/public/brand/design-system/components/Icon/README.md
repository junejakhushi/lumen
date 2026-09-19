# Icon

A 24px line icon from the Quiet Heritage set: 1.25px stroke, round joins, slightly calligraphic terminals, drawn in `currentColor`.

- **Props:** `name` (see `ICON_NAMES`: try-on and capture, jewellery types, metal/karat/stone/size/length/weight, booking and contact, system), `size` (default 20; use 24), `strokeWidth` (keep 1.25), `title` (gives the icon `role="img"` and an accessible name; without it the icon is decorative and hidden).
- Colour with CSS `color` on the parent: `text` or `text-muted`; ivory over the camera.
- The same drawings ship as single SVGs and `sprite.svg` (symbols `qh-<name>`) in the Icons asset group.
- Don’t: fill them, thicken the stroke above 1.5, mix with another icon family, or use an icon without a visible label or `aria-label`.
