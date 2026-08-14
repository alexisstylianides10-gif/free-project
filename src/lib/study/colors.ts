export interface SubjectColorway {
  key: string;
  label: string;
  gradient: string;
  ring: string;
  dot: string;
}

/** Palette for Subject cards / Focus-mode accents in the Study section. */
export const SUBJECT_COLORS: SubjectColorway[] = [
  { key: "violet", label: "Violet", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-500/40", dot: "bg-violet-500" },
  { key: "fuchsia", label: "Fuchsia", gradient: "from-fuchsia-500 to-pink-600", ring: "ring-fuchsia-500/40", dot: "bg-fuchsia-500" },
  { key: "blue", label: "Blue", gradient: "from-sky-500 to-blue-600", ring: "ring-sky-500/40", dot: "bg-sky-500" },
  { key: "amber", label: "Amber", gradient: "from-amber-400 to-orange-500", ring: "ring-amber-500/40", dot: "bg-amber-500" },
  { key: "emerald", label: "Emerald", gradient: "from-emerald-400 to-teal-600", ring: "ring-emerald-500/40", dot: "bg-emerald-500" },
  { key: "rose", label: "Rose", gradient: "from-rose-500 to-red-600", ring: "ring-rose-500/40", dot: "bg-rose-500" },
];

export function subjectColorway(key: string): SubjectColorway {
  return SUBJECT_COLORS.find((c) => c.key === key) ?? SUBJECT_COLORS[0];
}
