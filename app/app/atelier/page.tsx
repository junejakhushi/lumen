"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chip, GoldDivider } from "@/components/ui";
import type { BookingSummary } from "@/lib/atelier/bookingTypes";

/** Consultations, grouped by day (SPEC §5.7). */

interface Day {
  date: string;
  weekday: string;
  bookings: BookingSummary[];
}

const FILTERS = ["Upcoming", "All", "New", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<string, string> = {
  new: "text-ruby",
  confirmed: "text-emerald",
  completed: "text-stone",
  "no-show": "text-stone",
};

export default function AtelierHomePage() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Upcoming");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/atelier/bookings")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setDays(data.days ?? []);
        setError(data.error ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not read the consultations.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return days
      .map((day) => ({
        ...day,
        bookings: day.bookings.filter((b) => {
          if (filter === "All") return true;
          if (filter === "New") return b.status === "new";
          if (filter === "Completed") return b.status === "completed";
          return new Date(b.slot_start).getTime() >= now - 45 * 60000;
        }),
      }))
      .filter((day) => day.bookings.length > 0);
  }, [days, filter]);

  const total = days.reduce((n, d) => n + d.bookings.length, 0);

  return (
    <div className="px-margin-m lg:px-margin-d py-12 lg:py-16 max-w-content mx-auto">
      <p className="label-m text-text-muted mb-3">Atelier</p>
      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-3">
        Consultations
      </h1>
      <GoldDivider className="w-16 mb-6" />

      <nav className="flex flex-wrap gap-4 mb-8" aria-label="Atelier sections">
        <Link href="/atelier/catalog" className="qh-link">Catalog</Link>
        <Link href="/atelier/sessions" className="qh-link">Sessions</Link>
        <Link href="/atelier/insights" className="qh-link">Insights</Link>
        <Link href="/atelier/security" className="qh-link">Security</Link>
      </nav>

      <div className="flex flex-wrap gap-3 mb-6" role="group" aria-label="Filter consultations">
        {FILTERS.map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {loading && <p className="text-body-m-m text-text-muted">Opening the book…</p>}
      {error && (
        <p className="text-body-m-m text-text-muted" role="status">
          {error}
        </p>
      )}
      {!loading && !error && total === 0 && (
        <p className="text-body-m-m text-text-muted">
          No consultations booked yet. They appear here the moment a client books.
        </p>
      )}

      {filtered.map((day) => (
        <section key={day.date} className="mb-10">
          <h2 className="label-m text-text-muted mb-3">
            {day.weekday} · {day.date}
          </h2>
          <ul className="list-none p-0 m-0 border-t border-hairline">
            {day.bookings.map((booking) => (
              <li key={booking.id} className="border-b border-hairline" data-testid="booking-row">
                <Link
                  href={`/atelier/bookings/${booking.id}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 no-underline"
                >
                  <span className="font-display text-title-s-m text-text w-16">
                    {booking.studio.time}
                  </span>
                  <span className="text-body-m-m text-text flex-1 min-w-[10rem]">
                    {booking.client?.name ?? "—"}
                  </span>
                  <span className="caption-m text-text-muted">
                    {booking.visit_type === "video" ? "Video call" : "Studio visit"}
                    {booking.lookCount > 0
                      ? ` · ${booking.lookCount} ${booking.lookCount === 1 ? "look" : "looks"}`
                      : ""}
                  </span>
                  <span className={`label-s ${STATUS_STYLE[booking.status] ?? "text-stone"}`}>
                    {booking.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
