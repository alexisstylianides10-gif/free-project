"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StudyQuiz, QuizAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { computeWeakTopics } from "@/lib/study/weakTopics";

export function QuizTakingView({ quiz, onComplete }: { quiz: StudyQuiz; onComplete: (result: { answers: QuizAnswer[]; score: number; weakTopics: string[] }) => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [done, setDone] = useState<{ answers: QuizAnswer[]; score: number; weakTopics: string[] } | null>(null);

  const question = quiz.questions[index];

  function pick(option: string) {
    if (revealed) return;
    setSelected(option);
  }

  function submitAnswer() {
    if (!selected || revealed) return;
    setRevealed(true);
  }

  function next() {
    if (!question) return;
    const correct = selected === question.correctAnswer;
    const nextAnswers = [...answers, { question: question.question, givenAnswer: selected ?? "", correct, topic: question.topic }];
    setAnswers(nextAnswers);
    setSelected(null);
    setRevealed(false);

    if (index + 1 < quiz.questions.length) {
      setIndex((i) => i + 1);
      return;
    }

    const score = Math.round((nextAnswers.filter((a) => a.correct).length / nextAnswers.length) * 100);
    const weakTopics = computeWeakTopics([{ answers: nextAnswers }]).map((t) => t.topic);

    const result = { answers: nextAnswers, score, weakTopics };
    setDone(result);
    onComplete(result);
  }

  if (done) {
    return (
      <Card className="border-accent/30 bg-accent-soft/30">
        <CardContent className="space-y-2 p-5 text-center">
          <p className="text-[13px] font-semibold text-foreground">Quiz complete</p>
          <p className="text-[28px] font-semibold text-accent">{done.score}%</p>
          <p className="text-[12.5px] text-muted-foreground">
            {done.answers.filter((a) => a.correct).length} of {done.answers.length} correct
          </p>
          {done.weakTopics.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {done.weakTopics.map((t) => (
                <Badge key={t} tone="warning">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        Question {index + 1} of {quiz.questions.length}
      </p>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-[14px] font-medium text-foreground">{question.question}</p>
          <div className="space-y-1.5">
            {(question.options ?? []).map((option) => {
              const isCorrect = option === question.correctAnswer;
              const isSelected = option === selected;
              return (
                <button
                  key={option}
                  onClick={() => pick(option)}
                  disabled={revealed}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px]",
                    !revealed && isSelected && "border-accent bg-accent-soft text-accent",
                    !revealed && !isSelected && "border-border text-foreground hover:bg-muted",
                    revealed && isCorrect && "border-success bg-success-soft text-success",
                    revealed && isSelected && !isCorrect && "border-danger bg-danger-soft text-danger",
                    revealed && !isSelected && !isCorrect && "border-border text-muted-foreground"
                  )}
                >
                  {option}
                  {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {revealed && <p className="text-[12px] text-muted-foreground">{question.explanation}</p>}
        </CardContent>
      </Card>
      {!revealed ? (
        <Button onClick={submitAnswer} disabled={!selected} className="w-full justify-center">
          Check answer
        </Button>
      ) : (
        <Button onClick={next} className="w-full justify-center">
          {index + 1 < quiz.questions.length ? "Next question" : "Finish"}
        </Button>
      )}
    </div>
  );
}
