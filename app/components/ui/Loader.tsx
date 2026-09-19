/**
 * Signature loader: a gold thread drawing itself into the paisley mark.
 * Uses the .qh-loader classes from loader.css.
 */
interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Loader({ size = "md", className = "" }: LoaderProps) {
  const sizeClass =
    size === "sm" ? "qh-loader--sm" : size === "lg" ? "qh-loader--lg" : "";

  return (
    <span
      className={`qh-loader ${sizeClass} ${className}`}
      role="img"
      aria-label="Loading"
    >
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          className="qh-loader__thread"
          d="M80 140 C50 140 30 120 30 90 C30 60 55 40 80 40 C105 40 120 55 120 75 C120 95 105 110 85 110 C65 110 55 100 55 85 C55 70 65 60 80 60"
          pathLength="1"
          stroke="currentColor"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
