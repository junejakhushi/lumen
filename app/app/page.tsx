export default function WelcomePage() {
  const studioName = process.env.STUDIO_NAME || "The Atelier";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="label-m text-text-muted mb-4">
        {studioName}
      </p>
      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-6">
        Wear it before it&rsquo;s made.
      </h1>
      <p className="font-ui text-body-m-m lg:text-body-m-d text-text-muted max-w-measure">
        See each piece on your own hand, shape it to your taste, then talk it
        through with the atelier.
      </p>
    </div>
  );
}
