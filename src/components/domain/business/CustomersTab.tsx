"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { BusinessCustomerStage, BusinessFeedbackKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputBase =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const STAGE_TONE: Record<BusinessCustomerStage, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  lead: "neutral",
  interviewed: "accent",
  trial: "warning",
  customer: "success",
  churned: "danger",
};

const FEEDBACK_KINDS: BusinessFeedbackKind[] = ["pain_point", "feature_request", "objection", "praise", "other"];

export function CustomersTab({ businessId }: { businessId: string }) {
  const businessCustomers = useAlxioum((s) => s.businessCustomers);
  const businessFeedback = useAlxioum((s) => s.businessFeedback);
  const addBusinessCustomer = useAlxioum((s) => s.addBusinessCustomer);
  const addBusinessFeedback = useAlxioum((s) => s.addBusinessFeedback);

  const customers = useMemo(() => businessCustomers.filter((c) => c.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [businessCustomers, businessId]);
  const feedback = useMemo(() => businessFeedback.filter((f) => f.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [businessFeedback, businessId]);

  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerStage, setCustomerStage] = useState<BusinessCustomerStage>("lead");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<BusinessFeedbackKind>("pain_point");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const mostCommonFeedbackKind = useMemo(() => {
    if (feedback.length === 0) return null;
    const counts = new Map<string, number>();
    for (const f of feedback) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [feedback]);

  async function saveCustomer() {
    if (!customerName.trim()) return;
    setSavingCustomer(true);
    await addBusinessCustomer({ businessId, name: customerName.trim(), stage: customerStage });
    setCustomerName("");
    setCustomerStage("lead");
    setCustomerOpen(false);
    setSavingCustomer(false);
  }

  async function saveFeedback() {
    if (!feedbackContent.trim()) return;
    setSavingFeedback(true);
    await addBusinessFeedback({ businessId, kind: feedbackKind, content: feedbackContent.trim() });
    setFeedbackContent("");
    setFeedbackOpen(false);
    setSavingFeedback(false);
  }

  return (
    <div className="space-y-5">
      {feedback.length > 0 && mostCommonFeedbackKind && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-1 text-[13px] font-semibold text-foreground">Customer Insights</p>
            <p className="text-[12.5px] text-muted-foreground">
              Most common feedback: <span className="font-medium text-foreground">{mostCommonFeedbackKind[0].replace(/_/g, " ")}</span> ({mostCommonFeedbackKind[1]} mention{mostCommonFeedbackKind[1] > 1 ? "s" : ""})
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Customers ({customers.length})</p>
          <button onClick={() => setCustomerOpen((v) => !v)} className="flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {customerOpen && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/70 p-3">
            <input className={cn(inputBase, "min-w-0 flex-1")} placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <select className={inputBase} value={customerStage} onChange={(e) => setCustomerStage(e.target.value as BusinessCustomerStage)}>
              {(["lead", "interviewed", "trial", "customer", "churned"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={saveCustomer} disabled={!customerName.trim() || savingCustomer}>
              {savingCustomer && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </div>
        )}
        {customers.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No customers recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                <span className="text-[13px] text-foreground">{c.name}</span>
                <Badge tone={STAGE_TONE[c.stage]}>{c.stage}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Feedback</p>
          <button onClick={() => setFeedbackOpen((v) => !v)} className="flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {feedbackOpen && (
          <div className="mb-3 space-y-2 rounded-lg border border-border/70 p-3">
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setFeedbackKind(k)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11.5px] font-medium capitalize",
                    feedbackKind === k ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {k.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <textarea className={cn(inputBase, "min-h-[60px] w-full resize-none")} placeholder="What did they say?" value={feedbackContent} onChange={(e) => setFeedbackContent(e.target.value)} />
            <Button size="sm" onClick={saveFeedback} disabled={!feedbackContent.trim() || savingFeedback} className="w-full justify-center">
              {savingFeedback && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </div>
        )}
        {feedback.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No feedback recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {feedback.map((f) => (
              <div key={f.id} className="rounded-lg border border-border/70 px-3 py-2">
                <Badge tone="neutral" className="mb-1 capitalize">
                  {f.kind.replace(/_/g, " ")}
                </Badge>
                <p className="text-[12.5px] text-foreground">{f.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
