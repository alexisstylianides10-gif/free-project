import type { Metadata } from "next";
import { StaticContentPage } from "@/components/shared/StaticContentPage";
import { branding } from "@/lib/branding";

export const metadata: Metadata = { title: "FAQ" };

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What is Alxioum?",
    a: `${branding.name} is a daily planning app for students and founders: one AI-built plan that tracks your school work or your business milestones and turns them into real next steps.`,
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Core organization (timetable, homework, exams, career matches, or your business plan and milestones) is always free. AI features like the Coach, study plans, and quiz generation are part of Plus.",
  },
  {
    q: "Can I switch tracks after signing up?",
    a: "Your track (student or founder) is locked in once you finish onboarding, so the app can build itself fully around it. If you signed up on the wrong track, contact us and we can help.",
  },
];

export default function FaqPage() {
  return (
    <StaticContentPage title="Frequently Asked Questions">
      <div className="space-y-6">
        {QUESTIONS.map((item) => (
          <div key={item.q}>
            <p className="font-semibold text-foreground">{item.q}</p>
            <p className="mt-1">{item.a}</p>
          </div>
        ))}
      </div>
      <p>More questions? We&rsquo;re adding to this list. Reach out and we&rsquo;ll answer directly.</p>
    </StaticContentPage>
  );
}
