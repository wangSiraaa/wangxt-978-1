import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "outline" | "ghost";
}

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: EmptyStateAction;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "warning" | "info" | "danger" | "success";
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { className, icon: Icon = Inbox, title, description, action, size = "md", ...props },
    ref
  ) => {
    const sizeStyles = {
      sm: {
        container: "py-6 px-4",
        iconWrap: "w-10 h-10 mb-3",
        icon: "w-5 h-5",
        title: "text-sm",
        description: "text-xs mb-3",
      },
      md: {
        container: "py-12 px-6",
        iconWrap: "w-16 h-16 mb-4",
        icon: "w-8 h-8",
        title: "text-base",
        description: "text-sm mb-5",
      },
      lg: {
        container: "py-16 px-8",
        iconWrap: "w-20 h-20 mb-5",
        icon: "w-10 h-10",
        title: "text-lg",
        description: "text-base mb-6",
      },
    }[size];

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          sizeStyles.container,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "rounded-full bg-slate-100 flex items-center justify-center",
            sizeStyles.iconWrap
          )}
        >
          <Icon className={cn("text-slate-400", sizeStyles.icon)} />
        </div>
        <h3 className={cn("font-semibold text-slate-800 mb-1", sizeStyles.title)}>{title}</h3>
        {description && (
          <p className={cn("text-slate-500 max-w-sm", sizeStyles.description)}>{description}</p>
        )}
        {action && (
          <Button
            variant={action.variant || "primary"}
            onClick={action.onClick}
            size={size === "sm" ? "sm" : size === "lg" ? "lg" : "sm"}
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
