# LUMEN — Final Prompt Pack (Claude Design + Claude Code) · STL → 3D Wrist AR MVP
### "Wear it before it's made." A white-label AR try-on and consultation atelier for fine-jewellery design studios.

**Ground rules for everything in this pack:**
1. **Standalone and unbranded.** No real studio name, founder name, collection name, product name, or client in any prompt, code, copy, asset, or commit. The product is **Lumen**. The studio is referred to only as **"the atelier"** (configurable via `STUDIO_NAME`, default `"The Atelier"`).
2. **Secure by default.** Studio photos and CAD files never go into git, never go to any third-party AI or image service, and are only ever served from private storage through short-lived signed URLs behind an access gate. Camera frames never leave the device. (Details: SPEC §9.)
3. **3D AR from CAD, nothing else.** The MVP turns the **15 sliced JewelCAD STLs** into clean 3D pieces. The **filename prefix sets the type: `b` = bracelet (segment), `r` = ring, `t` = tops (stud earrings)**. Bracelets are assembled from their segment and worn **live on the wrist**; rings are worn **live on the ring finger** (same hand tracker); tops are shown in 3D as a pair (ear AR is a stretch goal). Every piece has an exact weight and a live price. No photo pipeline, no selfies, no image generation.
4. **No LLM anywhere.** This keeps the project eligible for *Best Hack Without an LLM*.

**Final scope (locked):** raw sliced CAD → reconstructed 3D pieces with exact weight → typed by filename (b bracelet / r ring / t tops) → **live 3D hand AR for bracelets (wrist) and rings (finger)**, tops in 3D → customise (metal, karat, wrist or ring size) with a live indicative price → look board → booking → Design Brief PDF + Session Reports → atelier dashboard. Access-gated and secure. **No voice, no AI, no extra sponsor integrations.** P1 items only if the core is demo-ready by hour 8.

**Run order at a glance:**
1. Human setup (5 min): private repo, `SPEC.md`, `private/stl_in/`, `.forbidden-terms`.
2. Claude Design D1 → D12 (one teammate, in parallel with the code sessions; export into `app/public/brand/` as you go, D1 first because the app needs the tokens).
3. Claude Code, two sessions in parallel: Session 1 = S1.1 → S1.5; Session 2 = S2.1 → S2.5.
4. Everyone: Deploy prompt + rehearsal.

