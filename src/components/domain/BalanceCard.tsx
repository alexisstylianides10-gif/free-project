import { Balance } from "@/lib/expenses";
import { Avatar } from "@/components/ui/Avatar";
import { formatMoney } from "@/lib/utils";

export function BalanceCard({ balances, currency }: { balances: Balance[]; currency: string }) {
  if (balances.length === 0) {
    return <p className="py-6 text-center text-[13px] text-muted-foreground">You&apos;re all settled up.</p>;
  }

  const youOwe = balances.filter((b) => b.amount < 0);
  const owedToYou = balances.filter((b) => b.amount > 0);

  return (
    <div className="space-y-2">
      {youOwe.map((b) => (
        <div key={b.member.id} className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-soft/40 p-3">
          <Avatar initials={b.member.avatarInitials} size="sm" />
          <p className="flex-1 text-[13.5px] text-foreground">
            You owe <span className="font-semibold">{b.member.name}</span>
          </p>
          <span className="text-[14px] font-semibold text-danger">{formatMoney(Math.abs(b.amount), currency)}</span>
        </div>
      ))}
      {owedToYou.map((b) => (
        <div key={b.member.id} className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-soft/40 p-3">
          <Avatar initials={b.member.avatarInitials} size="sm" />
          <p className="flex-1 text-[13.5px] text-foreground">
            <span className="font-semibold">{b.member.name}</span> owes you
          </p>
          <span className="text-[14px] font-semibold text-success">{formatMoney(b.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}
