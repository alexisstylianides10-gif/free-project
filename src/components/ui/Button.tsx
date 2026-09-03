"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "mission";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Spec §7: primary = brand background, white text, 8-10px radius, 40-44px
// height, subtle hover — no gradient, no heavy shadow. `bg-gradient-brand`
// is kept rather than swapped to `bg-accent` (functionally identical now
// that --accent-end == --accent, see globals.css) so this stays a no-op
// change for every existing call site's visual output.
const variantClasses: Record<Variant, string> = {
  primary: "bg-gradient-brand text-white shadow-subtle hover:brightness-110",
  mission: "bg-gradient-mission text-white shadow-subtle hover:brightness-110",
  // Spec §7: secondary = neutral/light background, subtle border, dark text.
  secondary: "border border-border bg-surface text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  outline: "border border-border text-foreground hover:bg-muted bg-transparent",
  danger: "bg-danger text-white hover:opacity-90",
};

// Spec §6/§7: buttons use the dedicated 8-10px `button` radius token, not a
// pill. Heights: sm stays compact (32px) for tight inline controls; md/lg
// sit inside the spec's 40-44px primary-button range (was 40/48px).
const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-label rounded-button gap-1.5",
  md: "h-10 px-4 text-sm rounded-button gap-2",
  lg: "h-11 px-6 text-body rounded-button gap-2",
  icon: "h-10 w-10 rounded-button justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
