import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import type { StudyMode, FlashcardResult } from "@/lib/study/types";
import { awardXP } from "@/lib/actions/xp";
import { awardAchievementOnce } from "@/lib/actions/achievements";
import { addDaysISO, todayISO, clamp } from "@/lib/utils";

type ProfileXPFields = Pick<Profile, "xp_school" | "xp_career" | "xp_skill" | "xp_project" | "streak_count" | "longest_streak" | "last_active_date">;

/**
 * Logs one real study session (Learn/Practice/Quiz/Review), awards XP for
 * the time actually spent, and grants the "first study session" / "10
 * study sessions" achievements at the right moment. This is the one place
 * every Study surface (session player, quiz submission, flashcard review)
 * should go through when a session wraps up, so XP math and achievement
 * triggers only exist once.
 */
export async function logFocusSession(
  supabase: SupabaseClient,
  userId: string,
  session: { subjectId: string; topicId?: string | null; mode: StudyMode; durationMin: number; accuracyPercent?: number | null },
  profile: ProfileXPFields
): Promise<ProfileXPFields> {
  const { count: priorCount } = await supabase
    .from("study_focus_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  await supabase.from("study_focus_sessions").insert({
    user_id: userId,
    subject_id: session.subjectId,
    topic_id: session.topicId ?? null,
    mode: session.mode,
    duration_min: session.durationMin,
    accuracy_percent: session.accuracyPercent ?? null,
  });

  const xp = Math.min(60, Math.max(5, Math.round(session.durationMin * 1.2)));
  const updated = await awardXP(supabase, userId, profile, { xp_school: xp });

  const newCount = (priorCount ?? 0) + 1;
  if (newCount === 1) await awardAchievementOnce(supabase, userId, "first_study_session");
  if (newCount === 10) await awardAchievementOnce(supabase, userId, "study_sessions_10");

  return updated;
}

/**
 * Nudges a topic's mastery toward 100 or 0 based on one more answer being
 * right or wrong (exponential moving average, not a hard reset — one bad
 * answer on an otherwise-strong topic shouldn't tank it back to "weak").
 */
export async function updateTopicMastery(supabase: SupabaseClient, topicId: string, correct: boolean): Promise<void> {
  const { data: topic } = await supabase.from("study_topics").select("mastery, quiz_attempts, correct_answers").eq("id", topicId).maybeSingle();
  if (!topic) return;

  const nextMastery = clamp(Math.round(topic.mastery * 0.7 + (correct ? 100 : 0) * 0.3), 0, 100);

  await supabase
    .from("study_topics")
    .update({
      mastery: nextMastery,
      quiz_attempts: topic.quiz_attempts + 1,
      correct_answers: topic.correct_answers + (correct ? 1 : 0),
      last_practiced_at: new Date().toISOString(),
    })
    .eq("id", topicId);
}

/**
 * Simple SM-2-style spaced repetition update for one flashcard review.
 * "Knew it" grows the interval (multiplied by ease, which itself grows
 * slightly); "Almost" resets to a short interval without punishing ease
 * much; "Didn't know" resets both — the card comes back tomorrow.
 */
export async function gradeFlashcard(supabase: SupabaseClient, flashcardId: string, result: FlashcardResult): Promise<void> {
  const { data: card } = await supabase.from("study_flashcards").select("interval_days, ease_factor, reps").eq("id", flashcardId).maybeSingle();
  if (!card) return;

  let interval = card.interval_days;
  let ease = card.ease_factor;
  let reps = card.reps;

  if (result === "knew") {
    interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * ease));
    ease = Math.min(2.8, ease + 0.1);
    reps += 1;
  } else if (result === "almost") {
    interval = 2;
    ease = Math.max(1.3, ease - 0.15);
  } else {
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
    reps = 0;
  }

  await supabase
    .from("study_flashcards")
    .update({
      interval_days: interval,
      ease_factor: ease,
      due_date: addDaysISO(todayISO(), interval),
      reps,
      last_result: result,
    })
    .eq("id", flashcardId);
}
