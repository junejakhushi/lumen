import Image from "next/image";

export function Footer() {
  const studioName = process.env.STUDIO_NAME || "The Atelier";
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 px-margin-m lg:px-margin-d text-center">
      {/* Gold divider */}
      <hr className="gold-divider max-w-content mx-auto mb-10" aria-hidden="true" />

      <div className="flex flex-col items-center gap-4">
        {/* Monogram */}
        <Image
          src="/brand/brand/monogram.svg"
          alt=""
          width={24}
          height={24}
          className="opacity-40"
        />

        <div className="flex items-center gap-2 text-text-muted">
          <span className="label-s tracking-[0.2em]">Lumen</span>
          <span className="text-hairline-quiet">&middot;</span>
          <span className="text-body-s-m font-ui">for {studioName}</span>
        </div>

        <div className="flex items-center gap-2 text-text-muted">
          <Image
            src="/brand/brand/motifs/seal-hallmark.svg"
            alt="Hallmarked and certified"
            width={18}
            height={18}
          />
          <span className="label-s">Hallmarked &amp; certified</span>
        </div>

        <p className="caption-m text-text-muted max-w-measure mt-2">
          &copy; {year} {studioName}. Designs, images and 3D models are for
          private viewing only. Indicative prices include estimated sales tax and may change
          with the gold rate.
        </p>
      </div>
    </footer>
  );
}
