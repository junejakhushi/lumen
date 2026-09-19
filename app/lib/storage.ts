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
