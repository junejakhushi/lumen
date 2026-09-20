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

/**
 * Store a private object: the Spaces bucket when configured (encrypted, private ACL),
 * otherwise a file under private/ so the flow still works on a laptop.
 */
export async function putPrivateObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ key: string; where: "spaces" | "file" }> {
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

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.resolve(process.cwd(), devPrivateDir(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  return { key, where: "file" };
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
