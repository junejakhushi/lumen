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
