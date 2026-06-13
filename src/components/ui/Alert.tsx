import * as React from "react";
import { cn } from "../../lib/utils";
import { AlertCircle, CheckCircle2, TriangleAlert, Info, X, type LucideIcon } from "lucide-react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  icon?: LucideIcon;
  title?: React.ReactNode;
  message?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

const variantStyles: Record<
  AlertVariant,
  { bg: string; border: string; text: string; title: string; icon: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    bg: "bg-primary-50",
    border: "border-primary-200",
    text: "text-primary-700",
    title: "text-primary-800",
    icon: "text-primary-500",
    Icon: Info,
  },
  success: {
    bg: "bg-success-50",
    border: "border-success-200",
    text: "text-success-700",
    title: "text-success-800",
    icon: "text-success-500",
    Icon: CheckCircle2,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    title: "text-amber-800",
    icon: "text-amber-500",
    Icon: TriangleAlert,
  },
  danger: {
    bg: "bg-danger-50",
    border: "border-danger-200",
    text: "text-danger-700",
    title: "text-danger-800",
    icon: "text-danger-500",
    Icon: AlertCircle,
  },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = "info", icon, title, message, closable, onClose, children, ...props },
    ref
  ) => {
    const [visible, setVisible] = React.useState(true);
    const style = variantStyles[variant];
    const IconComponent = icon || style.Icon;

    if (!visible) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 px-4 py-3 rounded-md border",
          style.bg,
          style.border,
          className
        )}
        {...props}
      >
        <IconComponent className={cn("w-5 h-5 flex-shrink-0 mt-0.5", style.icon)} />
        <div className="flex-1 min-w-0">
          {title && (
            <div className={cn("text-sm font-semibold mb-0.5", style.title)}>
              {title}
            </div>
          )}
          {message && (
            <div className={cn("text-sm", style.text)}>{message}</div>
          )}
          {children}
        </div>
        {closable && (
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onClose?.();
            }}
            className={cn(
              "p-0.5 flex-shrink-0 rounded transition-colors",
              "hover:bg-white/50",
              style.icon
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";
