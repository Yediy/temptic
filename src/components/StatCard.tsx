import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "accent" | "success" | "destructive" | "warning";
}

const variantStyles = {
  default: "border-border bg-card",
  accent: "border-accent/30 bg-accent/5",
  success: "border-success/30 bg-success/5",
  destructive: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/30 bg-warning/5",
};

const iconVariantStyles = {
  default: "bg-secondary text-foreground",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, icon: Icon, trend, variant = "default" }, ref) => {
    return (
      <div ref={ref} className={cn("rounded-xl border p-5 transition-all animate-fade-in", variantStyles[variant])}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
            {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconVariantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  }
);
StatCard.displayName = "StatCard";
