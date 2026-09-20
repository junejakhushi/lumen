
import type { PieceManifest } from "@/lib/types";
import { normaliseReview, type Review } from "@/lib/review";

/**
 * Catalog data access for the atelier (SPEC §5.7).
 *
 * The database is the source of truth once `lumen publish` has run. Without a
 * DATABASE_URL the app falls back to the manifests the pipeline wrote to
 * `private/assets_out/`, so the review tool works on a laptop with no services.
 */

export interface CatalogPiece {
  id: string;
  type: string;
  approved: boolean;
  name: string | null;
  collection: string | null;
  review: Review;
  manifest: PieceManifest;
  warnings: string[];
}

export type Source = "db" | "files";

function assetsDir(): string {
  return process.env.ASSETS_OUT_DIR ?? "../private/assets_out";
}

function toCatalogPiece(
  id: string,
  manifest: PieceManifest,
  row?: { approved: boolean; name: string | null; collection: string | null; type: string }
): CatalogPiece {
  const review = normaliseReview(manifest.review, row?.type ?? manifest.type);
  return {
    id,
    type: review.type,
    approved: row ? row.approved : review.status === "approved",
    name: row?.name ?? review.name,
    collection: row?.collection ?? review.collection,
    review,
    manifest,
    warnings: manifest.warnings ?? [],
  };
}

async function readFromFiles(): Promise<CatalogPiece[]> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.resolve(process.cwd(), assetsDir());
  let entries: string[];
  try {
    entries = (await fs.readdir(dir)).filter((d) => d.startsWith("p_"));
  } catch {
    return [];
  }
  const pieces: CatalogPiece[] = [];
  for (const entry of entries.sort()) {
    try {
      const raw = await fs.readFile(path.join(dir, entry, "manifest.json"), "utf-8");
      const manifest = JSON.parse(raw) as PieceManifest;
      pieces.push(toCatalogPiece(manifest.id ?? entry, manifest));
    } catch {
      // a folder without a readable manifest is simply not in the catalog
    }
  }
  return pieces;
}

async function readFromDb(): Promise<CatalogPiece[] | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { query } = await import("@/lib/db");
    const rows = await query<{
      id: string;
      manifest: PieceManifest;
      approved: boolean;
      name: string | null;
      collection: string | null;
      type: string;
    }>(
      `SELECT id, manifest, approved, name, collection, type
       FROM pieces
       ORDER BY type, id`
    );
    return rows.map((row) => toCatalogPiece(row.id, row.manifest, row));
  } catch {
    return null;
  }
}

/** Every piece the atelier can review, approved or not. */
export async function listCatalog(): Promise<{ pieces: CatalogPiece[]; source: Source }> {
  const fromDb = await readFromDb();
  if (fromDb && fromDb.length > 0) return { pieces: fromDb, source: "db" };
  return { pieces: await readFromFiles(), source: "files" };
}

export async function getCatalogPiece(id: string): Promise<CatalogPiece | null> {
  const { pieces } = await listCatalog();
  return pieces.find((p) => p.id === id) ?? null;
}

async function saveToDb(id: string, review: Review): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `UPDATE pieces
       SET manifest = jsonb_set(manifest, '{review}', $2::jsonb, true),
           approved = $3,
           name = $4,
           collection = $5,
           type = $6
       WHERE id = $1`,
      [
        id,
        JSON.stringify(review),
        review.status === "approved",
        review.name,
        review.collection,
        review.type,
      ]
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

async function saveToFile(id: string, review: Review): Promise<boolean> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.resolve(process.cwd(), assetsDir(), id, "manifest.json");
  try {
    const manifest = JSON.parse(await fs.readFile(file, "utf-8")) as PieceManifest;
    const next = { ...manifest, review };
    await fs.writeFile(file, JSON.stringify(next, null, 1) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist a review. Writes to the database when one is configured, otherwise back into
 * the piece's manifest on disk. Returns false when the piece is unknown to both.
 */
export async function saveReview(id: string, review: Review): Promise<{ ok: boolean; source: Source }> {
  if (await saveToDb(id, review)) return { ok: true, source: "db" };
  return { ok: await saveToFile(id, review), source: "files" };
}
