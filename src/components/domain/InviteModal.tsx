"use client";

import { useState } from "react";
import { Check, Copy, Link as LinkIcon, Mail, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Trip } from "@/lib/types";
import { inviteCode } from "@/lib/trips";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export function InviteModal({
  open,
  onOpenChange,
  trip,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onInvite: (input: { name: string; email?: string }) => void;
}) {
  const [tab, setTab] = useState<"link" | "email" | "username">("link");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [copied, setCopied] = useState(false);

  const code = inviteCode(trip);
  const shareLink = `triply.app/join/${code}`;

  function copyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function submitInvite() {
    if (!name.trim()) return;
    onInvite({ name: name.trim(), email: contact.trim() || undefined });
    setName("");
    setContact("");
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Invite travelers" description={`Bring your group into ${trip.name}.`}>
      <div className="space-y-4">
        <div className="flex rounded-lg bg-muted p-1">
          {[
            { key: "link" as const, label: "Link", icon: LinkIcon },
            { key: "email" as const, label: "Email", icon: Mail },
            { key: "username" as const, label: "Username", icon: User },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12.5px] font-medium transition-colors ${
                tab === t.key ? "bg-surface text-foreground shadow-subtle" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "link" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
              <span className="flex-1 truncate text-[13px] text-foreground">{shareLink}</span>
              <button onClick={copyLink} className="flex items-center gap-1 text-[12.5px] font-medium text-accent">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[12.5px] text-muted-foreground">Anyone with this link can join as a traveler. Invite code: <span className="font-semibold text-foreground">{code}</span></p>
          </div>
        )}

        {(tab === "email" || tab === "username") && (
          <div className="space-y-2.5">
            <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input
              className={inputClass}
              placeholder={tab === "email" ? "Email address" : "Username"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <Button className="w-full" onClick={submitInvite}>
              Send invite
            </Button>
            <p className="text-[12px] text-muted-foreground">Demo mode: invited travelers are added to the trip immediately.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
