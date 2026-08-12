import { Calendar, CheckSquare, BrainCircuit, Mail, Wallet, Plane, ShoppingCart, FileSearch, Search, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface AgentCatalogRow {
  id: string;
  name: string;
  description: string;
  status: "active" | "coming_soon";
  icon: LucideIcon;
  tools: string[];
}

const catalog: AgentCatalogRow[] = [
  { id: "calendar", name: "Calendar", description: "Creates, moves, and cancels events on your calendar — every change confirmed first.", status: "active", icon: Calendar, tools: ["calendar_search", "calendar_create", "calendar_update", "calendar_delete"] },
  { id: "tasks", name: "Tasks", description: "Adds, prioritizes, and completes tasks from natural language.", status: "active", icon: CheckSquare, tools: ["tasks_search", "tasks_create", "tasks_update", "tasks_complete", "tasks_delete"] },
  { id: "memory", name: "Memory", description: "Remembers facts, preferences, and dates you explicitly ask it to keep.", status: "active", icon: BrainCircuit, tools: ["memory_list", "memory_create", "memory_delete"] },
  { id: "email", name: "Email", description: "Read, summarize, draft, and organize your inbox. Sending always requires confirmation.", status: "coming_soon", icon: Mail, tools: [] },
  { id: "finance", name: "Finance", description: "Expense tracking, budgets, and subscription tracking. Never executes payments.", status: "coming_soon", icon: Wallet, tools: [] },
  { id: "travel", name: "Travel", description: "Coordinates flights, hotels, and itineraries around your calendar. Bookings always confirmed.", status: "coming_soon", icon: Plane, tools: [] },
  { id: "shopping", name: "Shopping", description: "Finds products and manages shopping lists. Purchases always confirmed.", status: "coming_soon", icon: ShoppingCart, tools: [] },
  { id: "documents", name: "Documents", description: "Extracts deadlines and key details from PDFs and connects them to tasks and events.", status: "coming_soon", icon: FileSearch, tools: [] },
  { id: "research", name: "Research", description: "Researches topics and returns sourced answers, clearly separating your data from general knowledge.", status: "coming_soon", icon: Search, tools: [] },
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Agents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The Head Agent routes your requests to the right specialist. More agents are coming.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((agent) => (
          <Card key={agent.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <agent.icon className="h-[18px] w-[18px]" />
                </div>
                <Badge tone={agent.status === "active" ? "success" : "neutral"}>{agent.status === "active" ? "Active" : "Coming soon"}</Badge>
              </div>
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">{agent.name}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{agent.description}</p>
              </div>
              {agent.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {agent.tools.map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-mono text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
