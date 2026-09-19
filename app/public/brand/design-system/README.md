Quiet Heritage is the design system for **Lumen**, a white-label AR try-on and consultation experience for design-led fine-jewellery ateliers. The work it frames joins Indian forms (jhumkas, chandbalis, kundan and polki, peacock and paisley, filigree, pearls) with a restrained, gallery-like Western hang. Clients buy by appointment, so every screen should feel like a private viewing that ends in a booked consultation.

> North star: **awesomely simple, never plain.** Tagline: **Wear it before it’s made.**

## Content fundamentals

- **Voice:** a knowledgeable host at a private viewing. Calm, warm, exact. Second person (“you”, “your look”); the atelier is “we” only in its own name.
- **Casing:** sentence case for everything, including buttons (“Book a consultation”, not “Book A Consultation”). Small caps are a *typographic* treatment (`label-*`), never typed in capitals.
- **No** exclamation marks, emoji, urgency (“Only 2 left!”), or superlatives (“stunning”, “exquisite”). Let the piece speak.
- **Prices are always indicative** and always a range in Indian notation: “Indicative ₹1.4–1.7L”, “₹85–95K”. En dash between values, no spaces. Never a single exact price before consultation.
- **Units:** metric, a space before the unit: “14.2 g”, “48 mm”, “45 cm”. Karat as “18K”. Metal as “Yellow gold”, “White gold”, “Rose gold”.
- **Time:** IST first, the viewer’s local time beneath: “7:30 PM IST · 10:00 AM EDT”.
- **AR honesty:** the camera view is always labelled **Rough preview**. Tracking copy is short and kind: “Finding you…”, “Looking good”, “Move a little closer”. Never blame the user (“Bad lighting”); suggest instead.
- **Errors** say what happened and what to do, in one or two sentences: “That code didn’t match. Check your invitation, or request a new one.”
- **Devanagari** appears rarely, one word per screen at most, always with its English beside it (स्वागत · Welcome).

## Visual foundations

### Colour

Two modes share one token set. **Paper** (`data-theme="paper"`, the default) is ivory and ink for browsing, details and booking. **Evening** (`data-theme="evening"`) is for the AR camera screens: ink ground, ivory text, the same gold hairlines, and `surface-control` (translucent ink, 86%) behind controls over the live feed. No blur, no glass.

- Ground is `surface` (ivory / ink). Quiet panels are `surface-alt` (pearl). Text is `text`; secondary text is `text-muted`.
- **Gold is a line, never a fill.** Use `hairline` (gold) for rules, dividers, the link underline and the sheet’s top edge. When a gold line carries meaning (a control border, a focus ring, a selected ring), use `control-line` / `focus-ring`, which step to `gold-deep` in Paper so they hold 3:1. Never gold text, never a gold gradient, never a gold background.
- **Ruby is the one primary action** (`action`, label `on-action`). One ruby button per view. Ruby also marks errors (`status-error`), always with an icon and a sentence.
- **Emerald is secondary** (`secondary`, `status-positive`): confirmations, “Looking good”, a secondary accent in editorial layouts. It lightens in Evening so it still reads on ink.
- Selected chips, segments and time slots invert: fill `text`, label `text-inverse`. This keeps selection monochrome and lets ruby stay rare.
- `metal-*` and `gem-*` colours exist only to draw swatches. They never colour UI chrome.

### Type

- **Cormorant Garamond** (`--font-display`) for display lines, titles and piece names. Sentence case, regular (400) or medium (500), never bold, never all caps.
- **Small-caps labels** (`label-l`, `label-m`, `label-s`): Cormorant Garamond 600 with `font-variant-caps: all-small-caps` and wide tracking (0.14–0.18em). Field labels, spec labels, eyebrows, badges. Colour `text-muted` or `text`.
- **Jost** (`--font-ui`) for all UI and reading text. Buttons are `ui-m` (500, +0.04em). Prices, weights and codes use `numeric` with tabular figures.
- **Tiro Devanagari Hindi** (`--font-accent`) for the rare accent word only (`accent-d` / `accent-m`).
- Every role has a desktop (`-d`, 1440) and mobile (`-m`, 390) size. Swap at the 1024px breakpoint. Inputs never go below 16px on mobile.

