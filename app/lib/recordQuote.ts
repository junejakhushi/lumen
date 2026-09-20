"use client";

import type { PriceBreakdown } from "./pricing";

/**
 * Record a configuration the client settled on (SPEC §5.7).
 *
 * A quote is written when the client stops adjusting, not on every tap of a stepper — the
 * question the insight sheet answers is what people chose, and a value they passed through on
 * the way to another one is not a choice. A second of quiet is the test.
 */

const SETTLE_MS = 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let lastKey = "";

export interface QuoteConfig {
  metal: string;
  karat: string;
  wrist_cm?: number;
  ring_size_in?: number;
  stone_type?: string;
  stone_cut?: string;
  stone_scale?: number;
}

export function recordQuote(pieceId: string, config: QuoteConfig, price: PriceBreakdown): void {
  if (!pieceId) return;
  const key = `${pieceId}|${JSON.stringify(config)}`;
  if (key === lastKey) return; // the same configuration, already written

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    lastKey = key;
    const body = JSON.stringify({
      piece_id: pieceId,
      config,
      breakdown: {
        weight_g: price.weight_g,
        metal_value: price.metal_value,
        making: price.making,
        stones_value: price.stones_value,
        tax: price.tax,
        total: price.total,
      },
      total: Math.round(price.total),
    });
    // Losing a quote costs an entry in a chart, so a failure is not worth telling anyone about.
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, SETTLE_MS);
}
