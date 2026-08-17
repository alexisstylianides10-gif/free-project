import { Calendar, CheckSquare, BrainCircuit, Mail, Wallet, Plane, ShoppingCart, FileSearch, Search, Target, Briefcase, GraduationCap, Timer, Repeat, BarChart3, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/FadeIn";

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
  { id: "tasks", name: "Tasks", description: "Adds, prioritizes, completes, and breaks big tasks into steps from natural language.", status: "active", icon: CheckSquare, tools: ["tasks_search", "tasks_create", "tasks_update", "tasks_complete", "tasks_delete", "tasks_break_down"] },
  { id: "goals", name: "Goals", description: "Sets goals, works out real milestones, and tracks progress.", status: "active", icon: Target, tools: ["goals_search", "goals_create", "goals_update_progress", "goals_complete_milestone", "goals_delete"] },
  { id: "documents", name: "Documents", description: "Reads uploaded files, answers questions about them, and extracts real deadlines and tasks.", status: "active", icon: FileSearch, tools: ["documents_search", "documents_read", "documents_ask", "documents_find_dates", "documents_find_tasks", "documents_add_dates_to_calendar", "documents_create_tasks"] },
  { id: "shopping", name: "Shopping", description: "Manages shopping lists and items from natural language.", status: "active", icon: ShoppingCart, tools: ["shopping_search", "shopping_add_item", "shopping_complete_item", "shopping_remove_item"] },
  { id: "memory", name: "Memory", description: "Remembers facts, preferences, and dates you explicitly ask it to keep.", status: "active", icon: BrainCircuit, tools: ["memory_list", "memory_create", "memory_delete"] },
  { id: "business", name: "Business Builder", description: "Takes a business idea from strategy through launch — missions, competitor research, financials, weekly reviews.", status: "active", icon: Briefcase, tools: ["business_search", "business_get_next_action", "business_analyze_metrics", "business_bootstrap", "business_schedule_block"] },
  { id: "study", name: "Study Mode", description: "Generates flashcards, quizzes, and full exam study plans from your own material. Student plan.", status: "active", icon: GraduationCap, tools: ["study_generate_flashcards", "study_generate_quiz", "study_find_free_time", "study_plan_create"] },
  { id: "focus", name: "Focus", description: "Starts and completes distraction-free focus sessions, optionally linked to a task.", status: "active", icon: Timer, tools: ["focus_start", "focus_complete"] },
  { id: "routines", name: "Routines", description: "Builds daily/weekly routines and tracks today's steps.", status: "active", icon: Repeat, tools: ["routines_search", "routines_create", "routines_complete_step", "routines_delete"] },
  { id: "weekly-review", name: "Weekly Review", description: "Summarizes your last 7 days — events, tasks, goal progress — without inventing numbers.", status: "active", icon: BarChart3, tools: ["weekly_review_generate", "daily_briefing_get"] },
  { id: "email", name: "Email", description: "Read, summarize, draft, and organize your inbox. Sending always requires confirmation.", status: "coming_soon", icon: Mail, tools: [] },
  { id: "finance", name: "Finance", description: "Expense tracking, budgets, and subscription tracking. Never executes payments.", status: "coming_soon", icon: Wallet, tools: [] },
  { id: "travel", name: "Travel", description: "Coordinates flights, hotels, and itineraries around your calendar. Bookings always confirmed.", status: "coming_soon", icon: Plane, tools: [] },
  { id: "research", name: "Research", description: "Researches topics and returns sourced answers, clearly separating your data from general knowledge.", status: "coming_soon", icon: Search, tools: [] },
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Agents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The Head Agent routes your requests to the right specialist. More agents are coming.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {catalog.map((agent, i) => (
          <FadeIn key={agent.id} index={i}>
            <Card>
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
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
