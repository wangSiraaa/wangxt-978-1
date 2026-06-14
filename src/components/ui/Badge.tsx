import * as React from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "slate"
  | "warning"
  | "info";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary-100 text-primary-700 border-primary-200",
  accent: "bg-accent-100 text-accent-700 border-accent-300",
  success: "bg-success-100 text-success-700 border-success-200",
  danger: "bg-danger-100 text-danger-700 border-danger-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-sky-100 text-sky-700 border-sky-200",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium rounded border",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
