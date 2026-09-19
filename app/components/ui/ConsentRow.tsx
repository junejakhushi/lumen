"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface ConsentRowProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  required?: boolean;
  error?: boolean;
}

export const ConsentRow = forwardRef<HTMLInputElement, ConsentRowProps>(
  ({ label, required, error, className = "", ...props }, ref) => {
    return (
      <label
        className={`qh-check ${error ? "qh-check--invalid" : ""} ${props.disabled ? "qh-check--disabled" : ""} ${className}`}
      >
        <input ref={ref} type="checkbox" {...props} />
        <span className="qh-check__box">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5 7 5.5 10 11.5 4" />
          </svg>
        </span>
        <span>
          {label}
          {required && <span className="qh-check__req"> *</span>}
        </span>
      </label>
    );
  }
);
ConsentRow.displayName = "ConsentRow";