| Role | 1440 desktop | 390 mobile |
| --- | --- | --- |
| display-xl | 80 / 84 | 48 / 52 |
| display-l | 60 / 64 | 40 / 44 |
| display-m | 44 / 50 | 32 / 38 |
| title-l | 32 / 40 | 26 / 32 |
| title-m | 24 / 32 | 21 / 28 |
| title-s | 20 / 28 | 18 / 24 |
| body-l | 18 / 30 | 17 / 28 |
| body-m | 16 / 26 | 16 / 24 |
| body-s | 14 / 22 | 14 / 20 |
| ui-m | 15 / 20 | 15 / 20 |
| label-l / m / s | 17 · 15 · 13 small caps | same |

### Space, grid and layout

- 4px base. Spacing tokens are named by multiple: `space-4` = 16px, `space-6` = 24px, `space-30` = 120px.
- **Mobile 390:** 4 columns, `grid-margin-m` 24px, `grid-gutter-m` 16px. **Desktop 1440:** 12 columns, `grid-margin-d` 120px, `grid-gutter-d` 24px, `content-max` 1200px. Margins stay wide: this is a gallery, not a catalogue.
- Keep body copy to `measure` (34em). Give each piece room: one hero piece per screen on mobile, never a dense grid above the fold.

### Borders, elevation, radii

- **No shadows anywhere.** Elevation is a 1px hairline (`hairline-w`): a sheet has a gold top edge, a modal a gold border, a toast a gold outline. A scrim (`scrim`) separates overlays from the page.
- Radii are `radius-sm` (2px) almost everywhere: buttons, inputs, sheets, modals, slots. `radius-pill` (999px) for chips, pills and badges. `radius-round` for swatches, the shutter and carousel thumbs. Nothing in between.

### States

Every interactive component has **default, hover, pressed, focus and disabled**.

- Hover adds weight to the line (a second inset 1px of `control-line`) or a `surface-alt` wash. It never adds gold fill.
- Pressed goes one step deeper (`action-pressed`, `surface-alt`, or a 0.92 scale on swatches and the shutter).
- **Focus is a solid 2px `focus-ring` outline, 2px outside the control** (`focus-w`, `focus-offset`). Gold-deep on Paper (4.3:1 on ivory, 3.8:1 on pearl), gold on Evening (5.1:1 on ink). Swatches ring the disc; links ring the word.
- Disabled: `surface-alt` fill and `text-disabled`, plus a non-colour cue where colour alone would carry it (a strike-through on a sold-out slot or karat, a diagonal on an unavailable stone).

### Motion

Motion is slow and quiet. Ease with `ease-quiet` `cubic-bezier(0.2, 0, 0, 1)` for state changes (200ms), `ease-draw` `cubic-bezier(0.65, 0, 0.35, 1)` for the link underline drawing in (480ms) and sheets rising (320ms), `ease-exit` `cubic-bezier(0.4, 0, 1, 1)` for dismissals. All durations drop to 0 under `prefers-reduced-motion`. No bounces, no parallax.

### Accessibility

- All text pairs meet WCAG AA in both modes; each colour token’s note names the grounds it is checked on. `stone` itself is 3.31:1 on ivory, so Paper uses `stone-deep` (via `text-muted`) for text under 24px.
- **Touch targets are at least 44px** (`touch-min`); buttons and inputs are 48px (`control-h`). Swatch discs are 28px inside a 44px hit area.
- Segmented controls, swatch groups, the piece carousel and slot grids are radio groups with arrow-key movement. The tracking pill is a polite live region.
- Over the live camera, text sits on `surface-control` and is always `text` (ivory): 10:1 even over a white frame, and gold focus rings hold 3.3:1.

## Iconography and ornament

