import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "ghost";
  onClick: () => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClear,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-auto",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3",
          "bg-zinc-900 text-white",
          "border-t border-zinc-700",
          "md:rounded-2xl md:border md:border-zinc-700 md:shadow-2xl md:px-5",
          "animate-in slide-in-from-bottom-4 duration-200",
        )}
      >
        <span className="text-sm font-semibold shrink-0 mr-1">
          {selectedCount} selected
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant={action.variant ?? "outline"}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "h-9 px-3 text-sm gap-1.5 font-medium",
                action.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 border-red-600 text-white"
                  : "bg-transparent border-zinc-600 text-white hover:bg-zinc-800 hover:text-white",
              )}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
          className="ml-1 h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
