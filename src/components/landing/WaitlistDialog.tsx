"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setErrorMsg("Enter a valid email address.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("waitlist").insert({ email: email.trim().toLowerCase() });
      if (error && error.code !== "23505") {
        // 23505 = unique_violation -> already on the list, treat as success.
        setStatus("error");
        setErrorMsg("Something went wrong. Try again in a moment.");
        return;
      }
    }

    setStatus("done");
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTimeout(() => {
        setStatus("idle");
        setEmail("");
        setErrorMsg("");
      }, 200);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0a0a12] p-7 shadow-[0_0_80px_-10px_rgba(124,109,255,0.35)] data-[state=open]:animate-scale-in"
          aria-describedby={undefined}
        >
          <Dialog.Close className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <AnimatePresence mode="wait">
            {status === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center px-2 py-6 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7c6dff]/15">
                  <Check className="h-6 w-6 text-[#9f8cff]" />
                </div>
                <Dialog.Title className="mt-4 text-lg font-semibold text-white">You&apos;re on the list</Dialog.Title>
                <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-white/50">
                  We&apos;ll email you the moment Alxioum is ready for you.
                </Dialog.Description>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Dialog.Title className="text-lg font-semibold tracking-tight text-white">
                  Join the Alxioum waitlist
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-white/50">
                  Be first in line when we open access. No spam — just one email when it&apos;s your turn.
                </Dialog.Description>
                <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5">
                  <input
                    autoFocus
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#7c6dff]/60"
                  />
                  {status === "error" && <p className="text-[12.5px] text-red-400">{errorMsg}</p>}
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#8f80ff] to-[#6a5aef] text-[14px] font-medium text-white shadow-[0_0_24px_-4px_rgba(124,109,255,0.6)] transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Joining...
                      </>
                    ) : (
                      "Join the waitlist"
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
