"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@/lib/slots";

/**
 * Consultation slot picker (SPEC §5.6, Claude Design D7 screen 9).
 *
 * Times are shown in the atelier's timezone with the client's own time beside them, so
 * nobody has to do the arithmetic.
 */

interface Day {
  date: string;
  weekday: string;
  slots: Slot[];
}

interface SlotPickerProps {
  value: string | null;
  onChange: (start: string | null) => void;
  error?: string;
}

export function SlotPicker({ value, onChange, error }: SlotPickerProps) {
  const [days, setDays] = useState<Day[]>([]);
  const [tz, setTz] = useState<string>("Asia/Kolkata");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let cancelled = false;
    fetch(`/api/slots?tz=${encodeURIComponent(clientTz)}`)
      .then((res) => {
        if (!res.ok) throw new Error("slots");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDays(data.days ?? []);
        setTz(data.tz ?? "Asia/Kolkata");
        setActiveDay(data.days?.[0]?.date ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const day = days.find((d) => d.date === activeDay) ?? days[0];
  const selected = days.flatMap((d) => d.slots).find((s) => s.start === value);

  if (loading) {
    return <p className="text-body-s-m text-text-muted">Finding times…</p>;
  }
  if (failed || days.length === 0) {
    return (
      <p className="text-body-s-m text-text-muted" role="status">
        The calendar is not available just now. Send us a note and the atelier will find a time
        with you.
      </p>
    );
  }

  return (
    <div>
      <p className="qh-label" id="slot-label">
        When suits you?
      </p>

      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-4"
        role="tablist"
        aria-label="Choose a day"
      >
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={d.date === day?.date}
            onClick={() => setActiveDay(d.date)}
            data-testid="slot-day"
            className={`qh-chip whitespace-nowrap ${d.date === day?.date ? "is-selected" : ""}`}
          >
            {d.date}
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-labelledby="slot-label"
      >
        {day?.slots.map((slot) => {
          const isSelected = slot.start === value;
          return (
            <button
              key={slot.start}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid="slot"
              data-slot-start={slot.start}
              onClick={() => onChange(isSelected ? null : slot.start)}
              className={`qh-btn qh-btn--secondary qh-btn--sm justify-center ${
                isSelected ? "qh-btn--primary" : ""
              }`}
            >
              <span>{slot.ist.time}</span>
              {slot.local && (
                <span className="caption-m text-text-muted ml-2">{slot.local.time} local</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="caption-m text-text-muted mt-2">
        Times shown in {tz.replace("_", " ")}
        {day?.slots[0]?.local ? ` and your own (${day.slots[0].local.tz.replace("_", " ")})` : ""}.
        Each consultation is 45 minutes.
      </p>

      {selected && (
        <p className="text-body-s-m text-text mt-3" data-testid="slot-chosen">
          {selected.ist.weekday} {selected.ist.date}, {selected.ist.time} IST
          {selected.local ? ` · ${selected.local.time} your time` : ""}
        </p>
      )}

      {error && (
        <p className="qh-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
