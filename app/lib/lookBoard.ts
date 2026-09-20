"use client";

/**
 * IndexedDB-backed look board for saved AR snapshots.
 * Snapshots stay on the device until the client books.
 */

const DB_NAME = "lumen_looks";
const STORE_NAME = "looks";
const DB_VERSION = 1;

export interface SavedLook {
  id: string;
  pieceId: string;
  pieceName: string;
  pieceType: string;
  snapshot: Blob;
  config: {
    metal: string;
    karat: string;
    wristCm?: number;
    ringSizeIn?: number;
    /** The stone the client chose. The pipeline measures settings, not stones (SPEC §4.6). */
    stoneType?: string;
    stoneCut?: string;
    /** Multiplies the measured stone size. */
    stoneScale?: number;
  };
  quote?: {
    total: number;
    breakdown: unknown;
  };
  /** Weight at the chosen size, when the piece page worked it out. */
  weightG?: number;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLook(data: Omit<SavedLook, "id" | "createdAt">): Promise<string> {
  const db = await openDB();
  const id = `look_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const look: SavedLook = {
    ...data,
    id,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(look);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLooks(): Promise<SavedLook[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const looks = (request.result as SavedLook[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(looks);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLook(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearLooks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


/** The longest side a snapshot is sent at. Full AR frames are far larger than a brief needs. */
const SNAPSHOT_MAX_PX = 900;

function readAsDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Snapshots live as blobs on the device; booking is the only time they are sent anywhere.
 * They are scaled down on the way out: the brief prints them small, and the request body has
 * a few megabytes to spare at most.
 */
export async function blobToDataUrl(blob: Blob | null | undefined): Promise<string | null> {
  if (!blob) return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, SNAPSHOT_MAX_PX / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && blob.size <= 1_000_000) {
      bitmap.close();
      return readAsDataUrl(blob);
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return readAsDataUrl(blob);
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/png");
  } catch {
    return readAsDataUrl(blob);
  }
}
