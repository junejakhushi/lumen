# Modal

A centred dialog for decisions that interrupt: leaving the try-on, cancelling a booking.

- **Props:** `open`, `title` (a question), `onClose`, `children` (one or two sentences), `actions` (secondary first, primary second), `inline`.
- 1px gold border, `radius-sm`, no shadow. Prefer `BottomSheet` on mobile for anything that isn’t a decision.
