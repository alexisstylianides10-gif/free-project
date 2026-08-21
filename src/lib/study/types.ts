// Domain types for the Study system (src/app/app/school/*). Kept separate
// from src/lib/types.ts since this is a large, self-contained subsystem —
// splitting it out keeps the main types file from ballooning.

export interface StudySubject {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  created_at: string;
}

export type MaterialKind = "pdf" | "image" | "notes" | "paste";
export type MaterialStatus = "pending" | "analyzing" | "analyzed" | "failed";

export interface MaterialAnalysisSummary {
  topic_count: number;
  concept_count: number;
  term_count: number;
  question_count: number;
}

export interface StudyMaterial {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  kind: MaterialKind;
  storage_path: string | null;
  raw_text: string | null;
  status: MaterialStatus;
  analysis: MaterialAnalysisSummary | null;
  created_at: string;
}

export interface StudyTopic {
  id: string;
  user_id: string;
  subject_id: string;
  material_id: string | null;
  name: string;
  summary: string | null;
  key_concepts: string[];
  mastery: number;
  quiz_attempts: number;
  correct_answers: number;
  last_practiced_at: string | null;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  subject_id: string;
  exam_id: string | null;
  accepted: boolean;
  created_at: string;
}

export interface StudyPlanItem {
  id: string;
  plan_id: string;
  user_id: string;
  day_index: number;
  topic_id: string | null;
  label: string;
  duration_min: number;
  completed: boolean;
}

export type StudyMode = "learn" | "practice" | "quiz" | "review";

export interface StudyFocusSession {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  mode: StudyMode;
  duration_min: number;
  accuracy_percent: number | null;
  created_at: string;
}

export type QuizDifficulty = "easy" | "medium" | "hard" | "exam";
export type QuizQuestionType = "multiple_choice" | "true_false" | "short_answer" | "fill_blank" | "scenario";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  topic: string;
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface StudyQuiz {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  material_id: string | null;
  difficulty: QuizDifficulty;
  question_count: number;
  questions: QuizQuestion[];
  is_mock_exam: boolean;
  time_limit_min: number | null;
  created_at: string;
}

export type AnswerVerdict = "correct" | "almost" | "review";

export interface QuizResultItem {
  question_id: string;
  your_answer: string;
  verdict: AnswerVerdict;
  correct_answer: string;
  explanation: string;
  topic: string;
}

export interface StudyQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score_percent: number;
  correct_count: number;
  results: QuizResultItem[];
  strong_topics: string[];
  weak_topics: string[];
  created_at: string;
}

export type FlashcardResult = "knew" | "almost" | "didnt";

export interface StudyFlashcard {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  front: string;
  back: string;
  interval_days: number;
  ease_factor: number;
  due_date: string;
  reps: number;
  last_result: FlashcardResult | null;
  created_at: string;
}

export interface StudyTutorMessage {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type ExplanationLevel = "simple" | "normal" | "detailed" | "exam";
