# Lumen emails

Four transactional emails for Lumen (Quiet Heritage). 600px, table-based, inline styles; the `<style>` block holds only the mobile media query (≤599px) and dark-mode hints. Ruby bulletproof button (table + VML for Outlook). Fonts: Cormorant Garamond / Jost with Georgia / Helvetica fallbacks (no webfont links; clients without the fonts fall back).

Templating: Mustache-style. `{{name}}` is a value; `{{#name}}…{{/name}}` is a section (boolean shows/hides, list repeats). Escape values on insert.

Images must be PNG in production (SVG isn't supported by most clients). Screenshots (`<name>.png`) were rendered in headless Chromium at 600px with sample data from `lumen/catalog.json` and local fonts in a test wrapper only; `{{studio_name}}` etc. were left raw on purpose.

## client-confirmation.html

- **Audience:** Client, sent right after booking.
- **Subject:** `Your consultation with {{studio_name}}`
- **Preheader:** `{{date_ist}} at {{time_ist}} IST. Your design brief is on its way to the atelier.`
- **Placeholders:** `{{asset_base}}`, `{{brief_id}}`, `{{brief_url}}`, `{{calendar_ics_url}}`, `{{client_first_name}}`, `{{date_ist}}`, `{{google_calendar_url}}`, `{{look_1_code}}`, `{{look_1_img}}`, `{{look_1_metal}}`, `{{look_1_name}}`, `{{look_2_code}}`, `{{look_2_img}}`, `{{look_2_metal}}`, `{{look_2_name}}`, `{{look_3_code}}`, `{{look_3_img}}`, `{{look_3_metal}}`, `{{look_3_name}}`, `{{studio_address}}`, `{{studio_name}}`, `{{time_ist}}`, `{{time_local}}`, `{{tz_local}}`, `{{video_link}}`, `{{visit_type}}`
- **Sections:** `{{#in_studio}}` (boolean: show address block), `{{#look_3_img}}` (optional: omit to show two looks), `{{#video_call}}` (boolean: show video link / daylight note)

## atelier-notification.html

- **Audience:** Atelier team, sent on each new booking.
- **Subject:** `New consultation · {{client_name}} · {{date_ist}}`
- **Preheader:** `{{visit_type}} on {{date_ist}} at {{time_ist}} IST · {{occasion}} · {{budget}}`
- **Placeholders:** `{{asset_base}}`, `{{attribute}}`, `{{brief_id}}`, `{{budget}}`, `{{client_email}}`, `{{client_name}}`, `{{client_notes}}`, `{{client_phone}}`, `{{dashboard_url}}`, `{{date_ist}}`, `{{needed_by}}`, `{{occasion}}`, `{{original}}`, `{{piece_code}}`, `{{piece_metal}}`, `{{piece_name}}`, `{{requested}}`, `{{studio_name}}`, `{{time_ist}}`, `{{time_local}}`, `{{tz_local}}`, `{{visit_type}}`
- **Sections:** `{{#changes}}` (list of {attribute, original, requested}), `{{#pieces}}` (list of {piece_name, piece_code, piece_metal}), `{{#prefers_whatsapp}}` (boolean)

## reminder-24h.html

- **Audience:** Client, 24 hours before the consultation.
- **Subject:** `Tomorrow at {{time_ist}} IST · {{studio_name}}`
- **Preheader:** `Your consultation is tomorrow, {{date_ist}}. Here's everything you need.`
- **Placeholders:** `{{asset_base}}`, `{{brief_url}}`, `{{client_first_name}}`, `{{date_ist}}`, `{{look_1_code}}`, `{{look_1_img}}`, `{{look_1_metal}}`, `{{look_1_name}}`, `{{look_2_code}}`, `{{look_2_img}}`, `{{look_2_metal}}`, `{{look_2_name}}`, `{{look_3_code}}`, `{{look_3_img}}`, `{{look_3_metal}}`, `{{look_3_name}}`, `{{look_board_url}}`, `{{studio_address}}`, `{{studio_name}}`, `{{time_ist}}`, `{{time_local}}`, `{{tz_local}}`, `{{video_link}}`, `{{visit_type}}`
- **Sections:** `{{#in_studio}}` (boolean: show address block), `{{#look_3_img}}` (optional: omit to show two looks), `{{#video_call}}` (boolean: show video link / daylight note)

## atelier-daily-digest.html

- **Audience:** Atelier team, daily at 20:00 IST.
- **Subject:** `Today in the atelier · {{date_ist}}`
- **Preheader:** `{{sessions_count}} sessions, {{bookings_count}} bookings, {{avg_session_min}} min on average.`
- **Placeholders:** `{{asset_base}}`, `{{avg_session_min}}`, `{{bookings_count}}`, `{{dashboard_url}}`, `{{date_ist}}`, `{{piece_code}}`, `{{piece_name}}`, `{{rank}}`, `{{score}}`, `{{session_url}}`, `{{sessions_count}}`, `{{signal}}`, `{{studio_name}}`, `{{time_ist}}`
- **Sections:** `{{#top_sessions}}` (list of 5 {rank, time_ist, piece_name, piece_code, signal, score, session_url})

## Placeholder reference

| Placeholder | Meaning |
|---|---|
| `asset_base` | Asset host root; serves /brand/logo-horizontal.png (264×82 @2x) and /brand/motifs/seal-hallmark.png (80×80 @2x) |
| `attribute` | Changed attribute (in changes loop) |
| `avg_session_min` | Average session length in whole minutes |
| `bookings_count` | Bookings today |
| `brief_id` | Brief reference, e.g. LUM-0042 |
| `brief_url` | Client's design brief URL |
| `budget` | Budget range, e.g. ₹2–3L |
| `calendar_ics_url` | .ics download URL (primary button) |
| `changes` | list of {attribute, original, requested} |
| `client_email` | Client email |
| `client_first_name` | Client's first name |
| `client_name` | Client's full name |
| `client_notes` | Client's free-text notes |
| `client_phone` | Client phone, with country code |
| `dashboard_url` | Atelier dashboard deep link |
| `date_ist` | Consultation date (or digest date) in IST, e.g. Tue 22 Sep 2026 |
| `google_calendar_url` | Google Calendar add-event URL |
| `in_studio` | boolean: show address block |
| `look_1_code` | Look 1 code |
| `look_1_img` | Look 1 image URL (PNG, 332×415 @2x of a 4:5 tile), e.g. {{asset_base}}/placeholders/placeholder-cuff.png |
| `look_1_metal` | Look 1 metal + karat |
| `look_1_name` | Look 1 piece name (also used in alt text) |
| `look_2_code` | Look 2 code |
| `look_2_img` | Look 2 image URL (PNG, 332×415 @2x of a 4:5 tile), e.g. {{asset_base}}/placeholders/placeholder-cuff.png |
| `look_2_metal` | Look 2 metal + karat |
| `look_2_name` | Look 2 piece name (also used in alt text) |
| `look_3_code` | Look 3 code |
| `look_3_img` | Look 3 image URL (PNG, 332×415 @2x of a 4:5 tile), e.g. {{asset_base}}/placeholders/placeholder-cuff.png |
| `look_3_metal` | Look 3 metal + karat |
| `look_3_name` | Look 3 piece name (also used in alt text) |
| `look_board_url` | Client's look board URL |
| `needed_by` | Needed-by date |
| `occasion` | Occasion text |
| `original` | Original value |
| `piece_code` | Piece code, e.g. LX-104 (in loop) |
| `piece_metal` | Metal + karat, e.g. Yellow gold 18K (in loop) |
| `piece_name` | Piece name (in loop) |
| `pieces` | list of {piece_name, piece_code, piece_metal} |
| `prefers_whatsapp` | boolean |
| `rank` | 1–5 |
| `requested` | Requested value |
| `score` | Interest score 0–100 |
| `session_url` | Session detail URL |
| `sessions_count` | Sessions today |
| `signal` | Key signal tag, e.g. undecided: rose vs yellow |
| `studio_address` | Full atelier address (in-studio only) |
| `studio_name` | Atelier's display name |
| `time_ist` | Time in IST, e.g. 7:30 PM |
| `time_local` | Same time in the client's zone |
| `top_sessions` | list of 5 {rank, time_ist, piece_name, piece_code, signal, score, session_url} |
| `tz_local` | Client zone abbreviation, e.g. EDT |
| `video_call` | boolean: show video link / daylight note |
| `video_link` | Private video-call URL (video only) |
| `visit_type` | In-studio / Video call |

## Notes

- Outlook desktop ignores `border-radius`, `font-variant-caps` and webfonts; labels degrade to sentence case in the fallback serif.
- The digest hides the Time column below 600px so the table fits phones.
- The atelier notification carries client contact details; it's addressed to the atelier team only.
