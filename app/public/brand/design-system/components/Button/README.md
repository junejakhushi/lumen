# Button

Buttons carry one action each; `primary` (ruby) at most once per view, for the step that moves toward a consultation.

- **Props:** `variant` `"primary" | "secondary" | "quiet"` (default primary), `size` `"md" | "sm"` (48 / 44px), `block`, `icon` (an `Icon` name shown after the label, e.g. `"arrow-right"`), `href` (renders an `<a>`), `disabled`, `state` (forces a visual state for documentation only), plus native button props.
- `secondary` is the gold-hairline button (`control-line` border, no fill). `quiet` is text-only for low-stakes actions (“Save look”).
- Labels are verbs in sentence case: “Book a consultation”, “Try it on”, “Enter”.
- Do: pair one primary with one secondary. Don’t: two ruby buttons side by side; icons without a label; gold fills on hover.
