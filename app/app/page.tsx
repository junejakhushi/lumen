import Link from "next/link";
import Image from "next/image";

export default function WelcomePage() {
  const studioName = process.env.STUDIO_NAME || "The Atelier";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      {/* Arch frame */}
      <Image
        src="/brand/brand/motifs/frame-arch.svg"
        alt=""
        width={200}
        height={260}
        className="mb-8 opacity-30"
        priority
      />

      <p className="label-m text-text-muted mb-3">{studioName}</p>

      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-4 max-w-[12em]">
        Wear it before it&rsquo;s made.
      </h1>

      <p className="font-ui text-body-m-m lg:text-body-m-d text-text-muted max-w-measure mb-12">
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

      <div className="mt-8 flex items-center gap-2">
        <Image
          src="/brand/brand/icons/eye-off.svg"
          alt=""
          width={16}
          height={16}
          className="opacity-50"
        />
        <p className="caption-m text-text-muted">
          Uses your camera. Nothing leaves this device.
        </p>
      </div>
    </div>
  );
}
