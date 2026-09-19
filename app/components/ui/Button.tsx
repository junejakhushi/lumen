import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  size?: "default" | "sm";
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", block, className = "", ...props }, ref) => {
    const classes = [
      "qh-btn",
      variant === "primary" && "qh-btn--primary",
      variant === "secondary" && "qh-btn--secondary",
      variant === "quiet" && "qh-btn--quiet",
      size === "sm" && "qh-btn--sm",
      block && "qh-btn--block",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";
