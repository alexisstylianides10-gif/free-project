export interface SkillDef {
  key: string;
  label: string;
}

// Mirrors STRENGTH_OPTIONS keys so a mission's skillKeys map straight onto
// a profile skill bar. A student's starting proficiency comes from whether
// they picked that strength during onboarding (see seed/demo-data.ts).
export const SKILLS: SkillDef[] = [
  { key: "communication", label: "Communication" },
  { key: "creativity", label: "Creativity" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "leadership", label: "Leadership" },
  { key: "coding", label: "Coding" },
  { key: "mathematics", label: "Mathematics" },
  { key: "writing", label: "Writing" },
  { key: "video_editing", label: "Video Editing" },
  { key: "selling", label: "Selling" },
  { key: "organisation", label: "Organisation" },
  { key: "working_with_people", label: "Working With People" },
  { key: "building_things", label: "Building Things" },
];

export function skillLabel(key: string): string {
  return SKILLS.find((s) => s.key === key)?.label ?? key;
}
