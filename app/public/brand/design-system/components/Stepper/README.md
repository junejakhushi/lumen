# Stepper

A minus / value / plus control for ring size or chain length.

- **Props:** `label`, `value` / `defaultValue`, `min`, `max`, `step`, `format(value)` (e.g. `v => "US " + v`), `onChange`, `hint`, `disabled`.
- Buttons are 48 × 46px; the ends disable at `min` / `max`. The value is announced politely.
- Use for ordered, bounded values. For a continuous visual size in AR use `SizeSlider`.
