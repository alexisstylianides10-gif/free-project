import { Bus, FileText, Hotel, Plane, ShieldAlert, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const SECTIONS = [
  { icon: Users, label: "Travelers", value: "84" },
  { icon: ShieldAlert, label: "Staff", value: "8" },
  { icon: Plane, label: "Flights", value: "2 grouped bookings" },
  { icon: Hotel, label: "Hotels", value: "1 block-booked" },
  { icon: Bus, label: "Transport", value: "3 coaches" },
  { icon: FileText, label: "Documents", value: "84 consent forms" },
  { icon: Wallet, label: "Payments", value: "€420 per student" },
];

export default function BusinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge tone="accent">Business Mode</Badge>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-foreground">School Trip — Paris</h1>
        <p className="text-[13.5px] text-muted-foreground">A dedicated dashboard for schools, teams, and organized groups.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">{s.label}</p>
              <p className="text-[14px] font-semibold text-foreground">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-[13.5px] font-semibold text-foreground">Emergency information</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Organizers can keep emergency contacts, medical notes, and staff assignments visible to every chaperone in one place — the same
          itinerary, expense, and people tools used for regular trips, scaled for large groups.
        </p>
      </Card>

      <Card className="border-dashed p-5 text-center">
        <p className="text-[13px] text-muted-foreground">
          Business Mode is an early preview. Full traveler rosters, staff permissions, and bulk document collection are coming soon.
        </p>
      </Card>
    </div>
  );
}
