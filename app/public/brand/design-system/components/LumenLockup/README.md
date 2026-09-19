# LumenLockup

The Lumen wordmark: wide-tracked Cormorant small caps with one continuous gold wire, horizontal or stacked, with an optional “for [atelier]” line in Jost Light.

- **Props:** `layout` `"horizontal" | "stacked"`, `atelier` (the client’s name; renders “for The Atelier”), `prefix` (default “for”; `false` for none), `height` (mark height in px, default 40).
- Takes `text` for the letters and `control-line` for the wire, so it follows Paper and Evening automatically. Static files for print and third parties are in the Brand asset group.
- The atelier line is live text: never outline it, never set it in Cormorant, never enlarge it past the wordmark. Clear space around the lockup is the small-cap height on every side.
- Minimum size: 24px mark height horizontal, 32px stacked. Below that use `LumenMonogram`.
