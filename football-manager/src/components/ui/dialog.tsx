"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Dialog({ open, onOpenChange, title, description, children, className, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; className?: string; footer?: React.ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <D.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(640px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-line bg-surface shadow-2xl animate-fadein", className)}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <D.Title className="text-base font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">Dialog</D.Description>}
            </div>
            <D.Close className="rounded-md p-1 text-muted hover:bg-surface2 hover:text-fg" aria-label="Close">
              <X size={18} />
            </D.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
