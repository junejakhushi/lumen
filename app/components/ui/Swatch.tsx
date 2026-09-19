"use client";

interface SwatchProps {
  color: string;
  name?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Swatch({
  color,
  name,
  selected = false,
  disabled = false,
  onClick,
  className = "",
}: SwatchProps) {
  return (
    <button
      type="button"
      className={`qh-swatch ${className}`}
      aria-pressed={selected}
      aria-label={name || color}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="qh-swatch__disc" style={{ backgroundColor: color }} />
      {name && <span className="qh-swatch__name">{name}</span>}
    </button>
  );
}
