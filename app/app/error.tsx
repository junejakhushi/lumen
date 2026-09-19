"use client";

import Image from "next/image";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/brand/brand/empty/empty-offline.svg"
        alt=""
        width={120}
        height={120}
        className="mb-6 opacity-60"
      />
      <h1 className="font-display text-title-l-m lg:text-title-l-d text-text mb-2">
        Something went wrong on our side
      </h1>
      <p className="text-body-m-m text-text-muted mb-8 max-w-measure">
        Please try again. If it keeps happening, the atelier is a message away.
      </p>
      <button onClick={reset} className="qh-btn qh-btn--primary">
        Try again
      </button>
    </div>
  );
}
