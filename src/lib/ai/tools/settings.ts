import type { ToolSpec } from "./types";

const THEMES = ["light", "dark", "system"] as const;

interface ProfileRow {
  name: string;
  timezone: string;
  location: string;
  theme: string;
  memory_enabled: boolean;
  notification_prefs: { deadlines: boolean; scheduleGaps: boolean; dailyBriefing: boolean };
  plan: string;
}

export const settingsGet: ToolSpec<Record<string, never>> = {
  name: "settings_get",
  description: "Read the user's current app settings: name, timezone, location, theme, memory on/off, notification preferences, and plan. Use this before proposing a settings change so you know the current values.",
  inputSchema: { type: "object", properties: {} },
  consequential: false,
  execute: async (ctx) => {
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("name, timezone, location, theme, memory_enabled, notification_prefs, plan")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Profile not found." };
    const row = data as ProfileRow;
    return {
      ok: true,
      result: {
        name: row.name,
        timezone: row.timezone,
        location: row.location,
        theme: row.theme,
        memoryEnabled: row.memory_enabled,
        notificationPrefs: row.notification_prefs,
        plan: row.plan,
      },
    };
  },
};

export const settingsUpdate: ToolSpec<{
  name?: string;
  timezone?: string;
  location?: string;
  theme?: (typeof THEMES)[number];
  memoryEnabled?: boolean;
  notifyDeadlines?: boolean;
  notifyScheduleGaps?: boolean;
  notifyDailyBriefing?: boolean;
}> = {
  name: "settings_update",
  description:
    "Propose changing one or more app settings: display name, timezone, location, theme, memory on/off, or notification toggles. Cannot change plan/billing or delete the account — those require the Settings page directly.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      timezone: { type: "string", description: "IANA timezone, e.g. Europe/Athens." },
      location: { type: "string" },
      theme: { type: "string", enum: THEMES as unknown as string[] },
      memoryEnabled: { type: "boolean" },
      notifyDeadlines: { type: "boolean" },
      notifyScheduleGaps: { type: "boolean" },
      notifyDailyBriefing: { type: "boolean" },
    },
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const changes: string[] = [];
    if (input.name !== undefined) changes.push(`name to "${input.name}"`);
    if (input.timezone !== undefined) changes.push(`timezone to ${input.timezone}`);
    if (input.location !== undefined) changes.push(`location to "${input.location}"`);
    if (input.theme !== undefined) changes.push(`theme to ${input.theme}`);
    if (input.memoryEnabled !== undefined) changes.push(`memory ${input.memoryEnabled ? "on" : "off"}`);
    if (input.notifyDeadlines !== undefined) changes.push(`deadline notifications ${input.notifyDeadlines ? "on" : "off"}`);
    if (input.notifyScheduleGaps !== undefined) changes.push(`schedule-gap notifications ${input.notifyScheduleGaps ? "on" : "off"}`);
    if (input.notifyDailyBriefing !== undefined) changes.push(`daily briefing ${input.notifyDailyBriefing ? "on" : "off"}`);
    if (changes.length === 0) return { error: "No settings changes were specified." };
    return { summary: `Change ${changes.join(", ")}?` };
  },
  execute: async (ctx, input) => {
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.timezone !== undefined) row.timezone = input.timezone;
    if (input.location !== undefined) row.location = input.location;
    if (input.theme !== undefined) row.theme = input.theme;
    if (input.memoryEnabled !== undefined) row.memory_enabled = input.memoryEnabled;

    if (input.notifyDeadlines !== undefined || input.notifyScheduleGaps !== undefined || input.notifyDailyBriefing !== undefined) {
      const { data: current } = await ctx.supabase.from("profiles").select("notification_prefs").eq("id", ctx.userId).maybeSingle();
      const prefs = (current?.notification_prefs as ProfileRow["notification_prefs"]) ?? { deadlines: true, scheduleGaps: true, dailyBriefing: true };
      row.notification_prefs = {
        deadlines: input.notifyDeadlines ?? prefs.deadlines,
        scheduleGaps: input.notifyScheduleGaps ?? prefs.scheduleGaps,
        dailyBriefing: input.notifyDailyBriefing ?? prefs.dailyBriefing,
      };
    }

    const { data, error } = await ctx.supabase.from("profiles").update(row).eq("id", ctx.userId).select("*").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Profile not found." };
    return { ok: true, result: { profile: data } };
  },
};

export const settingsTools = [settingsGet, settingsUpdate];
