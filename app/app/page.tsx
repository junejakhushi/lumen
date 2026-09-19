import Link from "next/link";
import Image from "next/image";

export default function WelcomePage() {
  const studioName = process.env.STUDIO_NAME || "The Atelier";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-margin-m lg:px-margin-d text-center">
      {/* Arch frame */}
      <div className="relative mb-10">
        <Image
          src="/brand/brand/motifs/frame-arch.svg"
          alt=""
          width={220}
          height={280}
          className="opacity-20"
          priority
        />
        <Image
          src="/brand/brand/monogram.svg"
          alt=""
          width={40}
          height={40}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
        />
      </div>

      <p className="label-l text-text-muted mb-4 tracking-[0.2em]">
        {studioName}
      </p>

      {/* Gold bead divider */}
      <div className="w-24 mb-6">
        <hr className="gold-divider" aria-hidden="true" />
      </div>

      <h1 className="font-display text-display-l-m lg:text-display-xl-d text-text mb-5 max-w-[12em]">
        Wear it before it&rsquo;s made.
      </h1>

      <p className="font-ui text-body-l-m lg:text-body-l-d text-text-muted max-w-measure mb-12">
        See each piece on your own hand, shape it to your taste, then talk it
        through with the atelier.
      </p>

      <div
        className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
        role="group"
        aria-label="Choose where to begin"
      >
        <Link href="/collection" className="qh-btn qh-btn--primary flex-1 no-underline">
          Explore the collection
        </Link>
        <Link href="/collection" className="qh-btn qh-btn--secondary flex-1 no-underline">
          Start trying on
        </Link>
      </div>

      <div className="mt-10 flex items-center gap-2">
        <Image
          src="/brand/brand/icons/eye-off.svg"
          alt=""
          width={16}
          height={16}
          className="opacity-40"
        />
        <p className="caption-m text-text-muted">
          Uses your camera. Nothing leaves this device.
        </p>
      </div>
    </div>
  );
}
