import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlertCard({ message, severity }: { message: string; severity: "warning" | "critical" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3",
        severity === "critical" ? "border-danger/25 bg-danger-soft text-danger" : "border-warning/25 bg-warning-soft text-warning"
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-[13px] leading-relaxed">{message}</p>
    </div>
  );
}
