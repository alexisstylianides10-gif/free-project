import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * New in this pass — there was no shared `<Input>` primitive before; every
 * form across the app (login, signup, onboarding, notes, homework, exam
 * dates, profile, ~19 files grepped) hand-rolls its own `<input>` with an
 * inline-duplicated class string. This is a pure foundation piece: styled
 * to spec (§7 input radius 8-10px via the `input` token, subtle border,
 * accent focus ring) and NOT wired into any existing page in this pass —
 * doing so is exactly the "mechanical, page-by-page" work this pass's
 * instructions reserve for Phase 2. Swapping a page's inline `<input
 * className="...">` for `<Input />` is a zero-risk, zero-visual-diff-if-
 * done-right change Phase 2 can make file by file.
 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-input border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground",
        "focus:border-accent/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-input border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground",
        "focus:border-accent/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
