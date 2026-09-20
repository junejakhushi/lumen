"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Insights } from "@/lib/atelier/insights";

/**
 * The insight sheet (SPEC §5.7).
 *
 * What clients did, counted from the events the app records — not a forecast and not a
 * projection. Each card states how many observations it rests on, because a bar chart drawn
 * from three try-ons looks exactly like one drawn from three hundred, and the difference is
 * the whole of whether it means anything.
 */

const INK = "#2B2622";
const GOLD = "#B08D57";
const QUIET = "#C9BFAE";

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** A card says what it counted and how much of it there was, or says there is nothing yet. */
function Card({
  title,
  note,
  n,
  minimum = 1,
  children,
}: {
  title: string;
  note: string;
  n: number;
  minimum?: number;
  children: ReactNode;
}) {
  const thin = n > 0 && n < 8;
  return (
    <section className="border border-hairline-quiet rounded-sm p-5 bg-ivory">
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h2 className="font-display text-body-l-m text-text">{title}</h2>
        <span className="caption-m text-text-muted whitespace-nowrap">n = {n}</span>
      </div>
      <p className="caption-m text-text-muted mb-4">{note}</p>
      {n < minimum ? (
        <p className="text-body-s-m text-text-muted py-8 text-center">
          Nothing recorded yet.
        </p>
      ) : (
        <>
          {children}
          {thin && (
            <p className="caption-m text-text-muted mt-3">
              Too few observations to read as a trend — shown as a record, not a finding.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function HBar({
  data,
  labelKey,
  valueKey,
  unit,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={116}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK, fontSize: 11, fontFamily: "var(--font-ui, sans-serif)" }}
        />
        <Tooltip
          cursor={{ fill: "rgba(176,141,87,0.08)" }}
          formatter={(v) => [`${v}${unit ? ` ${unit}` : ""}`, ""] as [string, string]}
          contentStyle={{
            background: "#FFFDF9",
            border: "1px solid #E8E2D8",
            borderRadius: 2,
            fontSize: 12,
          }}
        />
        <Bar dataKey={valueKey} radius={[0, 2, 2, 0]} barSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? GOLD : QUIET} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        setData(d.insights ?? null);
        if (d.error) setError(d.error);
      })
      .catch(() => setError("The insights could not be read just now."));
  }, []);

  if (!data) {
    return (
      <div className="max-w-content mx-auto px-6 lg:px-margin-d py-12">
        <p className="text-body-m-m text-text-muted">{error ?? "Counting…"}</p>
      </div>
    );
  }

  const t = data.totals;

  return (
    <div className="max-w-content mx-auto px-6 lg:px-margin-d py-8 lg:py-12">
      <p className="label-m text-text-muted mb-2">Atelier</p>
      <h1 className="font-display text-display-m-m lg:text-display-m-d text-text mb-3">
        Insight sheet
      </h1>
      <p className="text-body-m-m text-text-muted max-w-measure mb-8">
        What clients did in the last {data.days} days
        {data.from ? `, ${relativeDate(data.from)} to ${relativeDate(data.to)}` : ""}. Counted
        from the app&rsquo;s own records, never estimated.
      </p>

      {error && <p className="text-body-s-m text-text-muted mb-6">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-hairline-quiet border border-hairline-quiet rounded-sm mb-8 overflow-hidden">
        {[
          { label: "Sessions", value: t.sessions },
          { label: "Try-ons", value: t.tryOns },
          { label: "Quotes", value: t.quotes },
          { label: "Consultations", value: t.bookings },
        ].map((s) => (
          <div key={s.label} className="bg-ivory p-4">
            <p className="label-s text-text-muted mb-1">{s.label}</p>
            <p className="text-numeric-l text-text">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card
          title="Time on the hand"
          note="Seconds each piece was actually worn in the try-on."
          n={data.arSeconds.n}
        >
          <HBar data={data.arSeconds.rows} labelKey="piece" valueKey="seconds" unit="s" />
        </Card>

        <Card
          title="Metal chosen"
          note="Every configuration a client settled on."
          n={data.metals.n}
        >
          <HBar data={data.metals.rows} labelKey="choice" valueKey="count" />
        </Card>

        <Card title="Karat chosen" note="As above, by purity." n={data.karats.n}>
          <HBar data={data.karats.rows} labelKey="choice" valueKey="count" />
        </Card>

        <Card
          title="Wrist sizes"
          note="What clients set the bracelet to, in inches."
          n={data.wrists.n}
        >
          <HBar data={data.wrists.rows} labelKey="band" valueKey="count" />
        </Card>

        <Card
          title="Where the quotes land"
          note="Indicative totals, banded. Says what clients configure, not what they spend."
          n={data.budgets.n}
        >
          <HBar data={data.budgets.rows} labelKey="band" valueKey="count" />
        </Card>

        <Card
          title="Looked at, never worn"
          note="Pieces opened but never taken into the try-on."
          n={data.neverWorn.n}
        >
          <HBar data={data.neverWorn.rows} labelKey="piece" valueKey="views" />
        </Card>
      </div>

      <p className="caption-m text-text-muted mt-8 max-w-measure">
        Every card counts events this app recorded. Where a card is empty, nothing of that kind
        has happened yet — it is not a zero that has been rounded down.
      </p>
    </div>
  );
}
