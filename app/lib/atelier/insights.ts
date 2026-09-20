import { query } from "@/lib/db";

/**
 * Demand insights (SPEC §5.7).
 *
 * Every figure here is counted from what clients actually did — try-ons, quotes, bookings —
 * and every card carries the number of observations behind it and the window it covers. A
 * chart drawn from four sessions is not evidence, and saying so on the card is the difference
 * between an insight and a decoration.
 */

export interface Card<T> {
  rows: T[];
  /** How many observations the card rests on. */
  n: number;
}

export interface Insights {
  /** The window every card covers. */
  from: string | null;
  to: string | null;
  days: number;
  arSeconds: Card<{ piece: string; seconds: number; sessions: number }>;
  metals: Card<{ choice: string; count: number }>;
  karats: Card<{ choice: string; count: number }>;
  wrists: Card<{ band: string; count: number }>;
  budgets: Card<{ band: string; count: number }>;
  neverWorn: Card<{ piece: string; views: number }>;
  totals: { sessions: number; tryOns: number; bookings: number; quotes: number };
}

const WINDOW_DAYS = 30;

function empty<T>(): Card<T> {
  return { rows: [], n: 0 };
}

/** Group a list of numbers into labelled bands, dropping bands nobody chose. */
function band(
  values: number[],
  edges: number[],
  label: (lo: number, hi: number | null) => string
): { band: string; count: number }[] {
  const counts = new Array(edges.length).fill(0);
  for (const v of values) {
    let i = edges.length - 1;
    while (i > 0 && v < edges[i]) i--;
    counts[i]++;
  }
  return edges
    .map((lo, i) => ({ band: label(lo, edges[i + 1] ?? null), count: counts[i] }))
    .filter((b) => b.count > 0);
}

export async function getInsights(): Promise<Insights> {
  const since = `now() - interval '${WINDOW_DAYS} days'`;

  const [span] = await query<{ from: string | null; to: string | null }>(
    `SELECT min(time)::text AS from, max(time)::text AS to FROM events WHERE time >= ${since}`
  );

  // Time worn, per piece. ar_stop carries the seconds the piece was on the hand.
  const arRows = await query<{ piece: string; seconds: string; sessions: string }>(
    `SELECT COALESCE(p.name, e.piece_id) AS piece,
            SUM((e.payload->>'seconds')::numeric) AS seconds,
            COUNT(DISTINCT e.session_id) AS sessions
       FROM events e
       LEFT JOIN pieces p ON p.id = e.piece_id
      WHERE e.type = 'ar_stop' AND e.piece_id IS NOT NULL AND e.time >= ${since}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 8`
  );

  // What clients configured. A quote is written every time the configuration changes, so
  // these are choices made, not pieces owned.
  const configRows = await query<{ metal: string | null; karat: string | null; wrist: string | null; total: string }>(
    `SELECT config->>'metal' AS metal,
            config->>'karat' AS karat,
            config->>'wrist_cm' AS wrist,
            total::text AS total
       FROM quotes
      WHERE time >= ${since}`
  );

  const countBy = (key: "metal" | "karat") => {
    const counts = new Map<string, number>();
    for (const r of configRows) {
      const v = r[key];
      if (!v) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const rows = Array.from(counts, ([choice, count]) => ({ choice, count })).sort(
      (a, b) => b.count - a.count
    );
    return { rows, n: rows.reduce((s, r) => s + r.count, 0) };
  };

  const wristValues = configRows
    .map((r) => (r.wrist ? Number(r.wrist) : NaN))
    .filter((v) => Number.isFinite(v))
    .map((cm) => cm / 2.54);
  const wrists = {
    rows: band(wristValues, [5.5, 6, 6.5, 7, 7.5], (lo, hi) =>
      hi ? `${lo}–${hi} in` : `${lo} in +`
    ),
    n: wristValues.length,
  };

  const quoteTotals = configRows.map((r) => Number(r.total)).filter((v) => Number.isFinite(v));
  const budgets = {
    rows: band(quoteTotals, [0, 1000, 2500, 5000, 10000], (lo, hi) =>
      hi ? `$${lo.toLocaleString("en-US")}–${hi.toLocaleString("en-US")}` : `$${lo.toLocaleString("en-US")}+`
    ),
    n: quoteTotals.length,
  };

  // Pieces a client opened but never put on the hand — interest that the try-on did not hold.
  const neverWorn = await query<{ piece: string; views: string }>(
    `SELECT COALESCE(p.name, e.piece_id) AS piece, COUNT(*) AS views
       FROM events e
       LEFT JOIN pieces p ON p.id = e.piece_id
      WHERE e.type = 'piece_view' AND e.piece_id IS NOT NULL AND e.time >= ${since}
        AND NOT EXISTS (
          SELECT 1 FROM events w
           WHERE w.piece_id = e.piece_id AND w.type = 'ar_stop' AND w.time >= ${since}
        )
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 8`
  );

  const [totals] = await query<{ sessions: string; tryons: string; bookings: string; quotes: string }>(
    `SELECT (SELECT COUNT(*) FROM sessions WHERE started_at >= ${since}) AS sessions,
            (SELECT COUNT(*) FROM events WHERE type = 'ar_stop' AND time >= ${since}) AS tryons,
            (SELECT COUNT(*) FROM bookings WHERE created_at >= ${since}) AS bookings,
            (SELECT COUNT(*) FROM quotes WHERE time >= ${since}) AS quotes`
  );

  const ar = arRows.map((r) => ({
    piece: r.piece,
    seconds: Math.round(Number(r.seconds)),
    sessions: Number(r.sessions),
  }));

  return {
    from: span?.from ?? null,
    to: span?.to ?? null,
    days: WINDOW_DAYS,
    arSeconds: { rows: ar, n: ar.reduce((s, r) => s + r.sessions, 0) },
    metals: countBy("metal"),
    karats: countBy("karat"),
    wrists,
    budgets,
    neverWorn: {
      rows: neverWorn.map((r) => ({ piece: r.piece, views: Number(r.views) })),
      n: neverWorn.reduce((s, r) => s + Number(r.views), 0),
    },
    totals: {
      sessions: Number(totals?.sessions ?? 0),
      tryOns: Number(totals?.tryons ?? 0),
      bookings: Number(totals?.bookings ?? 0),
      quotes: Number(totals?.quotes ?? 0),
    },
  };
}

export const emptyInsights = (): Insights => ({
  from: null,
  to: null,
  days: WINDOW_DAYS,
  arSeconds: empty(),
  metals: empty(),
  karats: empty(),
  wrists: empty(),
  budgets: empty(),
  neverWorn: empty(),
  totals: { sessions: 0, tryOns: 0, bookings: 0, quotes: 0 },
});
