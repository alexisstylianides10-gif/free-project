"use client";

import { useState } from "react";
import { GraduationCap, Loader2, Sparkles } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

const EDUCATION_LEVELS = ["Primary school", "Middle school", "High school", "University", "Other"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export function SchoolCard() {
  const studentProfile = useAlxioum((s) => s.studentProfile);
  const updateStudentProfile = useAlxioum((s) => s.updateStudentProfile);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);

  const hasSchool = !!(studentProfile?.schoolName && studentProfile?.country);
  const [editing, setEditing] = useState(!hasSchool);
  const [schoolName, setSchoolName] = useState(studentProfile?.schoolName ?? "");
  const [country, setCountry] = useState(studentProfile?.country ?? "");
  const [educationLevel, setEducationLevel] = useState(studentProfile?.educationLevel || EDUCATION_LEVELS[2]);
  const [termStartDate, setTermStartDate] = useState(studentProfile?.termStartDate ?? "");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  async function save() {
    if (!schoolName.trim() || !country.trim()) return;
    setSaving(true);
    await updateStudentProfile({ schoolName: schoolName.trim(), country: country.trim(), educationLevel, termStartDate: termStartDate || undefined });
    setSaving(false);
    setEditing(false);
  }

  async function research() {
    setResearching(true);
    setResearchError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/study/research-school", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't research that school.");
      await updateStudentProfile({ researchSummary: body.researchSummary, researchedAt: body.researchedAt });
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setResearching(false);
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <GraduationCap className="h-4 w-4 text-accent" /> Tell us about your school
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted-foreground">School name</span>
              <input className={inputClass} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. Lincoln High School" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted-foreground">Country</span>
              <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United States" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted-foreground">Education level</span>
              <select className={inputClass} value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted-foreground">Term starts (optional)</span>
              <input type="date" className={inputClass} value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button className="bg-gradient-to-br from-violet-600 to-fuchsia-600" onClick={save} disabled={!schoolName.trim() || !country.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {hasSchool && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold text-foreground">{studentProfile!.schoolName}</p>
            <p className="text-[12.5px] text-muted-foreground">
              {studentProfile!.country}
              {studentProfile!.educationLevel ? ` · ${studentProfile!.educationLevel}` : ""}
              {studentProfile!.termStartDate ? ` · Term starts ${studentProfile!.termStartDate}` : ""}
            </p>
          </div>
          <button onClick={() => setEditing(true)} className="shrink-0 text-[12.5px] font-medium text-accent">
            Edit
          </button>
        </div>

        {studentProfile!.researchSummary ? (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[12.5px] text-foreground">{studentProfile!.researchSummary}</p>
            <button onClick={research} disabled={researching} className="mt-2 text-[12px] font-medium text-accent disabled:opacity-50">
              {researching ? "Researching…" : "Refresh research"}
            </button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={research} disabled={researching}>
            {researching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {researching ? "Researching…" : "Research my school"}
          </Button>
        )}
        {researchError && <p className="text-[12px] text-danger">{researchError}</p>}
      </CardContent>
    </Card>
  );
}
