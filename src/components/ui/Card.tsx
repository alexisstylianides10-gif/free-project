import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "glass" | "flat";

// Glassmorphism RETIRED (spec §12: "do not use glassmorphism everywhere ...
// only when they have a clear UX purpose") — no call site in the app passes
// variant="glass" explicitly (grepped: zero matches), every one of the ~38
// existing <Card> usages just relies on the default, so this pass changes
// what that default renders rather than requiring any page edit. "glass" is
// kept in the type/map only so nothing breaks if some call site somewhere
// does pass it explicitly; both variants now produce the identical spec-
// compliant flat treatment: 12-16px radius (the new `card` token), a
// subtle 1px border, minimal/no shadow, no blur, no translucency.
const VARIANT_CLASSES: Record<CardVariant, string> = {
  glass: "border border-border bg-surface shadow-card",
  flat: "border border-border bg-surface shadow-card",
};

export function Card({
  className,
  variant = "flat",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn("rounded-card transition-shadow duration-200", VARIANT_CLASSES[variant], className)}
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
