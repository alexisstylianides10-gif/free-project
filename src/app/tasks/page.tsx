"use client";

import { useMemo, useState } from "react";
import { Plus, Inbox as InboxIcon } from "lucide-react";
import { useLifeOS } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskRow } from "@/components/domain/TaskRow";
import { daysBetween, todayISO } from "@/lib/utils";

export default function TasksPage() {
  const tasks = useLifeOS((s) => s.tasks);
  const openQuickAdd = useLifeOS((s) => s.openQuickAdd);
  const [tab, setTab] = useState("today");
  const today = todayISO();

  const groups = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    return {
      inbox: open.filter((t) => !t.dueDate),
      today: open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) === 0),
      upcoming: open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) > 0),
      overdue: open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) < 0),
      completed: tasks.filter((t) => t.done),
    };
  }, [tasks, today]);

  const tabDefs = [
    { key: "inbox", label: "Inbox", items: groups.inbox },
    { key: "today", label: "Today", items: groups.today },
    { key: "upcoming", label: "Upcoming", items: groups.upcoming },
    { key: "overdue", label: "Overdue", items: groups.overdue },
    { key: "completed", label: "Completed", items: groups.completed },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Tasks</h1>
          <p className="text-[13.5px] text-muted-foreground">Everything that needs to get done, organized by LifeOS.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => openQuickAdd("task")}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto md:w-auto">
          {tabDefs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
              {t.items.length > 0 && <span className="ml-1.5 text-muted-foreground">{t.items.length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabDefs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4 space-y-2 focus:outline-none">
            {t.items.length === 0 ? (
              <EmptyState
                icon={InboxIcon}
                title={emptyTitle(t.key)}
                body={emptyBody(t.key)}
                action={
                  t.key !== "completed" ? (
                    <Button size="sm" onClick={() => openQuickAdd("task")}>
                      Add a task
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              t.items.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function emptyTitle(key: string) {
  return {
    inbox: "Inbox is empty",
    today: "Nothing due today",
    upcoming: "No upcoming tasks",
    overdue: "Nothing overdue",
    completed: "No completed tasks yet",
  }[key]!;
}

function emptyBody(key: string) {
  return {
    inbox: "Capture things here before deciding when to do them.",
    today: "You're clear for today. LifeOS will surface anything urgent on Home.",
    upcoming: "Tasks with a future due date will show up here.",
    overdue: "Nothing has slipped — nice work staying on top of things.",
    completed: "Tasks you finish will collect here so you can look back.",
  }[key]!;
}
