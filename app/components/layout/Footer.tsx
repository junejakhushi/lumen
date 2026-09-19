import Image from "next/image";

export function Footer() {
  const studioName = process.env.STUDIO_NAME || "The Atelier";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline-quiet py-8 px-6 lg:px-margin-d text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-text-muted">
          <span className="label-s">Lumen</span>
          <span className="text-hairline-quiet">&middot;</span>
          <span className="text-body-s-m font-ui">for {studioName}</span>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Image
            src="/brand/brand/motifs/seal-hallmark.svg"
            alt=""
            width={20}
            height={20}
          />
          <span className="label-s">Hallmarked &amp; certified</span>
        </div>
        <p className="caption-m text-text-muted max-w-measure">
          &copy; {year} {studioName}. Designs, images and 3D models are for
          private viewing only. Indicative prices include GST and may change with
          the gold rate.
        </p>
      </div>
    </footer>
  );
}
