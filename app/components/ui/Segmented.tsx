"use client";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  dotColor?: string;
}

interface SegmentedProps<T extends string> {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: SegmentedProps<T>) {
  return (
    <div className={`qh-seg ${className}`} role="radiogroup" aria-label={label}>
      {label && <span className="qh-label">{label}</span>}
      <div className="qh-seg__track">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            className="qh-seg__opt"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.dotColor && (
              <span
                className="qh-seg__dot"
                style={{ backgroundColor: opt.dotColor }}
              />
            )}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
