"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Share, Plus, MoreVertical, Smartphone } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";

const USE_CASES = ["Stay on top of my schedule", "Manage tasks & deadlines", "Remember things for me", "All of it"];

const EXAMPLE_COMMANDS = [
  "Schedule tennis Friday at 6.",
  "What's on my calendar tomorrow?",
  "Create a task to study tonight.",
  "Remember that I prefer morning meetings.",
];

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useAlxioum((s) => s.profile);
  const updateProfile = useAlxioum((s) => s.updateProfile);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  function finish() {
    updateProfile({ name: name.trim() || profile?.name || "You", onboarded: true });
    router.replace("/app/today");
  }

  const steps = [
    <StepWelcome key="welcome" name={name} setName={setName} onNext={() => setStep(1)} />,
    <StepUseCase key="use-case" useCase={useCase} setUseCase={setUseCase} onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <StepExamples key="examples" onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <StepInstall key="install" platform={platform} onFinish={finish} onBack={() => setStep(2)} />,
  ];

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Alxioum</span>
        </div>
        <div className="mb-6 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-muted"}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

function StepWelcome({ name, setName, onNext }: { name: string; setName: (v: string) => void; onNext: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
      <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Welcome to Alxioum</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">AI that doesn&apos;t just answer. It acts. What should we call you?</p>
      <input autoFocus className={`${inputClass} mt-4`} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button className="mt-4 w-full" onClick={onNext} disabled={!name.trim()}>
        Continue
      </Button>
    </div>
  );
}

function StepUseCase({ useCase, setUseCase, onNext, onBack }: { useCase: string | null; setUseCase: (v: string) => void; onNext: () => void; onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-[16px] font-semibold text-foreground">What do you want Alxioum to help with most?</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">This just helps us tailor tips — nothing is locked in.</p>
      <div className="mt-4 space-y-2">
        {USE_CASES.map((c) => (
          <button
            key={c}
            onClick={() => setUseCase(c)}
            className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors ${
              useCase === c ? "border-accent bg-accent-soft text-accent" : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!useCase}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function StepExamples({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-[16px] font-semibold text-foreground">Alxioum works best when you just tell it what you need.</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Try things like:</p>
      <div className="mt-3 space-y-2">
        {EXAMPLE_COMMANDS.map((c) => (
          <div key={c} className="rounded-lg bg-muted px-3 py-2 text-[13px] text-foreground">
            &ldquo;{c}&rdquo;
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Anything that creates, changes, or deletes something will always ask you to confirm first.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function StepInstall({ platform, onFinish, onBack }: { platform: Platform; onFinish: () => void; onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-accent" />
        <h2 className="text-[16px] font-semibold text-foreground">
          {platform === "ios" ? "Put Alxioum on your iPhone or iPad home screen" : "Put Alxioum on your home screen"}
        </h2>
      </div>

      {platform === "ios" && (
        <ol className="space-y-2.5 text-[13.5px] text-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-accent">1.</span> In Safari, tap the Share icon <Share className="inline h-3.5 w-3.5 align-text-bottom" /> — on iPhone it&apos;s at the bottom of the screen, on iPad it&apos;s at the top right.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-accent">2.</span> Scroll down the share menu and tap <b>Add to Home Screen</b>.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-accent">3.</span> Tap <b>Add</b> (top right). Alxioum now appears on your home screen and opens full-screen like a real app — no Safari address bar.
          </li>
        </ol>
      )}
      {platform === "android" && (
        <ol className="space-y-2.5 text-[13.5px] text-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-accent">1.</span> Tap the menu <MoreVertical className="inline h-3.5 w-3.5 align-text-bottom" /> in Chrome&apos;s toolbar.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-accent">2.</span> Tap <b>Add to Home screen</b> (or <b>Install app</b>).
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-accent">3.</span> Confirm. Alxioum now opens like an app, full-screen.
          </li>
        </ol>
      )}
      {platform === "desktop" && (
        <div className="space-y-2 text-[13.5px] text-foreground">
          <p>
            On <b>iPhone or iPad</b>: open <span className="font-mono text-[12.5px]">alxioum-production.up.railway.app</span> in Safari, tap the Share
            icon <Share className="inline h-3.5 w-3.5 align-text-bottom" />, then <b>Add to Home Screen</b>.
          </p>
          <p className="text-muted-foreground">
            On Android: tap <Plus className="inline h-3.5 w-3.5 align-text-bottom" /> <b>Install app</b> from Chrome&apos;s menu.
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={onFinish}>
          Go to My Day
        </Button>
      </div>
    </div>
  );
}