- **Icons:** 47 line icons on a 24px grid (live area 2–22px), 1.25px stroke, round caps and joins, `currentColor`, no fills. Open strokes end with a slight calligraphic turn (the check’s rising tail, the curved chevrons, the flicked ends of the necklace chain and the jhumka hook) instead of a blunt cap. Use `Icon name="…"` in product, or the sprite (`<svg><use href="sprite.svg#qh-camera"/></svg>`). Files are in the Icons asset group.
- Size them at 24px (20px in dense rows, 16px only inside chips and checkboxes). Colour them with `text` or `text-muted`, and with `control-line` only when the icon is itself the control’s selected state. Always pair an icon with a label or an `aria-label`; never use an icon alone to carry price, karat or availability.
- Culturally specific drawings: `weight` is a jeweller’s tarazu (balance), `studio-visit` is a mehrab doorway, `maang-tikka`, `earring-jhumka` and `earring-stud` (a polki flower) are drawn from the pieces themselves. No emoji, no icon fonts, no filled glyphs.
- Piece thumbnails in the AR carousel are the atelier’s product cut-outs when available; until then, the bundle’s line glyphs (jhumka, chandbali, polki, pearl drop, paisley, choker) stand in.
- Heritage motifs appear as **hairline ornament only**, drawn from the Motifs asset group (below). Never as clip-art, filled shapes or repeating borders; the jaali lattice is the one pattern, and only as a whisper.
- White-label: the atelier leads. Its name (or its own mark, if supplied) takes the top of every client screen in `label-l` small caps; Lumen appears only as the quiet “Lumen for The Atelier” lockup in footers, the gate and shared looks.

## Lumen identity

- **Wordmark:** “LUMEN” in Cormorant small caps (Cormorant SC 500, outlined), tracked 0.32em, with one continuous gold wire. Horizontal: the wire drapes beneath the word like a fine chain and rises past the N into a paisley curl. Stacked: it arcs over the word like a jhumka dome and curls down at the right. Never redraw the wire, add a second one, or fill it.
- **Co-branding:** the configurable line reads “for The Atelier” in Jost Light (300), `text-muted`, sentence case, set under the wordmark: left-aligned in the horizontal lockup, centred in the stacked one. Use `LumenLockup atelier="…"` in product; the `*-atelier*.svg` files carry the line as editable live text with Jost Light embedded.
- **Monogram:** an L as one unbroken wire ending in a round stone, stroke only. At 20px and below use the pixel-fitted drawing (the favicon), which drops the top curl.
- **Colour:** letters in `ink` on ivory or transparent, `ivory` on ink. The wire is `gold-deep` on light grounds and `gold` on ink (the same rule as `control-line`), so it holds 3:1+ as a mark. No other colourways, no gradients, no metallic effects.
- **Strokes** are 1.25px (wordmark) and 1.5px (monogram) at 1x and scale with the artwork. Clear space is one small-cap height on every side. Minimum sizes: horizontal 24px mark height, stacked 32px; below that, the monogram.
- **Icons:** the app icon is the monogram centred in the platform safe zone on a full-bleed ink (default) or ivory square; the favicon is the 16px monogram on a 3px-radius tile that follows the viewer’s light or dark setting. Files are in the Brand asset group.

## Motif library

