# SlotPicker

Choose a consultation time: day tabs, then a grid of slots showing IST first and the viewer’s local time beneath.

- **Props:** `slots` (ISO UTC strings), `unavailable` (ISO strings), `value` / `defaultValue`, `onChange(iso)`, `localTimeZone` (default: the browser’s), `localLabel` (default: city from the zone), `atelierTimeZone` (default Asia/Kolkata).
- Days group by the atelier’s date. When the local day differs from IST, the local line carries its weekday.
- Taken slots are struck through and say “Taken”.
