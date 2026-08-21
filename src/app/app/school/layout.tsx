import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { SchoolSubNav } from "./SchoolSubNav";

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in space-y-5 pb-4">
      <ScreenHeader title="My School" subtitle="Class, homework, exams — and your AI study coach." />
      <SchoolSubNav />
      <div>{children}</div>
    </div>
  );
}
