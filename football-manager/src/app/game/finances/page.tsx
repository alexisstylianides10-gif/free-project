"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGame, useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Empty, Input, KV, Stat } from "@/components/ui/misc";
import { PageTitle } from "@/components/game/common";
import { financialAlerts, forecast, takeBankLoan, weeklyWageBill } from "@/engine/finance/ledger";
import { date, label, money, wage } from "@/lib/format";

const tip = { contentStyle: { background: "#0e131a", border: "1px solid #212b38", fontSize: 12 }, formatter: (v: unknown) => money(Number(v ?? 0)) };

export default function FinancesPage() {
  const world = useWorld();
  const mutate = useGame((s) => s.mutate);
  const toast = useGame((s) => s.toast);
  const club = world.clubs[world.meta.userClubId];
  const f = club.finance;
  const wages = weeklyWageBill(world, club.id);
  const fc = useMemo(() => forecast(world, club.id), [world, club.id, world.meta.currentDate, f.balance]); // eslint-disable-line react-hooks/exhaustive-deps
  const alerts = financialAlerts(world, club.id);
  const [cat, setCat] = useState("all");
  const [loanAmt, setLoanAmt] = useState(5_000_000);
  const [loanYears, setLoanYears] = useState(5);
  const [shift, setShift] = useState(1_000_000);
  const txs = world.transactions.filter((t) => t.clubId === club.id && (cat === "all" || t.category === cat)).slice(-300).reverse();
  const cats = Array.from(new Set(world.transactions.filter((t) => t.clubId === club.id).map((t) => t.category)));
  const breakdown = Array.from(new Set([...Object.keys(f.revenueSeason), ...Object.keys(f.expenseSeason)])).map((k) => ({ name: label(k), income: f.revenueSeason[k] ?? 0, expense: f.expenseSeason[k] ?? 0 })).sort((a, b) => b.income + b.expense - (a.income + a.expense));
  const income = Object.values(f.revenueSeason).reduce((a, b) => a + b, 0);
  const expense = Object.values(f.expenseSeason).reduce((a, b) => a + b, 0);
  const transferToWage = (amount: number) => mutate(() => {
    const weekly = Math.round(amount / 52);
    if (amount > 0 && amount > f.transferBudget) { toast("Not enough transfer budget.", "warn"); return; }
    if (amount < 0 && -weekly > f.wageBudget - wages.players) { toast("That would put the wage bill over budget.", "warn"); return; }
    f.transferBudget -= amount;
    f.wageBudget += weekly;
    toast("Budgets adjusted.", "success");
  });
  return (
    <div className="space-y-4">
      <PageTitle title="Finances" sub="Every financial movement is recorded in the ledger; balances always reconcile." />
      {alerts.length ? <div className="space-y-1">{alerts.map((a) => <div key={a} className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">{a}</div>)}</div> : null}
      <Card><CardBody className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Balance" value={money(f.balance)} tone={f.balance < 0 ? "danger" : "accent"} sub={`Overdraft limit ${money(f.overdraftLimit)}`} />
        <Stat label="Transfer budget" value={money(f.transferBudget)} />
        <Stat label="Wage budget" value={wage(f.wageBudget)} sub={`Using ${wage(wages.players)}`} />
        <Stat label="Staff wages" value={wage(wages.staff)} />
        <Stat label="Season income" value={money(income)} tone="accent" />
        <Stat label="Season expenses" value={money(expense)} tone="danger" sub={`Debt ${money(f.debt)}`} />
      </CardBody></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="12-month forecast" />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={fc}><CartesianGrid stroke="#212b38" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#8b9bb0" fontSize={10} /><YAxis stroke="#8b9bb0" fontSize={10} tickFormatter={(v) => money(v)} width={70} /><Tooltip {...tip} /><Line dataKey="balance" stroke="#22d38b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="This season by category" />
          <CardBody className="h-64">
            {breakdown.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={breakdown.slice(0, 10)} layout="vertical"><CartesianGrid stroke="#212b38" strokeDasharray="3 3" /><XAxis type="number" stroke="#8b9bb0" fontSize={10} tickFormatter={(v) => money(v)} /><YAxis type="category" dataKey="name" stroke="#8b9bb0" fontSize={10} width={120} /><Tooltip {...tip} /><Bar dataKey="income" fill="#22d38b" /><Bar dataKey="expense" fill="#ef5350" /></BarChart></ResponsiveContainer> : <Empty title="No transactions this season yet" />}
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-auto">
          <CardHeader title="Ledger" action={<Select label="Category" value={cat} onChange={setCat} options={[{ value: "all", label: "All categories" }, ...cats.map((c) => ({ value: c, label: label(c) }))]} className="w-48" />} />
          {txs.length === 0 ? <Empty title="No transactions" /> : (
            <div className="max-h-[480px] overflow-auto">
              <table className="tbl" data-testid="ledger"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="num">Amount</th><th className="num">Balance</th></tr></thead>
                <tbody>{txs.map((t) => <tr key={t.id}><td className="whitespace-nowrap text-xs">{date(t.date)}</td><td className="text-sm">{t.description}</td><td className="text-xs text-muted">{label(t.category)}</td><td className={`num ${t.amount >= 0 ? "text-accent" : "text-danger"}`}>{money(t.amount)}</td><td className="num text-muted">{money(t.balanceAfter)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Budget adjustment" />
            <CardBody className="space-y-2">
              <Input type="number" step={500_000} value={shift} onChange={(e) => setShift(Number(e.target.value))} aria-label="Amount" />
              <div className="flex gap-2"><Button size="sm" onClick={() => transferToWage(shift)}>Transfer → wages</Button><Button size="sm" onClick={() => transferToWage(-shift)}>Wages → transfer</Button></div>
              <p className="text-xs text-muted">{money(shift)} of transfer budget ≈ {wage(Math.round(shift / 52))} of wage budget.</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Bank loans" />
            <CardBody className="space-y-2">
              {f.loans.map((l) => <KV key={l.id} k={`${money(l.principal)} at ${(l.interestRate * 100).toFixed(1)}%`} v={`${money(l.remaining)} left · ${money(l.monthlyPayment)}/m`} />)}
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step={1_000_000} value={loanAmt} onChange={(e) => setLoanAmt(Number(e.target.value))} aria-label="Loan amount" />
                <Select value={String(loanYears)} onChange={(v) => setLoanYears(Number(v))} options={[1, 2, 3, 5, 7, 10].map((y) => ({ value: String(y), label: `${y} years` }))} />
              </div>
              <Button size="sm" onClick={() => { if (confirm(`Borrow ${money(loanAmt)} over ${loanYears} years?`)) { const r = mutate((w) => takeBankLoan(w, club.id, loanAmt, loanYears)); toast(r.message, r.ok ? "success" : "error"); } }}>Apply for loan</Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
