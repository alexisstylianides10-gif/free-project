import { Calendar, CheckSquare, BrainCircuit, Mail, Wallet, Plane, ShoppingCart } from "lucide-react";

const ACTIVE = [
  { icon: Calendar, label: "Calendar" },
  { icon: CheckSquare, label: "Tasks" },
  { icon: BrainCircuit, label: "Memory" },
];

const SOON = [
  { icon: Mail, label: "Email" },
  { icon: Wallet, label: "Finance" },
  { icon: Plane, label: "Travel" },
  { icon: ShoppingCart, label: "Shopping" },
];

export function AgentDiagram() {
  return (
    <div className="mt-12 flex flex-col items-center">
      <div className="rounded-xl border border-accent bg-accent-soft px-5 py-2.5 text-[13.5px] font-semibold text-accent shadow-subtle">Head Agent</div>
      <div className="my-4 h-8 w-px bg-border" />
      <div className="flex w-full flex-wrap justify-center gap-3">
        {ACTIVE.map((a) => (
          <div key={a.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3">
            <a.icon className="h-4 w-4 text-accent" />
            <span className="text-[12px] font-medium text-foreground">{a.label}</span>
            <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-success">ACTIVE</span>
          </div>
        ))}
        {SOON.map((a) => (
          <div key={a.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-transparent px-4 py-3 opacity-70">
            <a.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium text-muted-foreground">{a.label}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground">SOON</span>
          </div>
        ))}
      </div>
    </div>
  );
}