How to use this file:
- **Part A:** the aesthetic brief (generic; derived from the studio's look, no names).
- **Part B:** Claude Design prompts. Run them in order in one project (one teammate, about 2–3 hours). **Don't upload studio photos or STL renders to Claude Design.** Use the written brief plus the generic placeholder imagery the prompts ask for.
- **Part C:** `SPEC.md`. Save it at the repo root; every Claude Code session reads it.
- **Part D:** Claude Code session prompts. Run **Session 1 (pipelines) and Session 2 (app) in parallel**.

---

# PART A — Aesthetic Brief: "Quiet Heritage"

**Positioning (generic):** a design-led fine-jewellery atelier whose work blends **traditional Indian motifs** (jhumkas, kundan and polki, peacock and paisley forms, temple and filigree details, pearls) with a **restrained, Western, gallery-like sensibility**. Pieces are meant to be *light, wearable, and precisely made*. Clients typically buy **by appointment**, so the digital experience should feel like a private viewing that ends in a booked consultation.

**North star:** *awesomely simple, never plain.* One hero object per view. Craft seen through restraint.

| Element | Direction |
|---|---|
| Mood | A private viewing room, not a store. Calm, unhurried, assured. The jewellery is the only thing that shines. |
| Space | Generous negative space, editorial asymmetry, arch-framed hero moments. |
| Palette | **Paper ivory** `#F5F0E8` · **Ink** `#1B1916` · **Muted 18k gold** `#A8844A` (hairlines and small accents only; never fills or gradients) · **Kundan ruby** `#6E1E2A` (primary CTA, sparingly) · **Deep emerald** `#1E4638` (secondary) · **Pearl mist** `#E8E2D8` (surfaces) · **Stone** `#8A8378` (secondary text). **Evening mode** for AR: ink background, ivory text, gold hairlines. |
| Type | **Cormorant Garamond** (display; wide-tracked small caps for labels) · **Jost** (UI/body) · **Tiro Devanagari Hindi** (rare accents). All Google Fonts. |
| Motifs | Hairline **gold-thread** dividers; an abstract **jaali lattice** at ≤ 6% opacity; **single-continuous-line** marks (paisley, peacock feather, lotus bud, jhumka) drawn like gold wire; a thin **mehrab arch** frame. |
| Motion | Slow and precise, 400–700 ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Signature: **a gold thread that draws itself.** Earrings in AR sway with gentle physics. |
| Voice | Warm, precise, never salesy. **Lyrical piece names with exact spec tables** (code, metal, karat, weight, dimensions). |
| Avoid | Neon, glassmorphism, startup gradients, emoji, gold gradients, black-and-gold "luxury" clichés, clip-art mandalas. |

**Generic collection names for the demo:** **Heirloom** (traditional motifs, light and wearable), **Fine** (contemporary fine jewellery), **Playful** (giftable, everyday).

---

# PART B — Claude Design Prompts (run in order, same project)

> Export each deliverable into `app/public/brand/…` with the names given. Never paste real studio names, photos, or product details into Claude Design. Where content is needed, the prompts ask for **generic placeholder jewellery illustrations** (fine line drawings) or neutral image tiles; the app swaps in real (secured) photos at runtime.

### D1 — Design system & tokens
```
You are the art director for "Lumen", a white-label AR try-on and consultation experience for design-led fine-jewellery ateliers. The work it presents blends traditional Indian motifs (jhumkas, kundan/polki, peacock and paisley forms, filigree, pearls) with a restrained, gallery-like Western sensibility. Clients buy by appointment, so the experience should feel like a private viewing that ends in a booked consultation. North star: "awesomely simple, never plain." Tagline: "Wear it before it's made."

Build a design system called "Quiet Heritage":
- Palette: Paper ivory #F5F0E8 (base), Ink #1B1916, Muted 18k gold #A8844A (hairlines and small accents only; never fills or gradients), Kundan ruby #6E1E2A (primary CTA, sparingly), Deep emerald #1E4638 (secondary), Pearl mist #E8E2D8 (surfaces), Stone #8A8378 (secondary text). Also an "Evening" mode for the AR camera screens: ink background, ivory text, the same gold hairlines, translucent-ink control surfaces (no blur/glass effects).
- Type: Cormorant Garamond (display; wide-tracked small caps for labels), Jost (UI/body), Tiro Devanagari Hindi (rare accents). A full type scale for 390px mobile and 1440px desktop.
- Spacing on a 4px base; grid of 4 columns (mobile) and 12 (desktop) with wide margins; radii mostly 2px, pills 999px; elevation replaced by hairlines.
- Components with all states (default/hover/pressed/disabled/focus): primary button (ruby), secondary button (gold hairline), text link with a gold underline that draws in, filter chips, segmented control (metal: Yellow / White / Rose; karat: 14 / 18 / 22), stone swatches (diamond, ruby, emerald, sapphire, pearl, polki) as small faceted circles, size/length stepper, inputs/selects, bottom sheet, modal, toast, indicative price pill ("Indicative ₹1.4–1.7L"), a SPEC TABLE (Code / Metal / Karat / Weight / Length / Width; thin gold rules; small-caps labels), consent checkbox row, slot picker (IST + local time), a "Rough preview" badge for AR, an access-code gate screen.
- AR control components (Evening mode): a bottom control rail (piece switcher carousel, metal swatches, stone swatches, size slider, shutter/snapshot button), a top bar (close, piece name, "Rough preview"), and a tracking-status pill ("Finding you…", "Looking good", "Move a little closer").
- Accessibility: AA contrast, 44px touch targets, gold 2px focus rings.
Deliver: a design-system page and component sheet, plus TOKENS exported as CSS variables (tokens.css) and a Tailwind theme extension (tailwind.theme.js: colors, fontFamily, fontSize, spacing, borderRadius, transitionTimingFunction).
```

### D2 — Lumen identity
```
Design the identity for "Lumen" (white-label; it will sit alongside an atelier's name via a configurable text line, "Lumen for The Atelier"):
1) Primary lockup: "LUMEN" in wide-tracked Cormorant small caps with a single continuous gold-wire line forming a subtle arc or paisley curl. Horizontal and stacked versions, plus a version with a configurable second line in Jost light ("for The Atelier").
2) Monogram: an "L" drawn as one unbroken gold wire ending in a tiny round "stone." Must work at 16px.
3) App icon and favicon on ivory and on ink.
Strokes 1–1.5px at 1x, no fills, no gradients. Deliver SVGs (ivory, ink, transparent) plus favicon.svg, icon-192.png, icon-512.png, apple-touch-icon.png.
Files: brand/logo-horizontal.svg, brand/logo-stacked.svg, brand/monogram.svg, brand/favicon.svg, brand/icon-512.png.
```

### D3 — Motif library
```
Create the Quiet Heritage motif library as editable SVG line art (stroke #A8844A, 1px at 1x, round caps):
1) Gold-thread dividers: plain, with a centre bead, and with a paisley curl at one end (3 lengths each).
2) A seamless 256×256 jaali lattice tile: abstract, geometric, fine lines, for use at 4–6% opacity.
3) Single-continuous-line marks at 48px and 160px: peacock feather, paisley (kairi), lotus bud, jhumka.
4) Framing: a corner-bracket pair and a thin mehrab-arch outline for hero and AR framing.
5) A small circular "HALLMARKED · CERTIFIED" seal in fine lettering.
Files: brand/motifs/divider-*.svg, jaali-tile.svg, mark-peacock.svg, mark-paisley.svg, mark-lotus.svg, mark-jhumka.svg, frame-arch.svg, frame-corners.svg, seal-hallmark.svg.
```

### D4 — Icon set
```
Design a 24px line-icon set in the Quiet Heritage style (1.25px stroke, round joins, slightly calligraphic terminals, currentColor). Icons: ar-try-on, camera, flip-camera, snapshot, necklace, choker, earring-jhumka, earring-stud, bracelet, bangle, ring, pendant, maang-tikka, set, metal, karat, stone, size, length, weight, budget-rupee, calendar, clock, studio-visit (arched doorway), video-call, compare, undo, save-look, share, download-pdf, chat, phone, email, location-pin, check, close, info, chevrons, filter, search, 3d-rotate, hallmark-shield, lock (for the access gate), eye-off (privacy).
Deliver one SVG per icon plus a sprite. Files: brand/icons/<name>.svg, brand/icons/sprite.svg.
```

### D5 — AR framing guides, placeholders, empty states
```
In the single-continuous gold-line style (transparent background), create:
A) AR framing guides (390×844 and 1440×900), each with one instruction line in Jost:
   1. PRIMARY: forearm, wrist, and open hand inside a mehrab arch (bracelets): "Rest your wrist in the arch, palm facing down." Plus a variant with the palm facing up ("Now turn your wrist").
   2. Back of the hand with fingers slightly spread, ring finger highlighted (rings): "Spread your fingers a little."
   3. Face in three-quarter view with the ear lobe visible (tops/stud earrings; stretch goal): "Tuck your hair behind your ear."
   4. A neutral line-drawn ear-and-jaw profile used as the 3D display stand for tops (not a camera guide).
B) 12 generic placeholder jewellery illustrations in fine line art (a jhumka pair, a choker, a layered haar, a pendant, a bangle, a cuff, a solitaire ring, a band ring, a maang tikka, stud earrings, a chandelier earring, a bracelet), each in a 4:5 ivory tile, to stand in wherever real piece photos load.
C) Camera permission screen art (an arch with a single jhumka), with privacy copy: "Your camera stays on this device. Nothing is recorded or uploaded."
D) Empty states: an empty look board, no consultations (studio side), no results, offline. A success illustration for a booked consultation: a gold thread tying a small knot. A 404: "This piece has wandered off the tray."
Files: brand/guides/*.svg, brand/placeholders/*.svg, brand/illus/*.svg, brand/empty/*.svg.
```

### D6 — Motion & AR states
```
Specify and build the motion language:
1) Signature loader: a gold thread drawing itself into the paisley mark, then fading (SVG stroke-dasharray + CSS keyframes, 1.6s loop).
2) AR calibration: three hairline corner marks settle onto the detected neck, ears, or wrist, then fade; the tracking-status pill transitions ("Finding you…" → "Looking good").
3) AR piece switch: the current piece dissolves into a gold thread and the next one draws in (300ms out, 500ms in).
4) Snapshot: a soft ivory flash, then the frame shrinks into the look-board icon.
5) Placeholder shimmer in pearl mist (no grey skeleton bars); page transition as an 8px rise with fade over 500ms.
Deliver SVG + CSS for 1–3 and a motion spec page. Files: brand/motion/loader-thread.svg, brand/motion/loader.css, brand/motion/ar-states.css, brand/motion/spec.png.
```

### D7 — Client screens (mobile first, 390 + 1440)
```
Design the full Lumen client journey in Quiet Heritage using the placeholder illustrations (not real photos). Piece content uses lyrical names with exact spec tables (write your own fictional examples, e.g. "The Quiet River — 18k gold cuff, 18.2 g, 62 × 14 mm, code LX-104").
1. Access gate: an arch frame, monogram, and access-code field ("This preview is private.").
2. Welcome: an arch-framed hero, "Wear it before it's made.", two paths: "Explore the collection" and "Start trying on".
3. Collection: Heirloom / Fine / Playful filters plus type chips; an editorial masonry grid; each tile shows name, collection, and an "AR" affordance.
4. Piece detail: gallery; lyrical name with a two-line story; spec table; indicative price pill or "Price on consultation"; primary CTA "Try it on"; "Complete the set" suggestions.
5. 3D viewer (before AR): the assembled piece on ivory with a slow turntable and orbit; tops are shown as a mirrored pair beside the line-drawn ear profile, with a "Wear on hand" CTA hidden for them. Beside it: exact weight by metal and a live price breakdown (gold value, making 18%, stones, GST 3%) in the spec-table style, with "Try it on" as the primary CTA for bracelets and rings.
6. AR try-on (Evening mode, the hero screen): full-screen camera with the wrist framing guide during calibration, then the 3D bracelet worn on the wrist, or the ring on the ring finger (show both variants); top bar (close, name, "Rough preview"); bottom rail (piece switcher, metal swatches Yellow/White/Rose, karat, size stepper: wrist in cm for bracelets, ring size (Indian, with US) for rings, snapshot). Show the calibrating, tracking, lost-tracking, and snapshot states. The price pill floats top-right and updates as the metal changes.
7. Customise sheet: metal colour and karat, stones, length/size, weight preference (Lighter / As shown / Statement), occasion, notes; the AR view updates live behind a half-height sheet; the indicative price range updates.
8. Look board: snapshots and customisations in a calm grid; "Book a consultation with these looks."
9. Book a consultation: visit type (In-studio / Video call), slot calendar in IST and the client's local time, contact (name, phone with a WhatsApp-preferred toggle, email), occasion, date needed by, budget range, consent; a summary card of the selected looks.
10. Confirmation: the thread-knot illustration, date and time, "Your design brief is on its way to the atelier", add-to-calendar and download-brief buttons.
Also: a minimal global nav (monogram, Collection, Try on, Look board, Book) and a footer (the configurable atelier line plus the hallmark seal). Provide annotated spacing and component usage.
```

### D8 — Atelier dashboard (desktop 1440)
```
Design the atelier-side dashboard (behind a passcode), in the same system, denser but calm:
1. Consultations: upcoming list grouped by day (time, client, visit type, occasion, budget, pieces), status chips (New / Confirmed / Completed / No-show), quick confirm.
2. Brief detail: the client's look board (AR snapshots), a customisation table (original → requested), notes, budget, contact buttons, internal notes, "Download design brief".
3. Insights, "What clients are asking for": most-worn pieces in AR (by time worn), customisation trends (e.g., "Rose gold requested on 38% of Heirloom pieces"), stone swaps, budget distribution, occasions over time, and pieces viewed but never tried. Hairline charts: gold lines, ruby only for highlights.
4. Catalog review: a grid of processed CAD pieces (turntable thumbnails, weight, stone estimate, warnings). Piece page: a 3D viewer with toggles for detected stone settings and segment ends; type shown from the filename prefix (Bracelet / Ring / Tops) with an override, lyrical name, collection, stone shape/size override, connector type; and Approve / Hide.
5. Sessions feed: one card per try-on session (time, duration, pieces worn, favourite piece thumbnail, interest score, tags such as "price-sensitive", "undecided: rose vs yellow", "booked"). Session detail: the config journey as a horizontal timeline with price at each step, AR time per piece as hairline bars, derived signals each with its evidence line, and "Talking points for the consultation."
6. Security settings: access codes (create/revoke, expiry), active sessions, a "revoke all links" button.
```

### D9 — Design Brief PDF (A4)
```
Design a 2–3 page A4 "Design Brief" that the atelier receives for each booking. Tone: a couture order card.
Page 1: monogram header, "Design Brief No. LUM-0042", client name, consultation date and time (IST), visit type; a hero AR snapshot in an arch frame; the original piece image; the lyrical name.
Page 2: "The Piece" spec table (Code, Collection, Metal, Karat, Est. weight or "to be confirmed", Length/Size, Stones) → "The Changes" (Original → Requested per attribute) → client notes in italic Cormorant → occasion, date needed, budget range → indicative price range with a disclaimer.
Page 3 (optional): all saved looks.
Also design the sibling "Session Report" (1–2 pages, same family): summary strip, per-piece table (AR time, customisations, final config), the config-journey timeline with prices, derived signals with evidence, and talking points. It's appended as the final page of the Design Brief when the session ends in a booking.
Footer: the configurable atelier line, "Hallmarked & certified", page numbers, a small "Confidential — prepared for the atelier" line, and a QR placeholder.
Deliver a layout spec to rebuild in @react-pdf/renderer: sizes in pt, fonts, colors, table rules.
```

### D10 — Emails (HTML-email safe)
```
Design 3 emails in Quiet Heritage (600px wide, table layout, inline styles, fallbacks Georgia for Cormorant and Helvetica for Jost, {{placeholders}}, no real names):
1) Client confirmation: "Your consultation with {{studio_name}}", time in IST and local time, visit details or a video link placeholder, look thumbnails, add to calendar, view brief, what to bring.
2) Atelier notification: "New consultation · {{client}} · {{date}}", a summary table, and an "Open in dashboard" button.
3) A 24-hour reminder.
4) The atelier's daily digest at 20:00 IST: "Today in the atelier": the number of sessions, bookings, and the top 5 sessions by interest (favourite piece, key signal, link).
Provide final HTML for each.
```

### D11 — Demo & presentation assets (generic, public-safe)
```
Create public-safe assets that show NO real jewellery (use the placeholder illustrations only):
1) OG image 1200×630: an arch frame, "Wear it before it's made.", the Lumen lockup.
2) Devpost cover 1920×1080 and a 3:2 thumbnail.
3) An A5 judging-table card: "Try on a piece in AR" with 3 steps (Choose · Wear · Book) and a large QR placeholder.
4) An 8-slide pitch deck: (1) title; (2) how design ateliers sell today: by appointment, inspiration arrives as screenshots; (3) the problem: clients can't try pieces that aren't in the room, and quotes wait on CAD weights; (4) Lumen: wear it in AR → customise → book; (5) how it works: raw sliced CAD exports → reconstructed solids → exact weight and stones → assembled 3D pieces → live wrist AR with a live price; (6) the atelier dashboard: what clients are asking for; (7) security: CAD never leaves private storage, only decimated preview meshes are served behind an access gate, the camera never leaves the device, no AI services anywhere; (8) business model and thank-you.
Files: brand/og.png, brand/devpost-cover.png, brand/devpost-thumb.png, brand/table-card.pdf, deck.
```

### D12 — Microcopy
```
Write all UI microcopy for Lumen (warm, precise, never salesy; lyrical names, exact details; no real brand or person names; use {{studio_name}}). Cover: access gate, welcome, collection intros (Heirloom: "traditional motifs, made light enough to wear every day"; Fine; Playful), AR instructions per piece type, tracking-status messages, the camera privacy promise, the "Rough preview" explainer ("A close impression, true to shape and colour; the final piece is made for you."), the indicative price disclaimer, customise labels and helpers, the booking form and validation errors, confirmation, empty states, errors (camera blocked, device too slow for AR, offline, access code expired), and the atelier dashboard labels. Output a JSON dictionary keyed by screen and element (en), plus 6 small Hindi accent moments. File: copy.en.json.
```

---

# PART C — `SPEC.md` (save at repo root; every Claude Code session reads it)

```markdown
# Lumen — MVP Spec (STL → 3D wrist AR → consultation)

## 1. Product in one line
A private, access-gated web app where a client browses an atelier's pieces (reconstructed from raw CAD), wears them in 3D AR on their wrist, customises metal/karat/wrist size with an exact weight and live price, saves looks, and books a consultation. The atelier receives a Design Brief PDF and sees demand insights. No LLM, no image generation, no third-party AI.

## 2. Hard constraints
- Unbranded: product = "Lumen"; studio = env `STUDIO_NAME` (default "The Atelier"). CI fails if any term in the gitignored `.forbidden-terms` file appears in the repo.
- Security (§9) is P0, not polish.
- Inputs: 15 JewelCAD "sliced" STL files in `private/stl_in/` (gitignored). **The filename prefix is the authoritative type: `b` → bracelet (a segment to assemble), `r` → ring, `t` → tops (a single stud earring; shown and priced as a pair).** Unknown prefix → "unknown" + review. Fixture: rename the known bracelet file to `private/stl_in/b_fixture_a.stl` (keep the `b` prefix).
- Everything numeric the client sees is computed deterministically (§6).

## 3. Scope
P0: pipeline (§4) · review tool · 3D viewer for all three types (assembled bracelets, rings, tops as a pair) · hand AR for bracelets (wrist) and rings (finger) (§5) · metal/karat/size customisation (wrist size, ring size) · exact weight + live indicative price · look board · booking + Design Brief PDF + emails · atelier dashboard with insights · access gate + security · deploy.
P1: tops AR on the ear lobes (FaceLandmarker) · procedural gems in detected settings · stone type swap (diamond/ruby/emerald/sapphire) · coverage option (alternate plain spacer segments) · Budget options (karat / coverage / stone type).
Out: neck AR, photo pipeline, voice, image generation, payments.

## 4. Asset pipeline (Python 3.11, `pipeline/`)
Command: `lumen ingest private/stl_in private/assets_out --workers 4`, then `lumen publish private/assets_out` (uploads to private storage, §9).

4.1 Load + detect: trimesh (`force='mesh'`), merge vertices; units assumed mm (warn and rescale if max extent < 2 or > 300). Detect "sliced" export: ≥ 50% of shells with ≥ 12 faces share an identical z-extent t (±1 µm) and (zmax − zmin)/t is an integer (±0.01). Solid exports: log a warning and skip (P2).

4.2 Exact volume: for each layer k, section at zmin + (k + 0.5)·t (`section_multiplane`), take the shapely `unary_union` of the polygons, volume = Σ area × t.

4.3 Reconstruct: rasterize each layer's union at 0.04 mm XY (holes cut) into a boolean grid (z-spacing t), pad by 2, `skimage.measure.marching_cubes` with spacing, then Taubin smoothing (5–10 iterations). The reconstructed volume must be within 3% of 4.2; otherwise retry at 0.03 mm and flag. Chunk along z if > 150M voxels.

4.4 Measurements: weights per alloy (densities g/cm³: 14k Y 13.1, 14k W 12.9, 14k R 13.0, 18k Y 15.5, 18k W 14.7, 18k R 15.2, 22k Y 17.8, Pt950 20.7); bbox; surface area.

4.5 Type + geometry by prefix (the prefix is written into the manifest as `type`; the filename itself never is):
- `b` (bracelet segment): PCA plane → angle bins → RANSAC circle on the per-bin minimum radius → centre, inner radius, arc span; segment ends (4.7).
- `r` (ring): the same circle fit, but expect a closed loop (span ≥ 330°, else warn). Inner diameter → ring size via a config table (Indian sizes with US equivalents). Record `ring.inner_d_mm`, `ring.size_in`, `ring.size_us`, the band cross-section (width along the axis, thickness at the bottom of the shank), and the head position (the angle of max radius = the top of the ring).
- `t` (tops): no curve. Record the bbox, the front direction (the side with the stones/heads, else the largest projected face), and the post: a thin cylinder Ø 0.6–1.2 mm protruding from the back (record its origin and axis; if none is found, warn "post not modelled"). Price and weight are shown per pair (×2).

4.6 Settings + stones (P1 but attempt): the per-angle maximum-radius profile gives protrusions ≥ 1 mm above the band = heads; each head's axis is radial. Cross-sections perpendicular to the axis every 0.1 mm: k ∈ {2, 3, 4, 6} equal-angle islands on a common circle for ≥ 0.8 mm = a prong head; record the prong width and inner radius r_in. Stone Ø d = 2·r_in + 0.06, snapped to 0.05 mm; round carat ≈ 0.0061·d²·(0.61·d). An equal angular spacing of ≥ 3 heads = an array.

4.7 Segment ends (`b` only): the cross-sections at the two angular extremes → centre, tangent, and connector guess (hole Ø 0.6–3 mm within 3 mm of the end = "hole"; otherwise "butt").

4.8 Exports per piece `<id>/`:
- `web.glb`: decimated to ≤ 60k tris, Draco-compressed (gltf-transform), named nodes `band`, `head_i`.
- `ar.glb`: ≤ 20k tris, for instancing in AR.
- `thumb.webp`: 1024², turntable frame.
- `manifest.json`: `{id, type ("bracelet" | "ring" | "tops"), layers, layer_t, volume_mm3, volume_recon_mm3, weights_g{alloy}, bbox_mm, curve{inner_radius_mm, span_deg, plane_normal}, heads[{axis, origin, prongs, prong_w_mm, r_in_mm}], stones[{d_mm, ct_est, source:"inferred"}], array{count, spacing_deg}, segment{chord_mm, arc_len_mm, ends[], connector} (b), ring{inner_d_mm, size_in, size_us, band_w_mm, band_t_mm, top_angle_deg} (r), tops{front, post{origin, axis} | null} (t), warnings[], review{status, type, name, collection, overrides}}`.
IDs are opaque (`p_` + 8-char hash); original filenames never leave the pipeline machine.

4.9 Fixture tests (`b_fixture_a`, must pass; also assert type = "bracelet" from the prefix):
| check | expected |
|---|---|
| export / layer_t / layers | sliced / 0.0508 ± 0.0005 / 673 |
| volume_slices | 671.5 mm³ ± 1% |
| recon vs slices | ≤ 3% |
| 18k Y weight | 10.4 g ± 0.2 |
| heads / prongs | 9 / 4 (P1) |
| prong width / r_in | 1.016 ± 0.03 / 1.47 ± 0.05 mm (P1) |
| stone d / ct | 3.0 ± 0.1 mm / 0.09–0.11 ct (P1) |
| arc span | 120–140° |
| web.glb | ≤ 5 MB, nodes present |
Performance: ≤ 90 s per piece.

## 5. App (Next.js 14 App Router, TypeScript strict, Tailwind with the tokens from `public/brand/tailwind.theme.js`, react-three-fiber + drei, MediaPipe Tasks Vision)

5.1 Assembly and resizing (`lib/assembly`). Bracelets (`b`): a bracelet = n copies of the segment along a circle with circumference L = wrist_cm·10 + 12 mm; n = round(L / segment.arc_len_mm at the mid radius). Bend each copy to the path radius by mapping vertices in the curve plane with (θ, r) → (θ·R_seg/R_path, r − R_seg + R_path) (preserves arc length at the mid radius; done once per wrist size on the `ar.glb` geometry, cached). Butt joints end to end; "hole" connectors get procedural jump rings (torus, 0.8 mm wire). A procedural box clasp adds 0.8 g at 18k (config). Totals: weight = n × segment + findings; stones = n × per-segment. Render with `InstancedMesh`.
Rings (`r`): resize with the same arc-length-preserving radial mapping, (θ, r) → (θ, r − R_old + R_new), so the band cross-section keeps its thickness and the head moves outward rigidly; weight ≈ band volume × R_new_mid / R_old_mid + head volume (the whole-piece volume × the same ratio if heads aren't segmented). Allowed range: ±4 Indian sizes from the modelled size.
Tops (`t`): no assembly; render the pair by mirroring the mesh across its vertical plane, 60 mm apart in the viewer; weight and stones ×2.

5.2 3D viewer: ivory background, `Environment` (studio lighting), metal `MeshPhysicalMaterial` presets (yellow `#E1B866`-ish, white, rose; metalness 1, roughness 0.18), slow turntable, orbit. Necklace segments (P1): arranged along a U curve on a line-art bust.

5.3 Hand AR (`lib/ar`), the hero feature. Bracelet mode (wrist) is specified first; ring mode follows:
- `HandLandmarker` (VIDEO mode, 1 hand, GPU delegate), front or back camera, 30 fps target.
- Pose: wrist centre = landmark 0 moved 18 mm along the forearm axis (unit vector 9 → 0); axis = forearm direction; roll from the palm normal (cross(5 − 0, 17 − 0)).
- Depth/scale: assume a real palm width (landmarks 5–17) of 80 mm (config) → z from the pinhole model with the camera's horizontal FOV (default 60°; user calibration slider hidden in settings). Bracelet inner radius from the chosen wrist size.
- Occlusion: an invisible depth-only elliptical cylinder (1.25:1, radius = 0.95 × inner radius) along the forearm axis, rendered first, so the back half of the bracelet hides behind the wrist.
- Smoothing: One-Euro filter on position and quaternion; hold 300 ms on loss, then fade.
- Look: environment lighting matched to the frame (average luminance and warmth sampled every 500 ms → envMapIntensity and a slight tint); gems (P1) as faceted meshes with high-IOR physical material.
- Snapshot: composite the video frame + WebGL canvas to a PNG, stored in IndexedDB (never uploaded unless booked).
- Fallback: if AR can't initialize or runs below 15 fps → "Try it in 3D instead."
- Ring mode (`r`): the same HandLandmarker and depth model. Position = lerp(lm13, lm14, 0.38) (the ring finger's first segment); ring axis = normalize(lm14 − lm13); the ring's top (head) faces the back of the hand (palm normal flipped). Inner diameter from the chosen ring size. Occluder: a depth-only cylinder along lm13→lm14 (radius = 0.92 × inner radius, length 30 mm) plus a second short cylinder for the middle finger (lm9→lm10) to hide the ring's side against it. Stronger smoothing (minCutoff 0.7) since fingers jitter more.
- Tops mode (P1): FaceLandmarker; ear-lobe anchors estimated from the face-contour landmarks at ear level (left ≈ 234, right ≈ 454) offset downward by 0.05 × face height, tunable in the calibration drawer; hide the far-side earring when the head yaw exceeds 25°; scale from the inter-pupil distance (assume 63 mm). Until P1 lands, tops show "View in 3D".

5.4 Customise: metal colour, karat (14/18/22 or Pt950), size (bracelets: wrist 14–20 cm in 0.5 steps; rings: Indian size within ±4 of the modelled size, showing the US equivalent; tops: none), coverage (P1), stone type (P1). Weight and price update instantly.

5.5 Look board: saved snapshots + configs (IndexedDB) → "Book with these looks."

5.6 Booking: visit type (in-studio / video), slots from config (Mon–Sat, 11:00–19:00 IST, 45 min, 15 min buffer), no double booking, IST + client local time, contact (name, phone + WhatsApp toggle, email), occasion, date needed, budget range, consent. On submit: upload the selected snapshots to private storage → create the booking → generate a Design Brief PDF (@react-pdf/renderer, layout from Claude Design D9) → email the client (confirmation + .ics) and the atelier (notification) via Resend if `RESEND_API_KEY`, else log to console → confirmation screen.

5.7 Atelier dashboard (`/atelier`, separate passcode): consultations list + detail + status, brief download, insights from events (most-worn pieces by AR seconds, metal/karat choices, wrist sizes, budgets vs quotes, pieces viewed but never worn), catalog review (§4 manifests: name, collection, type, stone overrides, approve/hide), security (access codes, revoke).

5.8 Session Report (P0): one analysed spec per try-on session, sent to the atelier
- A session closes on 10 min idle, tab close (sendBeacon), or booking. Sessions with < 20 s of activity are discarded.
- Built server-side from `events` + `quotes` by pure, deterministic functions (`lib/sessionReport`, unit-tested). No AI.
- Contents:
  1. Summary: date and time, device, duration, pieces viewed / worn in AR, snapshots saved, booked (yes/no + link to the Design Brief).
  2. Per piece: AR seconds, 3D seconds, number of customisations, the final config, and whether it was snapshotted.
  3. Config journey: a timeline of changes (e.g., 18k yellow → 18k rose → 14k rose), with the price at each step.
  4. Derived signals (rules, each with the evidence shown):
     - Favourite piece = max(AR seconds + 20 × snapshots + 5 × customisations).
     - Metal preference = the metal held longest across pieces (shown only if > 60% of worn time).
     - Price sensitivity = changes that lowered the price made right after a price increase, or a karat step-down → "price-sensitive around ₹X".
     - Size uncertainty = ≥ 3 wrist sizes tried → "measure the wrist at the consultation".
     - Hesitation = the same attribute toggled ≥ 4 times → "undecided between A and B".
     - Drop-off = the last screen and action before leaving without booking.
  5. Suggested talking points for the consultation, from templates driven by the signals (e.g., "Bring the rose-gold version of <piece> in 14k; the client stepped down from 18k after seeing the price").
- Privacy: anonymous (session ID only) unless the client books, in which case it links to the booking. Snapshots appear only if the client saved them. No camera frames, no location, no identifiers beyond the device type.
- Delivery: (a) the /atelier/sessions feed (newest first, filter: booked / high-interest / dropped); (b) a PDF export per session (same layout family as the Design Brief, titled "Session Report"); (c) a daily digest email to the atelier at 20:00 IST listing the day's sessions ranked by interest score (not one email per trial). When a session ends in a booking, its Session Report is appended to the Design Brief as the last page.
- Stored in a `session_reports(session_id, built_at, report jsonb, interest_score)` table; rebuilt if late events arrive.

## 6. Pricing (`lib/pricing`, pure, unit-tested)
metal_value = weight_g × rate_per_g(alloy), where rate_per_g(gold k) = rate24 × purity (14k .585, 18k .750, 22k .916) and Pt uses its own rate
making = 18% × metal_value
stones = Σ ct × price_per_ct(type, size band) [config, flagged PLACEHOLDER until filled → UI says "Indicative"]
subtotal = metal + making + stones; gst = 3% × subtotal; total rounded to ₹100.
Rates: a manual daily entry in the atelier dashboard (`gold_rates` table), with the last value used; an optional external API behind a flag.
Display: a breakdown drawer + price pill; always "Indicative · confirmed at consultation."

## 7. Data (Tiger Data / Timescale, `db/migrations`)
pieces(id, manifest jsonb, approved, name, collection, type) · session_reports(session_id, built_at, report jsonb, interest_score) · sessions(id, started_at, device, access_code_id) · events hypertable(time, session_id, piece_id, type, payload) [view, ar_start, ar_stop(sec), customise, snapshot, book_start, book_submit] · quotes hypertable(time, session_id, piece_id, config, breakdown, total) · bookings(id, slot_start, visit_type, client jsonb, looks jsonb, brief_key, status) · gold_rates hypertable(time, rate24, pt, set_by) · access_codes(id, hash, label, expires_at, revoked). Continuous aggregates: daily AR seconds per piece, daily quotes per collection.

## 8. Routes
Client: /gate · / · /collection · /piece/[id] · /piece/[id]/ar · /looks · /book · /book/done
Atelier: /atelier (passcode) · /atelier/sessions · /atelier/sessions/[id] · /atelier/bookings/[id] · /atelier/insights · /atelier/catalog · /atelier/security
API: /api/gate · /api/pieces · /api/pieces/[id]/asset?kind=web|ar|thumb (returns a signed URL, 5-min TTL) · /api/quote · /api/events · /api/slots · /api/bookings · /api/atelier/*

## 9. Security (P0)
- Access gate: middleware on every route except /gate; access codes are hashed (argon2) with expiry; httpOnly, secure, SameSite=strict session cookie; rate-limited (5 attempts/min/IP); the atelier area needs a separate passcode.
- Storage: DigitalOcean Spaces **private** bucket (server-side encryption). Assets are served only via signed GET URLs (5-min TTL) issued after the session check. There is no public bucket listing, and raw STLs, filenames, and high-poly meshes are never uploaded, only decimated Draco GLBs and thumbnails.
- Headers: CSP (self + Spaces endpoint + MediaPipe CDN/WASM), `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store` on asset URLs, `Permissions-Policy: camera=(self)`.
- Camera: processed on-device (MediaPipe WASM). Frames are never sent anywhere. Snapshots stay in IndexedDB until the client books, then they're uploaded to the private bucket.
- Repo: private; `.gitignore` covers `private/`, `.env*`, `.forbidden-terms`. A CI step greps for forbidden terms and for any `.stl`/`.jcd` file.
- No third-party AI or image APIs. Email sends only text + the PDF to the client and the atelier.
- Logs: no PII in logs; bookings are visible only in the atelier area.
- Honest limit: anything rendered in a browser can be screen-captured; mitigated by decimated preview meshes, gating, and short-lived URLs.

## 10. Env
DATABASE_URL, SPACES_KEY, SPACES_SECRET, SPACES_BUCKET, SPACES_REGION, SPACES_ENDPOINT, SESSION_SECRET, ATELIER_PASSCODE_HASH, STUDIO_NAME, RESEND_API_KEY (optional), BOOKING_TZ=Asia/Kolkata, CAMERA_FOV_DEG=60, PALM_WIDTH_MM=80.

## 11. Definition of done
b_fixture_a passes · ≥ 8 approved pieces · every demo session produces a Session Report in /atelier/sessions · bracelet and ring AR stable on a laptop webcam and one phone · tops shown as a 3D pair · live price updates on metal/karat/size changes · a booking produces the PDF + emails + dashboard entry · the access gate and signed URLs are verified (a direct bucket URL returns 403) · deployed on DigitalOcean with the .tech domain · no forbidden terms in the repo.
```

---

# PART D — Claude Code Session Prompts

**Setup (5 min, a human does it):** create a **private** repo; add `SPEC.md` (Part C); create `private/stl_in/` with the 15 STLs (keep their original names, since the `b` / `r` / `t` prefix sets the type; rename only the known bracelet file to `b_fixture_a.stl`); create `.forbidden-terms` (one studio/brand/person term per line; it's gitignored); drop the Claude Design exports into `app/public/brand/` as they arrive.

**Timeline (10 h, two sessions in parallel):**
| Hour | Session 1 — Pipeline → then Atelier | Session 2 — App |
|---|---|---|
| 0–2 | S1.1 load, detect, exact volume, reconstruct | S2.1 scaffold, security, gate, tokens |
| 2–4 | S1.2 measure, curve, ends, exports, fixture | S2.2 pieces API, 3D viewer, assembly, pricing |
| 4–5 | S1.3 settings + stones (P1), batch 15, publish | S2.3 wrist AR (part 1) |
| 5–7 | S1.4 review tool + catalog (in app) | S2.3 wrist AR (part 2), S2.4 customise + look board |
| 7–9 | S1.5 booking, PDF, email, dashboard, insights | S2.5 polish with Claude Design assets, perf |
| 9–10 | Deploy + security checks + rehearsal (together) | |

**Rule for every session:** start by reading `SPEC.md`. Work only on the named milestone. Run the tests. Commit. Then report what's done, what failed, and any open questions. Never add real brand names, never commit anything under `private/`, and never call external AI services.

---

### Session 1 · S1.1 — Pipeline core
```
Read SPEC.md fully. You are building the Python asset pipeline in /pipeline (Python 3.11, uv or pip, package name lumen_pipeline, CLI "lumen").

Milestone S1.1 only (SPEC §4.1–4.3):
1. Project setup: pyproject with trimesh, numpy, scipy, shapely, scikit-image, networkx, rtree, fast-simplification (or pymeshlab), pygltflib, click, pytest. Add a .gitignore that includes private/.
2. load.py: load ASCII/binary STL with trimesh (force='mesh'), merge vertices, unit sanity checks (warn + rescale per SPEC).
3. detect_export.py: detect "sliced" vs "solid" exactly as in SPEC §4.1; return {export_type, layer_t, layers, zmin, zmax}.
4. volume.py: exact volume from per-layer sections (section_multiplane at mid-layer heights, shapely unary_union, area × t). Vectorize where possible and add a progress bar.
5. reconstruct.py: rasterize each layer's union onto a 0.04 mm XY grid (use skimage.draw.polygon for exteriors, subtract holes), stack into a boolean volume (z spacing = layer_t), pad by 2, marching_cubes with spacing, translate back to world coordinates, Taubin smoothing (trimesh.smoothing.filter_taubin, 8 iterations), keep the largest components, and ensure outward normals. Check the recon volume against the slice volume (≤ 3%, else retry at 0.03 mm, else add a warning). Z-chunk if the grid would exceed 150M voxels.
6. CLI: `lumen probe <file>` prints the detection result, slice volume, recon volume, and the timing of each stage.
7. Tests (pytest) with private/stl_in/b_fixture_a.stl (skip if missing): sliced / 0.0508 / 673 layers; volume_slices 671.5 ± 1%; recon within 3%.
Report the timings. Keep memory under ~6 GB.
```

### Session 1 · S1.2 — Measurements, curve, ends, exports
```
Read SPEC.md. Milestone S1.2 (SPEC §4.4, 4.5, 4.7, 4.8, 4.9 non-P1 rows):
1. measure.py: weights for every alloy in the SPEC table; bbox; surface area.
2. types.py + curve.py: type from the filename prefix (b → bracelet, r → ring, t → tops, else unknown) per SPEC §4.5. For b and r: PCA plane → 2D projection → angle bins (1°) → per-bin minimum radius → RANSAC circle → {center, inner_radius_mm, span_deg, plane_normal}; for b_fixture_a the span must be 120–140°. For r: closed-loop check, inner diameter → ring size (config table, Indian + US), band width/thickness, top angle. For t: bbox, front direction, post detection.
3. ends.py (b only): cross-sections at the two angular extremes → {center, tangent, connector: "hole" if a through-hole Ø 0.6–3 mm lies within 3 mm of the end, else "butt"}; also segment chord_mm and arc_len_mm at the mid radius.
4. export.py:
   - web.glb: decimate to ≤ 60k tris, apply Draco via the gltf-transform CLI (npx @gltf-transform/cli draco), with a single node "band" for now.
   - ar.glb: ≤ 20k tris, Draco.
   - thumb.webp: 1024×1024 render. Use pyrender offscreen if it works in this environment; otherwise a clean matplotlib-shaded orthographic render on #F5F0E8.
   - manifest.json exactly per SPEC §4.8, with opaque ids (p_ + first 8 hex characters of sha256 of the file bytes). Never write original filenames into outputs except in a local-only private/assets_out/_index.csv.
5. `lumen ingest <in> <out> --workers N`: process all files in parallel and write a summary table (id, layers, volume, 18k weight, span, warnings).
6. Tests: all non-P1 fixture rows in SPEC §4.9; the GLB size limits; manifest schema validation (pydantic); the prefix → type mapping; a synthetic torus ring (inner Ø 17 mm) recovers the right ring size.
Run ingest on all 15 files and paste the summary table.
```

### Session 1 · S1.3 — Settings, stones, publish
```
Read SPEC.md. Milestone S1.3:
A) heads.py (SPEC §4.6): detect the protruding heads from the per-angle max-radius profile; for each head, take perpendicular cross-sections every 0.1 mm and classify prong heads (k equal-angle islands on a common circle for ≥ 0.8 mm). Record prongs, prong_w_mm, r_in_mm, axis, origin; infer the stone diameter and carat; detect arrays. Label faces of web.glb into nodes band / head_i (a cylinder around each head axis with radius = prong outer radius + 0.3 mm). Tests: b_fixture_a has 9 heads, 4 prongs each, prong width 1.016 ± 0.03, r_in 1.47 ± 0.05, d 3.0 ± 0.1, ct 0.09–0.11. If it isn't reliable after ~75 minutes, ship it with warnings and move on.
B) gems (for the app): export the per-head stone placements (origin, axis, d_mm) in the manifest; the app renders gems procedurally.
C) publish.py: `lumen publish <assets_out>` uploads web.glb, ar.glb, thumb.webp, and manifest.json for each piece to the private DigitalOcean Spaces bucket (boto3, S3-compatible, ServerSideEncryption=AES256, ACL private) under pieces/<id>/, and upserts pieces rows (manifest jsonb, approved=false) into Tiger Data (DATABASE_URL). Include a --dry-run flag. Never upload STLs or _index.csv.
Run the full ingest + publish and report.
```

### Session 1 · S1.4 — Review tool + catalog (inside the app repo, after S2.2 has landed)
```
Read SPEC.md. Milestone S1.4, in the Next.js app, at /atelier/catalog (atelier passcode required):
- A grid of all pieces (thumb via a signed URL, 18k weight, stone estimate, warnings, approved status).
- A piece page: the 3D viewer (reuse the S2.2 component) with toggles for head markers, segment ends (bracelets), and the post (tops); editable fields: type (pre-filled from the prefix: bracelet / ring / tops; override allowed), lyrical name, collection (Heirloom / Fine / Playful), stone shape/size override, connector override, story (2 lines); Approve / Hide. Save to pieces.review via the API (zod-validated).
- Only approved pieces appear on the client side.
Style with the Quiet Heritage tokens. Add Playwright smoke tests for approve → visible on /collection.
```

### Session 1 · S1.5 — Booking, Design Brief, emails, dashboard
```
Read SPEC.md. Milestone S1.5 (SPEC §5.6, 5.7, 7):
1. Slots API: generated from config (Mon–Sat 11:00–19:00 Asia/Kolkata, 45-min slots, 15-min buffer, 14 days ahead), excluding booked ones. Return times in both IST and the client's timezone (sent by the client).
2. /book flow per the Claude Design D7 screen 9: visit type, slot, contact (name, phone, WhatsApp toggle, email), occasion, date needed, budget range, consent, selected looks (from IndexedDB). On submit: upload the snapshots to private Spaces (bookings/<id>/look-n.png), insert the booking in a DB transaction with a unique slot constraint, generate the Design Brief PDF with @react-pdf/renderer following public/brand/brief-spec (Claude Design D9) using Cormorant/Jost TTFs embedded, store it privately, send the emails (D10 HTML templates) via Resend if RESEND_API_KEY is set, else log them. Attach an .ics to the client email. → /book/done.
3. /atelier (passcode): bookings list grouped by day with status chips, a booking detail page (looks via signed URLs, config table original → requested, quote breakdown, notes, status changes, brief download via signed URL).
4. /atelier/insights: charts (Recharts, hairline style) from Tiger Data continuous aggregates: AR seconds per piece, metal/karat choices, wrist-size distribution, budgets vs quotes, viewed-but-never-worn pieces. Every card shows n and the date range.
5. /atelier/security: create/revoke access codes (argon2-hashed, expiry), a list of active sessions, revoke all.
6. Session Reports (SPEC §5.8): lib/sessionReport pure functions (favourite piece, metal preference, price sensitivity, size uncertainty, hesitation, drop-off, talking points), a session-close job (idle sweep every minute + beacon + on booking), /atelier/sessions feed and detail pages, a per-session PDF (reuse the Design Brief components), the Session Report appended to the Design Brief on booking, and a 20:00 IST daily digest email (a cron route; log-only without RESEND_API_KEY).
Tests: the double-booking race (two concurrent submits → one wins), PDF generation snapshot, email templating, and sessionReport fixtures (synthetic event streams with expected signals).
```

### Session 2 · S2.1 — Scaffold + security + design system
```
Read SPEC.md fully. Build /app: Next.js 14 (App Router, TypeScript strict), Tailwind using public/brand/tailwind.theme.js and tokens.css (if they're not there yet, create them from SPEC/Part A values: ivory #F5F0E8, ink #1B1916, gold #A8844A, ruby #6E1E2A, emerald #1E4638, pearl #E8E2D8, stone #8A8378; fonts Cormorant Garamond, Jost, Tiro Devanagari Hindi via next/font).
Milestone S2.1:
1. Security first (SPEC §9): the access gate at /gate (hashed codes in access_codes, argon2), middleware protecting every route, a signed httpOnly session cookie, rate limiting (an in-memory LRU is fine for the demo), a separate atelier passcode, security headers (CSP allowing self, the Spaces endpoint, and the MediaPipe CDN + wasm; X-Robots-Tag noindex; Referrer-Policy no-referrer; Permissions-Policy camera=(self)), plus robots.txt disallow-all.
2. db/migrations with all SPEC §7 tables (Timescale hypertables + continuous aggregates) and a `npm run db:migrate` script.
3. lib/storage: getSignedAssetUrl(pieceId, kind) using the S3 SDK against Spaces with a 5-min TTL. A DEV fallback when SPACES_* are unset serves files from ../private/assets_out through an API route that checks the session plus an HMAC token with a 5-minute expiry.
4. The design-system primitives from Claude Design D1 (Button, Chip, Segmented, Swatch, Stepper, SpecTable, PricePill, Sheet, Modal, Toast, ConsentRow) as React components, with a /dev/components page (gated).
5. Layout: global nav (monogram, Collection, Try on, Look board, Book), footer ("{STUDIO_NAME}" line + hallmark seal), page transitions.
6. CI (GitHub Actions): typecheck, lint, tests, and a forbidden-terms grep that fails if any line of .forbidden-terms (supplied via a CI secret, not committed) appears, plus a check that fails on any committed .stl/.jcd/.glb.
Verify: without a code you get /gate; the wrong code gets rate-limited; the right code works; a direct request for any asset without a session returns 401/403.
```

### Session 2 · S2.2 — Collection, 3D viewer, assembly, pricing
```
Read SPEC.md. Milestone S2.2 (SPEC §5.1, 5.2, 6):
1. /api/pieces (approved only) and /api/pieces/[id]/asset (signed URL). Pages: / (welcome per Claude Design D7 #2), /collection (filters: Heirloom / Fine / Playful; masonry grid; thumbnails via signed URLs with a pearl shimmer), /piece/[id] (gallery = turntable thumb + live 3D, lyrical name, story, spec table, price pill, "Try it on your wrist").
2. lib/assembly exactly per SPEC §5.1 (bracelet assembly, ring resizing, tops pairing): n from the wrist size, the arc-length-preserving bend of the ar.glb geometry (cached per wrist size), InstancedMesh placement around the circle, procedural jump rings for "hole" connectors, a procedural box clasp, and totals (weight, stones). Unit-test the bend (the arc length at the mid radius is preserved within 1%), the totals (fixture: n × segment weight + clasp), ring resizing (the band thickness is unchanged; the weight ratio ≈ R_new/R_old), and tops (×2).
3. 3D viewer (react-three-fiber + drei): ivory background, Environment preset "studio", metal presets (yellow/white/rose/platinum), a slow turntable, orbit, contact shadow. Procedural round-brilliant gems at manifest stone placements (P1; a simple 57-facet approximation with MeshPhysicalMaterial, ior 2.42, transmission 1, thickness 1).
4. lib/pricing per SPEC §6 as pure functions with a breakdown object; tests with hand-checked numbers. /api/quote logs to the quotes hypertable. The atelier sets the daily gold rate (a simple form in /atelier; stub it now if S1.5 isn't done).
5. Customise panel (Sheet): metal, karat, size (wrist 14–20 cm for bracelets; ring size for rings; none for tops), all updating the 3D view, weight, and price live (debounced 100 ms).
Performance: the 3D view is interactive in under 2.5 s on a laptop; the GLB is fetched once and cached in memory (not in Cache Storage).
```

### Session 2 · S2.3 — Hand AR: bracelets + rings (the hero)
```
Read SPEC.md §5.3 carefully. Milestone S2.3 (bracelet mode first; get it stable before ring mode), at /piece/[id]/ar (Evening mode UI from Claude Design D7 #6):
1. Camera: getUserMedia (front camera default, flip button), a permission screen (D5 art + privacy copy), a mirrored preview for the front camera.
2. MediaPipe Tasks Vision HandLandmarker (VIDEO mode, GPU delegate, numHands 1), loading the wasm/model from the pinned CDN allowed by the CSP. Run detection in requestAnimationFrame at the video's frame rate; skip frames if behind.
3. Pose solver (lib/ar/wristPose.ts):
   - wrist centre = lm0 + 18 mm along the forearm axis (normalize(lm0 − lm9));
   - palm normal = normalize(cross(lm5 − lm0, lm17 − lm0)), flipped for handedness;
   - depth from palm width: z = f · PALM_WIDTH_MM / pixel distance(lm5, lm17), with f from CAMERA_FOV_DEG and the video width;
   - unproject to camera space; build a quaternion with the bracelet axis = forearm axis and the up direction = palm normal.
   Unit-test it with synthetic landmarks.
4. Rendering: a transparent three.js canvas over the video, with a camera matching the video's intrinsics (same FOV, aspect). The assembled bracelet (from S2.2 assembly, using ar.glb instances) is placed at the pose. An OCCLUDER: an elliptical cylinder (1.25:1, radius 0.95 × inner radius, length 70 mm) along the forearm axis with colorWrite=false, rendered first (renderOrder −1).
5. Smoothing: One-Euro filters (position: minCutoff 1.0, beta 0.02; rotation via a per-component filter on the quaternion, then normalize). Hold 300 ms on lost tracking, then fade out over 250 ms. A tracking-status pill ("Finding you…", "Looking good", "Move your wrist into the arch").
6. Lighting match: every 500 ms, sample a 32×32 downscaled frame → mean luminance and warmth → adjust envMapIntensity (0.6–1.4) and a subtle warm/cool tint on the key light.
7. Controls rail: piece switcher (approved bracelets), metal swatches, karat, wrist-size stepper (re-assembles), snapshot (composite video + canvas → PNG → IndexedDB look board with the config and quote), and a floating price pill.
8. Fallbacks: if WebGL2/wasm init fails, or fps stays below 15 for 3 s → offer "View in 3D instead". Also a calibration drawer (hidden behind a long-press on the title) for the FOV and palm width.
9. Ring mode per SPEC §5.3: lerp(lm13, lm14, 0.38), axis lm13→lm14, head toward the back of the hand, the finger occluder plus a middle-finger occluder, smoother filtering, and the ring-size stepper. Switch mode automatically from the piece type. Tops pieces route to the 3D viewer ("Ear try-on coming soon").
10. Emit events: ar_start, ar_stop (seconds), snapshot, customise.
Unit-test the ring pose with synthetic landmarks too. Test on a laptop webcam and on a phone over HTTPS (use the deployed preview or a tunnel). Target ≥ 24 fps on a laptop.
```

### Session 2 · S2.4 — Look board + wiring
```
Read SPEC.md. Milestone S2.4:
1. /looks: a grid of saved looks from IndexedDB (snapshot, piece name, config, quote); delete; select up to 4 → "Book a consultation with these".
2. Wire /book (from S1.5) to receive the selected looks; if S1.5 isn't merged yet, build the client-side form UI and stub the POST.
3. Events: view, ar_start/ar_stop, customise, snapshot, book_start, book_submit → /api/events (batched every 5 s and on pagehide via sendBeacon). No PII in events.
4. Empty states, 404, offline states using the Claude Design D5 assets; copy from public/brand/copy.en.json (fall back to inline defaults).
```

### Session 2 · S2.5 — Design polish & performance
```
Read SPEC.md and everything in public/brand/. Milestone S2.5: make it look like a private viewing room, not a tech demo.
- Apply the Claude Design outputs precisely: tokens, type scale, motifs (gold-thread dividers, the jaali background at 5%, the arch frames), the icon sprite, and the motion (thread loader, AR calibration corners, piece-switch dissolve, snapshot flash, 8px-rise page transitions).
- Audit every screen against D7/D8 at 390 and 1440 widths; fix spacing, alignment, and typographic hierarchy; make sure gold is only ever used for lines and small accents.
- Accessibility: AA contrast, focus rings, reduced-motion support (disable the turntable and thread animations), labels for all controls.
- Performance: Lighthouse ≥ 85 on /collection (mobile); lazy-load three.js and MediaPipe only on piece/AR routes; preload the next piece's ar.glb in AR.
- A final security pass: verify the headers, gate, and signed-URL expiry; confirm that a Spaces object URL without a signature returns 403; confirm nothing under private/ is tracked by git.
```

### Final — Deploy (both sessions, last hour)
```
Read SPEC.md. Deploy /app to DigitalOcean App Platform (Node 20), with env vars from SPEC §10; the private Spaces bucket in the same region; a custom .tech domain with HTTPS. Run the migrations against Tiger Data. Seed: publish the approved pieces, set today's gold rate, and create 3 demo access codes (expiring in 48 h). Smoke test: gate → collection → piece → 3D → AR on a phone → snapshot → book → PDF + atelier dashboard entry. Write DEMO.md with the demo script (≤ 3 min), the fallback paths (3D-only mode, local dev server), and the security talking points.
```

---

## Tracks this MVP targets
**Best Hack Without an LLM** (no AI anywhere) · **Signal-to-Insight** (raw sliced CAD → exact weight, stones, and price; AR sessions → the atelier's demand insights) · **Most Fundable** · **Best Use of Tiger Data** (hypertables + continuous aggregates) · **Best Use of DigitalOcean** (App Platform + private Spaces) · **Best .Tech domain**. Confirm the track cap with organizers.
