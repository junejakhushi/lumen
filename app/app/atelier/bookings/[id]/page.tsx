"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, GoldDivider, SpecTable, useToast } from "@/components/ui";
import { formatPrice } from "@/lib/pricing";
import { STATUSES, type BookingStatus, type BookingSummary } from "@/lib/atelier/bookingTypes";

/** One consultation: looks, what was changed, the quote, notes and the brief (SPEC §5.7). */

interface LookRecord {
  pieceId?: string;
  pieceName?: string;
  config?: { metal?: string; karat?: string; wristCm?: number; ringSizeIn?: number };
  original?: { metal?: string; karat?: string; wristCm?: number; ringSizeIn?: number };
  quoteTotal?: number;
  quoteBreakdown?: Record<string, unknown>;
  snapshot_key?: string | null;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  completed: "Completed",
  "no-show": "No-show",
};

const METAL_LABELS: Record<string, string> = {
  yellow: "Yellow gold",
  white: "White gold",
  rose: "Rose gold",
  platinum: "Platinum",
};

function metalLabel(metal: string | undefined): string {
  if (!metal) return "—";
  return METAL_LABELS[metal] ?? metal;
}

function configLine(config: LookRecord["config"]): string {
  if (!config) return "—";
  const size =
    typeof config.wristCm === "number"
      ? `Wrist ${config.wristCm} cm`
      : typeof config.ringSizeIn === "number"
        ? `IN ${config.ringSizeIn}`
        : "";
  return [metalLabel(config.metal), config.karat ? `${config.karat}K` : "", size]
    .filter(Boolean)
    .join(" · ");
}

