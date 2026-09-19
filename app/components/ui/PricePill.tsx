interface PricePillProps {
  label?: string;
  value: string;
  className?: string;
}

export function PricePill({
  label = "Indicative",
  value,
  className = "",
}: PricePillProps) {
  return (
    <span className={`qh-price ${className}`}>
      <span className="qh-price__label">{label}</span>
      <span className="qh-price__val">{value}</span>
    </span>
  );
}
