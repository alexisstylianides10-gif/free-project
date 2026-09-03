import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * New in this pass — see the note in Input.tsx; same reasoning applies.
 * Native <select> wrapped with the app's icon library (lucide-react) for
 * the affordance chevron rather than relying on the browser's default
 * arrow, so it's visually consistent with every other icon in the app.
 * Not wired into any existing page in this pass.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-input border border-border bg-surface px-3.5 pr-10 text-sm text-foreground outline-none transition-colors",
          "focus:border-accent/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
);
Select.displayName = "Select";
