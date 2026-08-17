import type { ToolSpec } from "./types";
import type { CalendarEvent } from "@/lib/types";
import { generateFlashcards, resolveStudySource } from "@/lib/study/flashcards";
import { generateQuiz } from "@/lib/study/quizzes";
import { findFreeSlots } from "@/lib/schedule";
import { eventOccursOn, formatDayLabel, formatTime12, timeOverlap } from "@/lib/utils";
import { pushEventToGoogle } from "@/lib/google/calendar";
import type { ToolContext } from "./types";

async function isStudentPlan(ctx: ToolContext): Promise<boolean> {
  const { data: profile } = await ctx.supabase.from("profiles").select("plan").eq("id", ctx.userId).maybeSingle();
  return profile?.plan === "Student";
}

export const studyGenerateFlashcards: ToolSpec<{ source: "note" | "document" | "text"; noteId?: string; documentId?: string; text?: string; subjectId?: string }> = {
  name: "study_generate_flashcards",
  statusLabel: "Making flashcards…",
  description:
    "Generate a deck of flashcards grounded strictly in a study note, an existing document, or pasted text — never invents facts beyond the source. Saves the deck immediately (Student plan feature).",
  inputSchema: {
    type: "object",
    properties: {
      source: { type: "string", enum: ["note", "document", "text"] },
      noteId: { type: "string", description: "Required if source is 'note' — an exact id from a prior study notes lookup." },
      documentId: { type: "string", description: "Required if source is 'document' — an exact id from documents_search." },
      text: { type: "string", description: "Required if source is 'text' — the pasted material." },
      subjectId: { type: "string", description: "Optional subject to file the deck under." },
    },
    required: ["source"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    if (!(await isStudentPlan(ctx))) return { ok: false, error: "Flashcards are part of the Study section (Student plan)." };

    const src =
      input.source === "note" && input.noteId
        ? ({ kind: "note", noteId: input.noteId } as const)
        : input.source === "document" && input.documentId
          ? ({ kind: "document", documentId: input.documentId } as const)
          : input.source === "text" && input.text
            ? ({ kind: "text", text: input.text } as const)
            : null;
    if (!src) return { ok: false, error: "Missing the material to generate flashcards from." };

    const resolved = await resolveStudySource(ctx.supabase, ctx.userId, src);
    if (!resolved.ok) return { ok: false, error: resolved.error };

    const outcome = await generateFlashcards(resolved.text);
    if (!outcome.ok) return { ok: false, error: outcome.error };

    const { data, error } = await ctx.supabase
      .from("study_flashcard_decks")
      .insert({
        user_id: ctx.userId,
        subject_id: input.subjectId ?? resolved.subjectId ?? null,
        source_note_id: input.source === "note" ? input.noteId : null,
        title: outcome.title,
        cards: outcome.cards,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { deck: data } };
  },
};

export const studyGenerateQuiz: ToolSpec<{ source: "note" | "document" | "text"; noteId?: string; documentId?: string; text?: string; subjectId?: string }> = {
  name: "study_generate_quiz",
  statusLabel: "Making a quiz…",
  description:
    "Generate a practice quiz grounded strictly in a study note, an existing document, or pasted text — never invents facts beyond the source. Saves the quiz immediately (Student plan feature).",
  inputSchema: {
    type: "object",
    properties: {
      source: { type: "string", enum: ["note", "document", "text"] },
      noteId: { type: "string" },
      documentId: { type: "string" },
      text: { type: "string" },
      subjectId: { type: "string" },
    },
    required: ["source"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    if (!(await isStudentPlan(ctx))) return { ok: false, error: "Quizzes are part of the Study section (Student plan)." };

    const src =
      input.source === "note" && input.noteId
        ? ({ kind: "note", noteId: input.noteId } as const)
        : input.source === "document" && input.documentId
          ? ({ kind: "document", documentId: input.documentId } as const)
          : input.source === "text" && input.text
            ? ({ kind: "text", text: input.text } as const)
            : null;
    if (!src) return { ok: false, error: "Missing the material to generate a quiz from." };

    const resolved = await resolveStudySource(ctx.supabase, ctx.userId, src);
    if (!resolved.ok) return { ok: false, error: resolved.error };

    const outcome = await generateQuiz(resolved.text);
    if (!outcome.ok) return { ok: false, error: outcome.error };

    const { data, error } = await ctx.supabase
      .from("study_quizzes")
      .insert({
        user_id: ctx.userId,
        subject_id: input.subjectId ?? resolved.subjectId ?? null,
        source_note_id: input.source === "note" ? input.noteId : null,
        title: outcome.title,
        questions: outcome.questions,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { quiz: data } };
  },
};

export const studyFindFreeTime: ToolSpec<{ durationMinutes?: number; fromDate?: string; daysAhead?: number }> = {
  name: "study_find_free_time",
  statusLabel: "Checking your calendar for study time…",
  description:
    "Find open slots across the next several days for study sessions, correctly accounting for recurring events (lessons, sports, clubs) — not just events on their literal seed date. Read-only — creates nothing. Call this before study_plan_create to pick real, non-conflicting session times rather than guessing.",
  inputSchema: {
    type: "object",
    properties: {
      durationMinutes: { type: "number", description: "Minimum usable slot length in minutes. Default 45." },
      fromDate: { type: "string", description: "ISO date to start scanning from. Defaults to today." },
      daysAhead: { type: "number", description: "How many days to scan ahead. Default 7, max 21." },
    },
  },
  consequential: false,
  execute: async (ctx, input) => {
    if (!(await isStudentPlan(ctx))) return { ok: false, error: "Study planning is part of the Study section (Student plan)." };
    const duration = input.durationMinutes ?? 45;
    const days = Math.min(Math.max(input.daysAhead ?? 7, 1), 21);
    const startDate = new Date(`${input.fromDate ?? ctx.today}T00:00:00`);
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    const lastDate = dates[dates.length - 1];
    const { data, error } = await ctx.supabase
      .from("events")
      .select("date,start_time,end_time,recurrence,recurrence_until")
      .eq("user_id", ctx.userId)
      .lte("date", lastDate);
    if (error) return { ok: false, error: error.message };
    const events = (data ?? []).map((e) => ({
      date: e.date as string,
      startTime: e.start_time as string,
      endTime: e.end_time as string,
      recurrence: e.recurrence as "none" | "daily" | "weekly",
      recurrenceUntil: (e.recurrence_until as string | null) ?? undefined,
    }));
    const slotsByDay: { date: string; slots: { start: string; end: string; minutes: number }[] }[] = [];
    for (const date of dates) {
      const dayEvents = events.filter((e) => eventOccursOn(e, date)).map((e) => ({ startTime: e.startTime, endTime: e.endTime }) as CalendarEvent);
      const slots = findFreeSlots(dayEvents, duration);
      if (slots.length) slotsByDay.push({ date, slots });
    }
    return { ok: true, result: { slotsByDay } };
  },
};

interface StudyPlanSession {
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
}
interface StudyPlanTask {
  title: string;
  dueDate?: string;
}

export const studyPlanCreate: ToolSpec<{
  examSubject: string;
  targetDate: string;
  goalId?: string;
  sessions: StudyPlanSession[];
  tasks?: StudyPlanTask[];
}> = {
  name: "study_plan_create",
  statusLabel: "Building your study plan…",
  description:
    "Propose a full study plan for an exam/test in ONE confirmation: an exam goal (unless goalId is given for an existing one), multiple study calendar sessions, and optional prep tasks — instead of calling goals_create/calendar_create/tasks_create separately. Always call study_find_free_time (and calendar_search if useful) first to pick real, non-conflicting session times. Ground every session's topic in the source material or the student's own stated subjects — never invent exam topics that weren't mentioned.",
  inputSchema: {
    type: "object",
    properties: {
      examSubject: { type: "string", description: "e.g. 'Biology exam' — used to name the goal if one isn't supplied." },
      targetDate: { type: "string", description: "ISO date of the exam/test." },
      goalId: { type: "string", description: "Exact id of an existing goal to attach this plan to, from goals_search. Omit to create a new exam goal." },
      sessions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string" },
            startTime: { type: "string", description: "HH:mm 24h" },
            endTime: { type: "string", description: "HH:mm 24h" },
            topic: { type: "string" },
          },
          required: ["date", "startTime", "endTime", "topic"],
        },
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, dueDate: { type: "string" } },
          required: ["title"],
        },
      },
    },
    required: ["examSubject", "targetDate", "sessions"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    if (!(await isStudentPlan(ctx))) return { error: "Study planning is part of the Study section (Student plan)." };
    if (!input.sessions?.length) return { error: "A study plan needs at least one session." };
    if (input.goalId) {
      const { data } = await ctx.supabase.from("goals").select("id,name").eq("id", input.goalId).eq("user_id", ctx.userId).maybeSingle();
      if (!data) return { error: "I couldn't find that goal." };
    }
    const { data: existingEvents, error } = await ctx.supabase.from("events").select("id,title,date,start_time,end_time").eq("user_id", ctx.userId).in(
      "date",
      Array.from(new Set(input.sessions.map((s) => s.date)))
    );
    if (error) return { error: error.message };
    const conflicts = input.sessions.filter((s) =>
      (existingEvents ?? []).some((e) => e.date === s.date && timeOverlap(s.startTime, s.endTime, e.start_time as string, e.end_time as string))
    );
    const goalPart = input.goalId ? "" : `an exam goal for "${input.examSubject}" (${formatDayLabel(input.targetDate, ctx.today)}), `;
    const sessionsList = input.sessions
      .map((s) => `${formatDayLabel(s.date, ctx.today)} ${formatTime12(s.startTime)}–${formatTime12(s.endTime)}: ${s.topic}`)
      .join("; ");
    const tasksPart = input.tasks?.length ? ` and ${input.tasks.length} prep task${input.tasks.length > 1 ? "s" : ""} (${input.tasks.map((t) => t.title).join(", ")})` : "";
    const conflictNote = conflicts.length ? `\n\n⚠️ ${conflicts.length} of these overlap something already on your calendar — you can still confirm, or ask me to adjust.` : "";
    return { summary: `Set up ${goalPart}${input.sessions.length} study session${input.sessions.length > 1 ? "s" : ""} (${sessionsList})${tasksPart}?${conflictNote}` };
  },
  execute: async (ctx, input) => {
    if (!(await isStudentPlan(ctx))) return { ok: false, error: "Study planning is part of the Study section (Student plan)." };
    let goalId = input.goalId ?? null;
    if (!goalId) {
      const { data: goal, error: goalError } = await ctx.supabase
        .from("goals")
        .insert({
          user_id: ctx.userId,
          name: input.examSubject,
          description: `Study plan created via chat, targeting ${input.targetDate}.`,
          target_date: input.targetDate,
          icon: "📚",
          category: "academic",
          measurement_type: "checklist",
        })
        .select("id")
        .single();
      if (goalError) return { ok: false, error: `Couldn't create the exam goal: ${goalError.message}` };
      goalId = goal.id as string;
    }

    const createdSessions: unknown[] = [];
    const createdTasks: unknown[] = [];
    const failures: string[] = [];

    for (const s of input.sessions) {
      const { data, error } = await ctx.supabase
        .from("events")
        .insert({
          user_id: ctx.userId,
          title: `Study: ${s.topic}`,
          date: s.date,
          start_time: s.startTime,
          end_time: s.endTime,
          type: "study",
          notes: `Part of the ${input.examSubject} study plan.`,
          recurrence: "none",
          timezone: ctx.timezone,
          linked_goal_id: goalId,
          ai_generated: true,
        })
        .select("*")
        .single();
      if (error) {
        failures.push(`Session "${s.topic}" (${s.date}): ${error.message}`);
        continue;
      }
      createdSessions.push(data);
      pushEventToGoogle(ctx.supabase, ctx.userId, "create", {
        id: data.id,
        title: data.title,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        notes: data.notes ?? undefined,
        timezone: data.timezone ?? ctx.timezone,
        recurrence: "none",
        source: "alxioum",
      }).catch((err) => console.error("[study_plan_create] google sync failed:", err));
    }

    for (const t of input.tasks ?? []) {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .insert({
          user_id: ctx.userId,
          title: t.title,
          due_date: t.dueDate ?? null,
          priority: "medium",
          category: "school",
          goal_id: goalId,
          ai_context: "Created via chat as part of a study plan",
        })
        .select("*")
        .single();
      if (error) {
        failures.push(`Task "${t.title}": ${error.message}`);
        continue;
      }
      createdTasks.push(data);
    }

    if (createdSessions.length === 0 && createdTasks.length === 0 && failures.length > 0) {
      return { ok: false, error: failures.join("; ") };
    }
    return { ok: true, result: { goalId, sessions: createdSessions, tasks: createdTasks, failures } };
  },
};

export const studyTools = [studyGenerateFlashcards, studyGenerateQuiz, studyFindFreeTime, studyPlanCreate];
