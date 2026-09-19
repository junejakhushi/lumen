"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  count?: number;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected = false, count, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`qh-chip ${className}`}
        aria-pressed={selected}
        {...props}
      >
        {children}
        {count !== undefined && (
          <span className="qh-chip__count">{count}</span>
        )}
      </button>
    );
  }
);
Chip.displayName = "Chip";
