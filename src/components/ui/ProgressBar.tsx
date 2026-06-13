import * as React from "react";
import { cn } from "../../lib/utils";

export type ProgressBarColor =
  | "primary"
  | "accent"
  | "success"
  | "danger";

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: React.ReactNode;
  color?: ProgressBarColor;
  showPercentage?: boolean;
}

const colorStyles: Record<ProgressBarColor, string> = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  success: "bg-success-500",
  danger: "bg-danger-500",
};

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      label,
      color = "primary",
      showPercentage,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {(label || showPercentage) && (
          <div className="flex items-center justify-between mb-1.5">
            {label && (
              <span className="text-sm font-medium text-slate-700">{label}</span>
            )}
            {showPercentage && (
              <span className="text-sm text-slate-500 tabular-nums">
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              colorStyles[color]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";
