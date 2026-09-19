"use client";

interface StepperProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue?: (v: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue,
  onChange,
  disabled = false,
  className = "",
}: StepperProps) {
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <div
      className={`qh-stepper ${disabled ? "qh-stepper--disabled" : ""} ${className}`}
    >
      {label && <span className="qh-label">{label}</span>}
      <div className="qh-stepper__row">
        <button
          type="button"
          className="qh-stepper__btn"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label="Decrease"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
            <line x1="5" y1="10" x2="15" y2="10" />
          </svg>
        </button>
        <span className="qh-stepper__val" aria-live="polite">
          {display}
        </span>
        <button
          type="button"
          className="qh-stepper__btn"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label="Increase"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
            <line x1="5" y1="10" x2="15" y2="10" />
            <line x1="10" y1="5" x2="10" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
