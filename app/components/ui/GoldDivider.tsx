interface GoldDividerProps {
  variant?: "plain" | "bead";
  className?: string;
}

export function GoldDivider({ variant = "plain", className = "" }: GoldDividerProps) {
  return (
    <hr
      className={`gold-divider ${variant === "bead" ? "gold-divider--bead" : ""} ${className}`}
      aria-hidden="true"
    />
  );
}
