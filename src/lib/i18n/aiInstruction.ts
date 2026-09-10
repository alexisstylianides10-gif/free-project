import "server-only";
import { DEFAULT_LOCALE, LOCALE_META, isSupportedLocale, type Locale } from "@/lib/i18n/locales";

/**
 * The one instruction every user-facing Anthropic `system` prompt in this
 * app appends when the student/founder's locale isn't English — Coach, the
 * Study/Tutor/Homework-Help routes (via src/lib/study/ai.ts), and the
 * onboarding research routes all funnel through this so the wording (and
 * the "unless they write in English" escape hatch) stays identical
 * everywhere instead of drifting per-route. Returns "" for English since
 * every prompt in this codebase is already written in English by default —
 * appending a no-op instruction would just be noise.
 */
export function languageInstruction(locale: Locale | null | undefined): string {
  const resolved = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  if (resolved === DEFAULT_LOCALE) return "";
  const { englishName } = LOCALE_META[resolved];
  return `\n\nLANGUAGE: Respond in ${englishName}, not English, unless the student writes to you in English — in that case, reply in English instead. This applies to your entire reply, not just part of it.`;
}

/** Appends languageInstruction() to a system prompt in one call, so every
 * call site is a single line instead of string concatenation repeated. */
export function withLanguageInstruction(system: string, locale: Locale | null | undefined): string {
  return `${system}${languageInstruction(locale)}`;
}
