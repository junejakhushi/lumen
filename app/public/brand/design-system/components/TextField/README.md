# TextField

A labelled text input: small-caps label above, 48px field with a `control-line` border, hint or error beneath.

- **Props:** `label`, `hint`, `error` (string; sets `aria-invalid` and shows an alert icon), `optional`, `disabled`, `state` (docs only), plus native input props (`value`, `onChange`, `type`, `autoComplete`…).
- Errors are one or two plain sentences in `status-error`, never colour alone.
- 16px text so mobile Safari doesn’t zoom.
