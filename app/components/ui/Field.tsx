import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, trailing, className = "", id, ...props }, ref) => {
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className={`qh-field ${className}`}>
        <label className="qh-label" htmlFor={fieldId}>
          {label}
        </label>
        <div className="qh-field__control">
          <input
            ref={ref}
            id={fieldId}
            className="qh-input"
            aria-invalid={!!error}
            aria-describedby={
              error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
            }
            {...props}
          />
          {trailing}
        </div>
        {hint && !error && (
          <p id={`${fieldId}-hint`} className="qh-field__hint">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${fieldId}-error`} className="qh-field__error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Field.displayName = "Field";
