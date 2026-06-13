import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  icon?: LucideIcon;
  inputClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, id, inputClassName, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full h-10 px-3 text-sm text-slate-900 bg-white border rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400",
              Icon ? "pl-10" : "pl-3",
              error
                ? "border-danger-400 focus:ring-danger-400 focus:border-danger-400"
                : "border-slate-300 hover:border-slate-400",
              "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
              inputClassName
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
