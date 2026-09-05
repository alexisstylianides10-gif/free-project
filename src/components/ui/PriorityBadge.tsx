import { Priority } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const config: Record<Priority, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  high: { label: "High priority", tone: "danger" },
  medium: { label: "Medium priority", tone: "warning" },
  low: { label: "Low priority", tone: "neutral" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, tone } = config[priority];
  return <Badge tone={tone}>{label}</Badge>;
}
