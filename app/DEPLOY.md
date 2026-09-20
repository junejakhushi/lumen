# Deploying Lumen on Vercel

The app is a normal Next.js 14 App Router project, so Vercel needs no build configuration —
only the environment and a database. `vercel.json` pins the region to Mumbai (`bom1`), next to
the Tiger Data service, and gives the booking route the 60 seconds it can need to render a PDF.

## 1. Database

The schema lives in `db/migrations/`. With the Tiger CLI:

```bash
tiger service create --name lumen            # or reuse an existing service
tiger db connection-string --with-password   # copy this
```

Append `&uselibpqcompat=true` to the connection string. Without it `pg` rejects Tiger's
certificate chain with `SELF_SIGNED_CERT_IN_CHAIN`:

```
postgresql://…/tsdb?sslmode=require&uselibpqcompat=true
```

Then, from `app/`:

```bash
DATABASE_URL="…" node scripts/migrate.mjs   # creates the schema, idempotent
DATABASE_URL="…" node scripts/seed.mjs      # demo access codes + today's gold rate
```

## 2. Import the repo

Vercel → New Project → import the repo → **set the root directory to `app/`**. Framework
preset, build command and output directory are detected.

## 3. Environment variables

Required:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Tiger Data connection string, with `&uselibpqcompat=true` |
| `SESSION_SECRET` | 32+ random characters; signs the session cookie |
| `ATELIER_PASSCODE_HASH` | argon2 hash of the atelier passcode (below) |
| `STUDIO_NAME` | White-label studio name, e.g. `The Atelier` |

Optional, each one degrading cleanly when absent:

| Variable | Without it |
|---|---|
| `SPACES_KEY` `SPACES_SECRET` `SPACES_BUCKET` `SPACES_REGION` `SPACES_ENDPOINT` | Briefs and snapshots are kept in the `private_files` table instead of the bucket, still behind the gate and short-lived signed URLs |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails are written to the function log rather than sent |
| `ATELIER_EMAIL` | The atelier is not notified of a new booking |
| `DEV_ACCESS_CODE` | Clients must use a code from `access_codes` (what `seed.mjs` creates) |
| `APP_BASE_URL` | Links in emails fall back to the request's own origin |
| `STUDIO_ADDRESS`, `STUDIO_VIDEO_LINK` | Those lines are left out of the confirmation email |
| `BOOKING_TZ` | Defaults to `Asia/Kolkata` |

To make the atelier passcode hash:

```bash
cd app && node -e "require('argon2').hash(process.argv[1]).then(console.log)" 'your passcode'
```

## 4. Pieces

The client collection and the atelier catalog read the `pieces` table. Publish from the
pipeline once the assets are built:

```bash
cd pipeline
.venv/bin/lumen ingest ../private/stl_in ../private/assets_out
.venv/bin/lumen publish ../private/assets_out      # uploads assets, upserts rows
```

`lumen publish` needs both `DATABASE_URL` and the `SPACES_*` credentials; it refuses rather
than half-publishing. Pieces stay invisible to clients until they are approved in
`/atelier/catalog`.

## What is different on Vercel

Three things behave differently from a laptop, and are handled:

- **The filesystem is read-only.** Design Briefs and look snapshots go to Spaces when it is
  configured and to the `private_files` table otherwise, never to disk.
- **Only traced files are bundled.** The PDF fonts (`public/fonts`) and the email templates
  (`public/brand/emails`) are read at request time and are not imported by any module, so
  `next.config.mjs` lists them in `outputFileTracingIncludes`.
- **Request bodies are capped at about 4.5 MB.** Look snapshots are scaled to 900 px before
  they are sent, and the API refuses a payload over 3.4 MB of images with a plain message.

## Checks after deploying

1. `/gate` accepts a seeded code and refuses a wrong one.
2. `/collection` lists approved pieces; a piece page renders in 3D.
3. `/book` shows consultation slots in both timezones; booking returns a brief number.
4. `/atelier` (atelier passcode) lists the consultation, and the brief downloads.
5. A direct bucket URL returns 403, and every asset URL expires after five minutes.
