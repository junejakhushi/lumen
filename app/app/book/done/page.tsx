import Link from "next/link";
import Image from "next/image";

export default function BookDonePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/brand/brand/illus/success-booked.svg"
        alt=""
        width={160}
        height={160}
        className="mb-8"
      />
      <h1 className="font-display text-display-m-m lg:text-display-m-d text-text mb-4">
        Your consultation is booked.
      </h1>
      <p className="text-body-m-m text-text-muted mb-2 max-w-measure">
        Your design brief is on its way to the atelier.
      </p>
      <p className="text-body-s-m text-text-muted mb-10 max-w-measure">
        The atelier reads your brief and prepares your pieces, usually within a
        day. The day before, we&rsquo;ll send a reminder with everything you
        need.
      </p>
      <Link href="/collection" className="qh-btn qh-btn--secondary no-underline">
        Back to the collection
      </Link>
    </div>
  );
}
