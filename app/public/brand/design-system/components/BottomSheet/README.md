# BottomSheet

A sheet rising from the bottom for piece details, a saved look or a quick confirmation on mobile.

- **Props:** `open` (default true), `title`, `onClose` (pass `null` to hide the close button), `children`, `footer` (buttons), `inline` (positions inside a relative container, for demos).
- Gold hairline top edge, 2px top corners, no shadow; a `scrim` behind. Sheets take the current mode, so inside `data-theme="evening"` they turn ink.
- Keep one primary action in the footer.
