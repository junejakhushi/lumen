import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/brand/brand/empty/error-404.svg"
        alt=""
        width={160}
        height={160}
        className="mb-6 opacity-60"
      />
      <h1 className="font-display text-title-l-m lg:text-title-l-d text-text mb-2">
        This piece has wandered off the tray.
      </h1>
      <p className="text-body-m-m text-text-muted mb-8 max-w-measure">
        It may have been moved or retired. The rest of the collection is where
        you left it.
      </p>
      <Link href="/collection" className="qh-btn qh-btn--primary no-underline">
        Back to the collection
      </Link>
    </div>
  );
}
