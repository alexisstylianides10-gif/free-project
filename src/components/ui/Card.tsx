import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "glass" | "flat";

// Default ("glass") is unchanged from before this prop existed — every
// existing call site (38 files, mostly the authenticated /app product) keeps
// its exact current look. "flat" is opt-in only, used by the marketing
// landing sections (src/components/marketing/*) where the de-vibe-coding
// pass swapped the translucent-blur + multi-layer shadow-card recipe for a
// plain bordered surface + single-layer shadow-subtle — the "1-2 restrained
// card styles" language a polished reference site uses, instead of every
// static content card reading as an elevated glass panel. Scoped to a prop
// rather than a global token change so the authenticated app (which this
// pass explicitly does not touch/screenshot) keeps its exact current look.
const VARIANT_CLASSES: Record<CardVariant, string> = {
  glass: "glass shadow-card",
  flat: "border border-border bg-surface shadow-subtle",
};

export function Card({
  className,
  variant = "glass",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "rounded-2xl transition-shadow duration-200",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-3 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-body font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
