# SegmentedControl

A one-of-few choice as a radio group; used for Metal (Yellow / White / Rose) and Karat (14 / 18 / 22).

- **Props:** `label` (small caps), `options` (strings or `{ value, label, swatch?, disabled? }`), `value` / `defaultValue`, `onChange(value)`, `disabled`.
- Arrow keys move the selection; only the selected option is in the tab order.
- Pass `swatch: "var(--metal-yellow)"` etc. to show a metal dot. A disabled option (e.g. 22K not offered in rose) is struck through as well as dimmed.
- Keep to 2–4 options with short labels.