All motifs are editable SVG line art: `gold` (#A8844A) stroke, 1px at 1x, round caps and joins, no fills, no gradients. Marks, frames and the jaali keep a 1px line at any size (`vector-effect: non-scaling-stroke`); open a file and change `stroke` to recolour (`gold-deep` on pearl, `ivory` at low opacity over the camera).

- **Gold-thread dividers** (`divider-plain-*`, `divider-bead-*`, `divider-paisley-*`, each 120 / 240 / 480px): plain between sections of equal weight; the centre bead under a display title or above a price; the paisley curl once per page, closing a story or the spec table. Centre them, give them `space-8` above and below, and never stack two.
- **Jaali lattice** (`jaali-tile.svg`, seamless 256×256): an eight-point star lattice with ring nodes. Use it only as a background at **4–6% opacity** on `surface`, e.g. `background: url(jaali-tile.svg) 0 0 / 256px repeat` on a layer at `opacity: .05`. Never behind body copy longer than two lines, never on the camera feed, never over a product photograph.
- **Single-line marks** (`mark-peacock`, `mark-paisley`, `mark-lotus`, `mark-jhumka`): each is one continuous path. The 160px files are the full drawing, and the `-48` files are simpler, for 48px and below. One mark per screen: an empty state, a collection opener, the end of a confirmation. Never as bullets, icons or buttons.
- **Framing:** `frame-arch.svg` (320×480 mehrab outline with a finial bead) frames a hero piece or the AR subject; scale it proportionally, keep `space-6` between the arch and the piece, and use it at 40–60% opacity over the camera. `frame-corners.svg` is the top-left and bottom-right bracket pair; `frame-corner.svg` is one bracket to rotate into any corner, for photographs and the snapshot.
- **Seal** (`seal-hallmark.svg`, 120px): “HALLMARKED · CERTIFIED” in Cormorant SC around a faceted stone. The lettering is outlined glyphs, the only filled marks in the set, so it renders anywhere. Show it **only on pieces that carry a genuine hallmark and certificate**, beside the spec table, at 64–120px. It is a statement of fact, not decoration.

## Illustration: guides, placeholders and states

Everything here is drawn in the same single gold line as the motifs: `gold` stroke, round caps, no fills, transparent ground (placeholders sit on an ivory 4:5 tile). Figures are one continuous line wherever the subject allows; a dashed gold line (`2 5`) always means “the piece goes here”.

- **AR framing guides** (Guides group, 390×844 and 1440×900): wrist in a mehrab arch, palm down (“Rest your wrist in the arch, palm facing down.”) and palm up (“Now turn your wrist”); back of the hand with the ring finger haloed (“Spread your fingers a little.”); a three-quarter face with the lobe marked (“Tuck your hair behind your ear.”). Lines are 1.5px so they hold over a busy camera frame; the instruction sits in a `surface-control` pill in Jost 16, ivory. Show a guide only while tracking says “Finding you…”, fade it to 40% on “Looking good”, and drop the control rail to its collapsed state while the guide is up. Bracelets use the wrist pair in order; rings and tops use one guide each.
- **Display stand** (`stand-ear-jaw.svg`): a neutral ear-and-jaw profile on a plinth for showing tops and studs in 3D. It is a stand, not a camera guide: never show it over the live feed.
- **Placeholders** (Placeholders group, 320×400, 4:5 ivory tile): jhumka pair, choker, layered haar, pendant, bangle, cuff, solitaire ring, band ring, maang tikka, stud earrings, chandelier earring, bracelet. Use them only while a real photograph loads or where the atelier has none yet; swap without a layout shift (same 4:5 box) and never caption them as the actual piece.
- **Camera permission** (`camera-permission-art.svg`; `camera-permission.svg` includes the copy): an arch with a single jhumka. Copy, set live in the page in `body-m`, `text-muted`: “Your camera stays on this device. Nothing is recorded or uploaded.”
- **Empty and result states** (240×200): `empty-look-board` (three arches, two dashed), `empty-no-consultations` (studio side: an open appointment book with a ribbon marker), `empty-no-results` (a lens over a missing stone), `empty-offline` (the thread, parted), `success-booked` (a gold thread tied in a knot, ending in a bead), `error-404` (“This piece has wandered off the tray.”). One illustration per screen, centred above a `title-m` line and one sentence of `body-m`; suggested lines: “Your look board is waiting for its first piece.” · “No consultations booked yet.” · “Nothing matches those filters. Try fewer.” · “You’re offline. We’ll reconnect when you are.” · “Your consultation is booked.”
- Text inside the SVGs (guide pills, permission, 404) is live Jost; the downloadable files embed Jost 400, and the copies shown here fall back to the system sans. In product, prefer the `*-art` file plus live HTML text so it can be translated.

## Components and exports

Components live in `components/bundle.js` as `window.QuietHeritage` (React 18). Their styles are `components/bundle.css`, which reads only tokens. Portable exports for product code: `exports/tokens.css` (all tokens as CSS custom properties, both modes, type classes, motion) and `exports/tailwind.theme.js` (a `theme.extend` object: colors, fontFamily, fontSize, spacing, borderRadius, transitionTimingFunction, plus durations).

Intentional additions beyond the brief: `gold-deep` and `stone-deep` (so meaningful lines and small secondary text pass AA in Paper), an Evening tint for emerald and error, `metal-*` / `gem-*` swatch colours, `MetalSwatch`, `SwatchGroup`, `PieceCarousel`, `SizeSlider` and `ShutterButton` as parts of the rail, an `ARScreen` page showing the camera screen composed, and the `LumenLockup` / `LumenMonogram` identity components.
