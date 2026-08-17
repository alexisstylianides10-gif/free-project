/**
 * Deterministic frequency count over stored quiz attempts — never AI-guessed.
 * Kept in its own client-safe file (no Anthropic SDK import) since it's used
 * directly by the Study Mode page, unlike the generation helpers in
 * flashcards.ts/quizzes.ts which are server-only.
 */
export function computeWeakTopics(attempts: { answers: { topic?: string; correct: boolean }[] }[]): { topic: string; wrongCount: number; totalCount: number }[] {
  const byTopic = new Map<string, { wrong: number; total: number }>();
  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      if (!answer.topic) continue;
      const entry = byTopic.get(answer.topic) ?? { wrong: 0, total: 0 };
      entry.total += 1;
      if (!answer.correct) entry.wrong += 1;
      byTopic.set(answer.topic, entry);
    }
  }
  return Array.from(byTopic.entries())
    .filter(([, v]) => v.wrong / v.total > 0.5)
    .map(([topic, v]) => ({ topic, wrongCount: v.wrong, totalCount: v.total }))
    .sort((a, b) => b.wrongCount - a.wrongCount);
}
