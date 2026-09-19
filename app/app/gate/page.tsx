"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function GatePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Enter your access code to continue.");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });

        const data = await res.json();

        if (res.ok) {
          router.push("/");
          router.refresh();
        } else {
          setError(data.error || "That code doesn't match an invitation.");
        }
      } catch {
        setError("We couldn't reach the atelier. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="qh-gate min-h-screen flex flex-col items-center justify-center px-margin-m lg:px-margin-d">
      <div className="qh-gate__atelier mb-6">
        <Image src="/brand/brand/monogram.svg" alt="" width={28} height={28} />
      </div>
      <div className="qh-gate__rule mb-8">
        <Image src="/brand/brand/motifs/mark-paisley-48.svg" alt="" width={16} height={16} />
      </div>
      <div className="qh-gate__main w-full max-w-sm">
        <p className="qh-gate__accent mb-3">
          स्वागत <span>welcome</span>
        </p>
        <h1 className="qh-gate__title mb-2">A private viewing</h1>
        <p className="qh-gate__lead">
          Enter the code from your invitation to see the collection.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="qh-field">
            <label className="qh-label" htmlFor="gate-code">
              Access code
            </label>
            <div className="qh-field__control">
              <input
                id="gate-code"
                type="text"
                className={`qh-input qh-gate__code ${error ? 'border-status-error' : ''}`}
                placeholder="e.g. RAAG42"
                autoComplete="off"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "gate-error" : undefined}
              />
            </div>
            <p className="qh-field__hint">
              Six letters and numbers, as written in your invitation. Not
              case-sensitive.
            </p>
            {error && (
              <p id="gate-error" className="qh-field__error" role="alert">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="qh-btn qh-btn--primary qh-btn--block"
          >
            {isPending ? "Checking\u2026" : "Enter"}
          </button>
        </form>

        <div className="qh-gate__foot mt-8">
          <p className="qh-gate__tag">
            &ldquo;Wear it before it&rsquo;s made.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
