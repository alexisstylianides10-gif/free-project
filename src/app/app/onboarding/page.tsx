"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Share, Plus, Smartphone, Bot, Check, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { PricingGrid } from "@/components/billing/PricingGrid";
import { useAlxioum } from "@/lib/store";

const USE_CASES = ["Stay on top of my schedule", "Manage tasks & deadlines", "Remember things for me", "All of it"];

const DEMO_STEP_DURATIONS = [900, 1000, 1500, 2000, 1600];

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
  const searchParams = useSearchParams();
  const profile = useAlxioum((s) => s.profile);
  const updateProfile = useAlxioum((s) => s.updateProfile);
  const refreshAll = useAlxioum((s) => s.refreshAll);

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

  // Returning from Stripe Checkout (success or cancel) — resume where the
  // plan step left off instead of restarting the whole flow, and pick up
  // the freshly-set plan/trial state once the webhook has landed.
  useEffect(() => {
    const billing = searchParams.get("billing");
    const returnStep = searchParams.get("step");
    if (billing) {
      if (returnStep) setStep(Number(returnStep));
      if (billing === "success") refreshAll();
      router.replace("/app/onboarding");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    updateProfile({ name: name.trim() || profile?.name || "You", onboarded: true });
    router.replace("/app/today");
  }

  const steps = [
    <StepWelcome key="welcome" name={name} setName={setName} onNext={() => setStep(1)} />,
    <StepPlan key="plan" onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <StepUseCase key="use-case" useCase={useCase} setUseCase={setUseCase} onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <StepExamples key="examples" onNext={() => setStep(4)} onBack={() => setStep(2)} />,
    <StepInstall key="install" platform={platform} onFinish={finish} onBack={() => setStep(3)} />,
  ];

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className={`w-full ${step === 1 ? "max-w-4xl" : "max-w-md"}`}>
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

function StepPlan({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
      <h2 className="text-center text-[18px] font-semibold text-foreground">Choose your plan</h2>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        Paid plans start with a 3-day free trial — cancel anytime before it ends and you won&apos;t be charged.
      </p>
      <div className="mt-6">
        <PricingGrid mode="onboarding" onFreeSelect={onNext} returnPath="/app/onboarding?step=2" />
      </div>
      <div className="mt-5 flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
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
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDemoStep((s) => (s + 1) % 5), DEMO_STEP_DURATIONS[demoStep]);
    return () => clearTimeout(t);
  }, [demoStep]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-[16px] font-semibold text-foreground">Just tell it what you need.</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Watch how a request becomes a confirmed action:</p>

      <div className="mt-4 min-h-[168px] rounded-xl border border-border bg-background p-3">
        <div className="space-y-2.5">
          <AnimatePresence>
            {demoStep >= 0 && (
              <motion.div key="u" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl bg-accent px-3 py-1.5 text-[12.5px] text-accent-foreground">Schedule tennis Friday at 6.</span>
              </motion.div>
            )}
            {demoStep >= 1 && demoStep < 3 && (
              <motion.div key="c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-1 rounded-xl border border-accent/30 bg-accent-soft/40 p-2.5">
                <p className="text-[12px] text-foreground">Create &ldquo;Tennis&rdquo; — Friday, 6:00–7:00 PM?</p>
                <div className="mt-1.5 flex gap-1.5">
                  <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-accent-foreground transition-colors ${demoStep === 2 ? "bg-accent" : "bg-accent/90"}`}>
                    <Check className="h-2.5 w-2.5" /> Confirm
                  </span>
                  <span className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <X className="h-2.5 w-2.5" /> Cancel
                  </span>
                </div>
              </motion.div>
            )}
            {demoStep >= 3 && (
              <motion.div key="d" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                  <Bot className="h-3 w-3 text-accent" />
                </div>
                <span className="max-w-[85%] rounded-2xl border border-border bg-surface px-3 py-1.5 text-[12.5px] text-foreground">Done — tennis is on your calendar Friday at 6.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Anything that creates, changes, or deletes something always asks you to confirm first — nothing happens silently.
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

const IOS_STEPS = [
  <>In Safari, tap the Share icon — on iPhone it&apos;s at the bottom of the screen, on iPad it&apos;s at the top right.</>,
  <>Scroll down the share menu and tap <b>Add to Home Screen</b>.</>,
  <>Tap <b>Add</b> (top right). Alxioum now opens full-screen like a real app — no Safari address bar.</>,
];

const ANDROID_STEPS = [
  <>Tap the menu in Chrome&apos;s toolbar.</>,
  <>Tap <b>Add to Home screen</b> (or <b>Install app</b>).</>,
  <>Confirm. Alxioum now opens like an app, full-screen.</>,
];

function StepInstall({ platform, onFinish, onBack }: { platform: Platform; onFinish: () => void; onBack: () => void }) {
  const stepsForPlatform = platform === "android" ? ANDROID_STEPS : IOS_STEPS;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (platform === "desktop") return;
    const t = setTimeout(() => setActive((a) => (a + 1) % stepsForPlatform.length), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, platform]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.5 }}>
          <Smartphone className="h-4 w-4 text-accent" />
        </motion.span>
        <h2 className="text-[16px] font-semibold text-foreground">
          {platform === "ios" ? "Put Alxioum on your iPhone or iPad home screen" : platform === "android" ? "Put Alxioum on your home screen" : "Put Alxioum on your home screen"}
        </h2>
      </div>

      {platform !== "desktop" && (
        <ol className="space-y-2">
          {stepsForPlatform.map((s, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                active === i ? "border-accent/40 bg-accent-soft/40" : "border-transparent"
              }`}
            >
              <motion.div
                animate={active === i ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.8, repeat: active === i ? Infinity : 0 }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  active === i ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </motion.div>
              <span className="text-[13.5px] text-foreground">{s}</span>
            </li>
          ))}
        </ol>
      )}

      {platform === "desktop" && (
        <div className="space-y-2 text-[13.5px] text-foreground">
          <p>
            On <b>iPhone or iPad</b>: open <span className="font-mono text-[12.5px]">{typeof window !== "undefined" ? window.location.host : "your Alxioum link"}</span> in
            Safari, tap the Share icon <Share className="inline h-3.5 w-3.5 align-text-bottom" />, then <b>Add to Home Screen</b>.
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
