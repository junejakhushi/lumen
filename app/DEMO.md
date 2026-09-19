# Lumen — Demo Script (≤ 3 minutes)

> "Wear it before it's made." A private AR try-on and consultation experience for fine-jewellery design studios.

---

## Setup before the demo

1. **Access code**: `LUMEN1` (or set `DEV_ACCESS_CODE=LUMEN1` in env)
2. **Atelier passcode**: whatever you hashed into `ATELIER_PASSCODE_HASH`
3. Open the app on a laptop browser AND have a phone ready (same URL, HTTPS required for camera)
4. Clear the look board if there are stale snapshots (IndexedDB)

---

## Demo flow (3 min)

### 1. The gate (15 sec)
- Show the access gate — "This preview is private."
- Enter `LUMEN1` → authenticated, cookie set, redirected to welcome.
- **Point out**: no signup, no email — just a code from the atelier's invitation.

### 2. Welcome → Collection (20 sec)
- "Wear it before it's made." — two paths: Explore or Try on.
- Tap **Explore the collection** → masonry grid with thumbnails.
- Filter by Heirloom / Fine / Playful. Note the AR badge on bracelets and rings.

### 3. Piece detail + 3D viewer (30 sec)
- Tap a bracelet → 3D viewer with turntable, orbit, studio lighting.
- Switch metal: yellow → rose → white (instant material swap).
- Show the **spec table** (code, metal, karat, weight, dimensions).
- Show the **price breakdown** drawer (gold value, making 18%, GST 3%, indicative total).
- Change karat from 18K to 14K → weight and price update live.

### 4. AR try-on — the hero (60 sec)
- Tap **Try it on** → camera permission screen ("Nothing leaves this device").
- Allow camera → MediaPipe HandLandmarker finds the hand → "Looking good."
- **The bracelet appears on the wrist**, occluded by the arm, tracking in real time.
- Swipe metal swatches on the bottom rail → the bracelet changes colour live.
- Adjust wrist size with the stepper → the bracelet re-assembles.
- **Take a snapshot** → ivory flash, saved to the look board.
- If showing a ring: the ring sits on the ring finger with finger occluders.
- **On a phone**: flip camera to rear, show AR from another angle.

### 5. Look board + Book (30 sec)
- Go to **Look board** → the snapshot is there with config and price.
- Select it → **Book a consultation with these looks**.
- Fill the booking form (visit type, contact, occasion, budget, consent).
- Submit → "Your consultation is booked. Your design brief is on its way."

### 6. Wrap-up (15 sec)
- Return to the collection. Mention:
  - **No AI anywhere** — eligible for Best Hack Without an LLM.
  - Every number is deterministic: weight from CAD volume × alloy density.
  - Camera frames never leave the device.

---

## Fallback paths

| Situation | Fallback |
|---|---|
| No webcam / camera denied | "Not now, show it in 3D" → full 3D viewer with orbit |
| FPS < 15 for 3 seconds | "View in 3D instead" offered automatically |
| No database (Tiger Data) | App works with DEV_ACCESS_CODE env + local asset files |
| No DigitalOcean Spaces | Dev-asset proxy serves from `../private/assets_out/` with HMAC-signed URLs |
| Tops (stud earrings) | "Ear try-on coming soon" → shown as a 3D pair |

### Local dev server
```bash
cd app
cp ../.env.example .env.local
# Set DEV_ACCESS_CODE=LUMEN1 and SESSION_SECRET (32+ chars)
npm run dev
# Open https://localhost:3000 (or use a tunnel for phone testing)
```

---

## Security talking points

1. **Access-gated**: every route except `/gate` requires an authenticated session (httpOnly, secure, SameSite=strict cookie). Codes are argon2-hashed with expiry.
2. **Rate-limited**: 5 attempts/IP/minute on the gate.
3. **No public bucket**: DigitalOcean Spaces is private, ACL private, server-side encryption. Assets served only via 5-minute presigned URLs issued after session verification.
4. **Camera stays on-device**: MediaPipe WASM processes frames locally. Snapshots in IndexedDB — never uploaded unless the client books.
5. **Security headers**: CSP (self + Spaces + MediaPipe CDN), X-Robots-Tag noindex, Referrer-Policy no-referrer, Permissions-Policy camera=(self), X-Frame-Options DENY.
6. **No AI services**: no LLM, no image generation, no third-party AI anywhere. Every computation is deterministic.
7. **Repo hygiene**: `.gitignore` blocks `private/`, `.env*`, `.forbidden-terms`. Pre-commit hook and CI grep for forbidden terms and CAD/mesh files.
8. **Honest limit**: anything in a browser can be screen-captured — mitigated by decimated preview meshes (≤20K tris for AR), gating, and short-lived URLs.

---

## Tracks

- **Best Hack Without an LLM** — no AI anywhere
- **Signal-to-Insight** — raw sliced CAD → exact weight, stones, price; AR sessions → demand insights
- **Most Fundable**
- **Best Use of Tiger Data** — hypertables + continuous aggregates for events, quotes, gold rates
- **Best Use of DigitalOcean** — App Platform + private Spaces
- **Best .Tech domain**
