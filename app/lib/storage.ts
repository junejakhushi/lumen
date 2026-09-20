import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const TTL = 5 * 60; // 5 minutes

const FILE_MAP: Record<string, string> = {
  web: "web.glb",
  ar: "ar.glb",
  thumb: "thumb.webp",
};

function getS3Client(): S3Client | null {
  if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) return null;
  return new S3Client({
    region: process.env.SPACES_REGION ?? "nyc3",
    endpoint: process.env.SPACES_ENDPOINT,
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    },
    forcePathStyle: false,
  });
}

/**
 * Returns a short-lived signed URL for a piece asset.
 * In production: S3-compatible presigned URL from DigitalOcean Spaces.
 * In dev (no SPACES_KEY): HMAC-signed URL to the dev-asset proxy.
 */
export async function getSignedAssetUrl(
  pieceId: string,
  kind: "web" | "ar" | "thumb"
): Promise<string> {
  const filename = FILE_MAP[kind];
  const key = `pieces/${pieceId}/${filename}`;

  const s3 = getS3Client();
  if (s3 && process.env.SPACES_BUCKET) {
    const cmd = new GetObjectCommand({
      Bucket: process.env.SPACES_BUCKET,
      Key: key,
    });
    return getSignedUrl(s3, cmd, { expiresIn: TTL });
  }

  // DEV fallback: HMAC-signed local URL
  const expires = Math.floor(Date.now() / 1000) + TTL;
  const secret = process.env.SESSION_SECRET ?? "dev-secret";
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${pieceId}:${kind}:${expires}`)
    .digest("hex")
    .slice(0, 16);

  return `/api/dev-asset/${encodeURIComponent(pieceId)}/${kind}?expires=${expires}&sig=${sig}`;
}

/** Where private files live when there is no Spaces bucket (dev and rehearsal). */
export function devPrivateDir(): string {
  return process.env.PRIVATE_DIR ?? "../private/dev-private";
}

/** Serverless filesystems are read-only, so files have to go to the database instead. */
export function filesystemIsWritable(): boolean {
  return !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;
}

/**
 * Store a private object: the Spaces bucket when configured (encrypted, private ACL),
 * otherwise a file under private/ so the flow still works on a laptop.
 */
export async function putPrivateObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ key: string; where: "spaces" | "file" | "db" }> {
  const s3 = getS3Client();
  if (s3 && process.env.SPACES_BUCKET) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.SPACES_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "private",
        ServerSideEncryption: "AES256",
        CacheControl: "private, no-store",
      })
    );
    return { key, where: "spaces" };
  }

  if (filesystemIsWritable()) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.resolve(process.cwd(), devPrivateDir(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return { key, where: "file" };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "No Spaces bucket, no database, and a read-only filesystem: nowhere to keep private files."
    );
  }
  const { pool } = await import("@/lib/db");
  await pool.query(
    `INSERT INTO private_files (key, content, content_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type`,
    [key, body, contentType]
  );
  return { key, where: "db" };
}

/** Read a private object back, wherever it was put. */
export async function getPrivateObject(
  key: string
): Promise<{ body: Buffer; contentType: string } | null> {
  const s3 = getS3Client();
  if (s3 && process.env.SPACES_BUCKET) {
    try {
      const out = await s3.send(
        new GetObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: key })
      );
      const bytes = await out.Body?.transformToByteArray();
      return bytes
        ? { body: Buffer.from(bytes), contentType: out.ContentType ?? "application/octet-stream" }
        : null;
    } catch {
      return null;
    }
  }

  if (filesystemIsWritable()) {
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const root = path.resolve(process.cwd(), devPrivateDir());
      const file = path.resolve(root, key);
      if (!file.startsWith(root + path.sep)) return null;
      return { body: await fs.readFile(file), contentType: contentTypeFor(file) };
    } catch {
      return null;
    }
  }

  if (!process.env.DATABASE_URL) return null;
  try {
    const { query } = await import("@/lib/db");
    const rows = await query<{ content: Buffer; content_type: string }>(
      `SELECT content, content_type FROM private_files WHERE key = $1`,
      [key]
    );
    return rows[0] ? { body: rows[0].content, contentType: rows[0].content_type } : null;
  } catch {
    return null;
  }
}

function contentTypeFor(file: string): string {
  if (file.endsWith(".pdf")) return "application/pdf";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".ics")) return "text/calendar";
  if (file.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

/** A short-lived URL for any private object (booking snapshots, briefs, session reports). */
export async function getSignedKeyUrl(key: string): Promise<string> {
  const s3 = getS3Client();
  if (s3 && process.env.SPACES_BUCKET) {
    const cmd = new GetObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: key });
    return getSignedUrl(s3, cmd, { expiresIn: TTL });
  }
  const expires = Math.floor(Date.now() / 1000) + TTL;
  const sig = signKey(key, expires);
  return `/api/dev-file/${key.split("/").map(encodeURIComponent).join("/")}?expires=${expires}&sig=${sig}`;
}

function signKey(key: string, expires: number): string {
  const secret = process.env.SESSION_SECRET ?? "dev-secret";
  return crypto.createHmac("sha256", secret).update(`${key}:${expires}`).digest("hex").slice(0, 16);
}

export function verifyKeySig(key: string, expires: string, sig: string): boolean {
  if (parseInt(expires, 10) < Math.floor(Date.now() / 1000)) return false;
  return sig === signKey(key, parseInt(expires, 10));
}

/**
 * Verify a dev-asset HMAC signature.
 */
export function verifyDevAssetSig(
  pieceId: string,
  kind: string,
  expires: string,
  sig: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (parseInt(expires, 10) < now) return false;

  const secret = process.env.SESSION_SECRET ?? "dev-secret";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${pieceId}:${kind}:${expires}`)
    .digest("hex")
    .slice(0, 16);

  return sig === expected;
}