export default function BookingDetailPage() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [lookUrls, setLookUrls] = useState<(string | null)[]>([]);
  const [briefUrl, setBriefUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/atelier/bookings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not open this consultation.");
      return;
    }
    setBooking(data.booking);
    setNotes(data.booking?.notes ?? "");
    setLookUrls(data.lookUrls ?? []);
    setBriefUrl(data.briefUrl ?? null);
  }, [id]);

  useEffect(() => {
    load().catch(() => setError("Could not open this consultation."));
  }, [load]);

  const patch = useCallback(
    async (body: { status?: BookingStatus; notes?: string | null }) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/atelier/bookings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save.");
        setBooking(data.booking);
        toast("Saved.", { variant: "positive" });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not save.", { variant: "error" });
      } finally {
        setSaving(false);
      }
    },
    [id, toast]
  );

  if (error) {
    return (
      <div className="px-margin-m lg:px-margin-d py-16 max-w-content mx-auto">
        <p role="alert" className="text-body-l-m text-ruby mb-6">{error}</p>
        <Link href="/atelier" className="qh-link">Back to consultations</Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="px-margin-m lg:px-margin-d py-16 max-w-content mx-auto">
        <p className="text-body-m-m text-text-muted">Opening the consultation…</p>
      </div>
    );
  }

  const looks = (Array.isArray(booking.looks) ? booking.looks : []) as LookRecord[];
  const hero = looks[0];
  const changes: Array<{ attribute: string; original: string; requested: string }> = [];
  if (hero?.original) {
    if (hero.original.metal && hero.original.metal !== hero.config?.metal) {
      changes.push({
        attribute: "Metal",
        original: metalLabel(hero.original.metal),
        requested: metalLabel(hero.config?.metal),
      });
    }
    if (hero.original.karat && hero.original.karat !== hero.config?.karat) {
      changes.push({
        attribute: "Karat",
        original: `${hero.original.karat}K`,
        requested: `${hero.config?.karat ?? "—"}K`,
      });
    }
    if (
      typeof hero.original.wristCm === "number" &&
      hero.original.wristCm !== hero.config?.wristCm
    ) {
      changes.push({
        attribute: "Wrist size",
        original: `${hero.original.wristCm} cm`,
        requested: `${hero.config?.wristCm ?? "—"} cm`,
      });
    }
  }

  return (
    <div className="px-margin-m lg:px-margin-d py-10 lg:py-14 max-w-content mx-auto">
      <Link href="/atelier" className="caption-m text-text-muted no-underline">
        ← Consultations
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-4 mt-4 mb-2">
        <h1 className="font-display text-display-m-m lg:text-display-m-d text-text m-0">
          {booking.client?.name ?? "—"}
        </h1>
        <span className="label-s text-text-muted" data-testid="booking-status">
          {STATUS_LABEL[booking.status as BookingStatus] ?? booking.status}
        </span>
      </div>
      <p className="caption-m text-text-muted mb-4">
        {booking.ist.date.replace(/^\w{3} /, `${booking.ist.weekday} `)} · {booking.ist.time} IST ·{" "}
        {booking.visit_type === "video" ? "Video call" : "Studio visit"}
      </p>
      <GoldDivider className="w-16 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="label-m text-text-muted mb-3">Looks</h2>
          {looks.length === 0 && (
            <p className="caption-m text-text-muted">No looks were saved with this booking.</p>
          )}
          <ul className="list-none p-0 m-0 grid grid-cols-2 gap-4">
            {looks.map((look, i) => (
              <li key={`${look.pieceId}-${i}`}>
                <div className="aspect-square bg-pearl mb-2 overflow-hidden">
                  {lookUrls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lookUrls[i] as string} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center caption-m text-text-muted">
                      No snapshot
                    </div>
                  )}
                </div>
                <p className="text-body-s-m text-text m-0">{look.pieceName ?? look.pieceId}</p>
                <p className="caption-m text-text-muted m-0">{configLine(look.config)}</p>
                {typeof look.quoteTotal === "number" && (
                  <p className="caption-m text-text m-0">{formatPrice(look.quoteTotal)}</p>
                )}
              </li>
            ))}
          </ul>

          {changes.length > 0 && (
            <div className="mt-8">
              <h2 className="label-m text-text-muted mb-3">Original → requested</h2>
              <SpecTable
                rows={changes.map((c) => ({
                  label: c.attribute,
                  value: `${c.original} → ${c.requested}`,
                }))}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <h2 className="label-m text-text-muted mb-3">Client</h2>
            <SpecTable
              rows={[
                { label: "Name", value: booking.client?.name ?? "—" },
                {
                  label: "Phone",
                  value: `${booking.client?.phone ?? "—"}${
                    booking.client?.whatsapp ? " · prefers WhatsApp" : ""
                  }`,
                },
                { label: "Email", value: booking.client?.email ?? "—" },
                { label: "Booked", value: new Date(booking.created_at).toLocaleString("en-GB") },
              ]}
            />
          </div>

          <div>
            <h2 className="label-m text-text-muted mb-3">Design brief</h2>
            {briefUrl ? (
              <a href={briefUrl} className="qh-link" download data-testid="brief-link">
                Download the brief (PDF)
              </a>
            ) : (
              <p className="caption-m text-text-muted">
                No brief was stored for this consultation.
              </p>
            )}
          </div>

          <div>
            <h2 className="label-m text-text-muted mb-3">Status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={booking.status === status ? "primary" : "secondary"}
                  disabled={saving}
                  onClick={() => void patch({ status })}
                  data-testid={`status-${status}`}
                >
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
          </div>

          {typeof (booking.client as { notes?: string } | undefined)?.notes === "string" &&
            (booking.client as { notes?: string }).notes && (
              <div>
                <h2 className="label-m text-text-muted mb-3">What the client said</h2>
                <p className="text-body-s-m text-text m-0" data-testid="client-note">
                  {(booking.client as { notes?: string }).notes}
                </p>
              </div>
            )}

          <div className="qh-field">
            <label className="qh-label" htmlFor="atelier-notes">Atelier notes</label>
            <textarea
              id="atelier-notes"
              className="qh-input"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was agreed, what to prepare, what to bring out."
              data-testid="atelier-notes"
            />
            <div className="mt-2">
              <Button size="sm" disabled={saving} onClick={() => void patch({ notes })}>
                Save notes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
