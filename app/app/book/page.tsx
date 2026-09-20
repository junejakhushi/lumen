"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLooks, type SavedLook } from "@/lib/lookBoard";
import { Button, Field, ConsentRow, Segmented } from "@/components/ui";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { blobToDataUrl } from "@/lib/lookBoard";
import { useToast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/pricing";

const VISIT_TYPES = [
  { value: "in-studio" as const, label: "In-studio" },
  { value: "video" as const, label: "Video call" },
];

const OCCASION_OPTIONS = [
  "A wedding", "My own wedding", "A festival", "An anniversary",
  "A gift", "Everyday wear", "Something else",
];

const BUDGET_OPTIONS = [
  "Under $1,000", "$1,000–2,500", "$2,500–5,000", "$5,000–10,000", "Above $10,000",
  "I'd rather discuss it",
];

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><p className="text-body-m-m text-text-muted">Loading…</p></div>}>
      <BookForm />
    </Suspense>
  );
}

function BookForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lookIds = searchParams.get("looks")?.split(",").filter(Boolean) ?? [];

  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [visitType, setVisitType] = useState<string>("in-studio");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [budget, setBudget] = useState("");
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [consentBrief, setConsentBrief] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Load selected looks
  useEffect(() => {
    getLooks().then((all) => {
      if (lookIds.length > 0) {
        setLooks(all.filter((l) => lookIds.includes(l.id)));
      } else {
        setLooks(all);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Tell us your name.";
    if (!phone.trim()) e.phone = "Add a phone number so the atelier can reach you.";
    else if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s\-()]/g, "")))
      e.phone = "That number doesn't look complete. Include the country code, e.g. +91.";
    if (!email.trim()) e.email = "Add your email for the confirmation.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "That email doesn't look quite right.";
    if (!occasion) e.occasion = "Choose an occasion.";
    if (!budget) e.budget = "Choose a range.";
    if (!slotStart) e.slot = "Choose a time that suits you.";
    if (!consentBrief) e.consent = "We need your agreement to share the brief with the atelier.";
    if (looks.length === 0) e.looks = "Your look board is empty. Save at least one piece to book.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, phone, email, occasion, budget, consentBrief, looks, slotStart]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Emit book_start event
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "book_start" }),
      }).catch(() => {});

      // Snapshots have lived in IndexedDB until now; booking is the moment they travel.
      const looksPayload = await Promise.all(
        looks.map(async (l) => ({
          pieceId: l.pieceId,
          pieceName: l.pieceName,
          pieceType: l.pieceType,
          config: l.config,
          weightG: l.weightG,
          quoteTotal: l.quote?.total,
          quoteBreakdown: (l.quote?.breakdown ?? undefined) as Record<string, unknown> | undefined,
          snapshot: await blobToDataUrl(l.snapshot),
        }))
      );

      const payload = {
        slot_start: slotStart,
        visit_type: visitType,
        client: { name, phone, whatsapp, email },
        occasion: occasion || null,
        needed_by: neededBy || null,
        budget: budget || null,
        notes: notes || null,
        consent: consentBrief,
        client_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        looks: looksPayload,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "book_submit", payload: { booking_id: data.id } }),
        }).catch(() => {});

        router.push(`/book/done?ref=${encodeURIComponent(data.briefNo ?? "")}`);
        return;
      }

      if (res.status === 409) {
        // Someone else took the slot while this form was open.
        setErrors({ slot: data.error ?? "That time has just been taken." });
        setSlotStart(null);
        toast(data.error ?? "That time has just been taken. Please choose another.", {
          variant: "error",
        });
        return;
      }

      toast(data.error ?? "The atelier could not take that booking. Please try again.", {
        variant: "error",
      });
    } catch {
      toast("Your request didn't reach the atelier. Try again in a moment.", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    validate,
    visitType,
    name,
    phone,
    whatsapp,
    email,
    occasion,
    neededBy,
    budget,
    notes,
    looks,
    slotStart,
    consentBrief,
    router,
    toast,
  ]);

  const studioName = "The Atelier";

  return (
    <div className="px-6 lg:px-margin-d py-12 max-w-content mx-auto">
      <div className="max-w-lg mx-auto">
        <h1 className="font-display text-display-l-m lg:text-display-m-d text-text mb-2">
          Book a consultation
        </h1>
        <p className="text-body-m-m text-text-muted mb-10 max-w-measure">
          An unhurried conversation with the atelier about the pieces on your
          look board.
        </p>

        {/* Selected looks preview */}
        {looks.length > 0 && (
          <div className="mb-10">
            <p className="label-m text-text-muted mb-3">
              Your pieces ({looks.length})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {looks.map((look) => (
                <LookThumb key={look.id} look={look} />
              ))}
            </div>
          </div>
        )}

        {/* Visit type */}
        <div className="mb-8">
          <Segmented
            label="How would you like to meet?"
            options={VISIT_TYPES.map((v) => ({ value: v.value, label: v.label }))}
            value={visitType}
            onChange={setVisitType}
          />
          <p className="caption-m text-text-muted mt-2">
            {visitType === "in-studio"
              ? `At the atelier. About 60 minutes, with the pieces in hand.`
              : `From wherever you are. About 45 minutes; we'll send a private link.`}
          </p>
        </div>

        {/* When */}
        <div className="mb-8">
          <SlotPicker value={slotStart} onChange={setSlotStart} error={errors.slot} />
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-5 mb-8">
          <Field
            label="Name"
            placeholder="As you'd like us to address you"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <div>
            <Field
              label="Phone"
              type="tel"
              placeholder="+91 "
              hint="With country code. We'll only use it about this consultation."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-body-s-m">
              <input
                type="checkbox"
                checked={whatsapp}
                onChange={() => setWhatsapp(!whatsapp)}
                className="w-4 h-4"
              />
              I prefer WhatsApp
            </label>
          </div>
          <Field
            label="Email"
            type="email"
            placeholder="you@example.com"
            hint="Your confirmation and design brief go here."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
        </div>

        {/* Occasion */}
        <div className="mb-8">
          <label className="qh-label block mb-2">Occasion</label>
          <div className="flex flex-wrap gap-2">
            {OCCASION_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                className={`qh-chip ${occasion === o ? "" : ""}`}
                aria-pressed={occasion === o}
                onClick={() => setOccasion(o)}
              >
                {o}
              </button>
            ))}
          </div>
          {errors.occasion && (
            <p className="qh-field__error mt-2">{errors.occasion}</p>
          )}
        </div>

        {/* Needed by */}
        <div className="mb-8">
          <Field
            label="Needed by"
            type="date"
            hint="Most pieces take 4 to 6 weeks to make."
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
          />
        </div>

        {/* Budget */}
        <div className="mb-8">
          <label className="qh-label block mb-2">Budget range</label>
          <p className="qh-field__hint mb-3">
            A range helps the atelier suggest what fits. It stays private.
          </p>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                className="qh-chip"
                aria-pressed={budget === b}
                onClick={() => setBudget(b)}
              >
                {b}
              </button>
            ))}
          </div>
          {errors.budget && (
            <p className="qh-field__error mt-2">{errors.budget}</p>
          )}
        </div>

        {/* Consent */}
        <div className="mb-8 flex flex-col gap-3">
          <div className="qh-field mb-2">
            <label className="qh-label" htmlFor="booking-notes">
              Anything the atelier should know
            </label>
            <textarea
              id="booking-notes"
              className="qh-input"
              rows={3}
              maxLength={1200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How you'd like it to sit, when you'll wear it, anything you keep coming back to."
              data-testid="booking-notes"
            />
          </div>
          <ConsentRow
            label="Share my look board and changes with the atelier as a design brief."
            required
            checked={consentBrief}
            onChange={() => setConsentBrief(!consentBrief)}
            error={!!errors.consent}
          />
          <ConsentRow
            label="The atelier may contact me about this consultation."
            checked={consentContact}
            onChange={() => setConsentContact(!consentContact)}
          />
          {errors.consent && (
            <p className="qh-field__error">{errors.consent}</p>
          )}
          <p className="caption-m text-text-muted">
            Your details are shared only with {studioName}. Try-on images never
            leave your device.
          </p>
        </div>

        {errors.looks && (
          <p className="qh-field__error mb-4">{errors.looks}</p>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          block
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Sending your brief\u2026" : "Request this consultation"}
        </Button>
      </div>
    </div>
  );
}

function LookThumb({ look }: { look: SavedLook }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (look.snapshot) {
      const u = URL.createObjectURL(look.snapshot);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [look.snapshot]);

  return (
    <div className="flex-none w-20">
      <div className="w-20 h-24 bg-pearl rounded-sm overflow-hidden">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={look.pieceName} className="w-full h-full object-cover" />
        )}
      </div>
      <p className="caption-m text-text-muted mt-1 truncate">{look.pieceName}</p>
      {look.quote && (
        <p className="caption-m text-text">{formatPrice(look.quote.total)}</p>
      )}
    </div>
  );
}
