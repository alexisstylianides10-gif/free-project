"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";

const inputBase =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const FIELDS: { key: "revenue" | "expenses" | "customers" | "mrr" | "orders" | "conversionRate" | "visitors" | "leads" | "trials"; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "expenses", label: "Expenses" },
  { key: "customers", label: "Customers" },
  { key: "mrr", label: "MRR" },
  { key: "orders", label: "Orders" },
  { key: "conversionRate", label: "Conversion %" },
  { key: "visitors", label: "Visitors" },
  { key: "leads", label: "Leads" },
  { key: "trials", label: "Trials" },
];

export function MoneyTab({ businessId, currency }: { businessId: string; currency: string }) {
  const businessMetrics = useAlxioum((s) => s.businessMetrics);
  const addBusinessMetric = useAlxioum((s) => s.addBusinessMetric);

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const metrics = useMemo(() => businessMetrics.filter((m) => m.businessId === businessId).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)), [businessMetrics, businessId]);
  const latest = metrics[metrics.length - 1];

  const thisMonth = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const rows = metrics.filter((m) => m.recordedAt.startsWith(monthPrefix));
    const sum = (key: "revenue" | "expenses") => rows.reduce((s, r) => s + (r[key] ?? 0), 0);
    return { revenue: sum("revenue"), expenses: sum("expenses") };
  }, [metrics]);

  const funnel = latest ? [
    { label: "Visitors", value: latest.visitors ?? 0 },
    { label: "Leads", value: latest.leads ?? 0 },
    { label: "Trials", value: latest.trials ?? 0 },
    { label: "Customers", value: latest.customers ?? 0 },
  ] : [];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  async function save() {
    setSaving(true);
    const payload: Record<string, number> = {};
    for (const f of FIELDS) {
      const raw = form[f.key];
      if (raw !== undefined && raw !== "") payload[f.key] = Number(raw);
    }
    await addBusinessMetric({ businessId, ...payload });
    setForm({});
    setOpen(false);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue this month" value={`${thisMonth.revenue} ${currency}`} />
        <Stat label="Expenses this month" value={`${thisMonth.expenses} ${currency}`} />
        <Stat label="Profit this month" value={`${thisMonth.revenue - thisMonth.expenses} ${currency}`} />
        <Stat label="Customers" value={String(latest?.customers ?? 0)} />
      </div>

      {funnel.some((f) => f.value > 0) && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-[13px] font-semibold text-foreground">Funnel (latest)</p>
            <div className="space-y-2.5">
              {funnel.map((f) => (
                <div key={f.label}>
                  <div className="mb-0.5 flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>{f.label}</span>
                    <span className="tabular-nums">{f.value}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(f.value / maxFunnel) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="w-full justify-center">
          <Plus className="h-3.5 w-3.5" /> Record this month&apos;s numbers
        </Button>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[13px] font-semibold text-foreground">Record numbers</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</label>
                  <input
                    type="number"
                    className={cn(inputBase, "w-full")}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((f2) => ({ ...f2, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 justify-center">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="flex-1 justify-center">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">History</p>
          {[...metrics].reverse().slice(0, 10).map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">{new Date(m.recordedAt).toLocaleDateString()}</span>
              <span className="text-foreground">
                {m.revenue !== undefined ? `${m.revenue} ${currency} revenue` : ""}
                {m.customers !== undefined ? ` · ${m.customers} customers` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="truncate text-[15px] font-semibold text-foreground">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
