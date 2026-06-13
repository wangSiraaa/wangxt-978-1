import * as React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "outline"
  | "ghost"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm",
  accent:
    "bg-accent-500 text-primary-900 hover:bg-accent-600 active:bg-accent-700 shadow-sm",
  success:
    "bg-success-500 text-white hover:bg-success-600 active:bg-success-700 shadow-sm",
  danger:
    "bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm",
  outline:
    "bg-transparent text-primary-500 border border-primary-300 hover:bg-primary-50 active:bg-primary-100",
  ghost:
    "bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100",
  link:
    "bg-transparent text-primary-600 hover:text-primary-700 hover:underline p-0 h-auto",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      disabled,
      loading,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
