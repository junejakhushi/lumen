# Lumen
A private, access-gated web app: an atelier's pieces, reconstructed from raw CAD, worn in 3D AR (bracelets on the wrist, rings on the finger; tops in 3D), customised with an exact weight and live price, and booked as a consultation. No AI. See `SPEC.md`.

## Run order
1. Claude Design D1–D12 (`docs/PROMPT_PACK.md`, Part B) → exports into `app/public/brand/`.
2. Claude Code Session 1: S1.1 → S1.5 (pipeline, then atelier side).
3. Claude Code Session 2: S2.1 → S2.5 (app, wrist AR, polish).
4. Deploy prompt + rehearsal.

## Security rules
- Never commit anything under `private/` (STLs live in `private/stl_in/`, original names: b = bracelet, r = ring, t = tops).
- No .stl/.jcd/.glb files in git; the pre-commit hook and CI block them.
- No studio names anywhere: list them in `.forbidden-terms` (gitignored) and the `FORBIDDEN_TERMS` repo secret.
- Assets are served only from a private bucket via 5-minute signed URLs, behind the access gate.
- Camera frames never leave the device.
- No third-party AI or image services.
