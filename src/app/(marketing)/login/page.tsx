"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { useAlxioum, backendConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();

  const authStatus = useAlxioum((s) => s.authStatus);
  const authError = useAlxioum((s) => s.authError);
  const signInWithGoogle = useAlxioum((s) => s.signInWithGoogle);
  const initAuth = useAlxioum((s) => s.initAuth);

  useEffect(() => {
    if (backendConfigured) initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authStatus === "signed_in") {
      router.replace(params.get("next") || "/app/today");
    }
  }, [authStatus, params, router]);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Alxioum</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">One tap, no passwords, no emails to check.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          {authError && <p className="mt-3 text-center text-[12.5px] text-danger">{authError}</p>}
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            Your account starts empty — Alxioum only acts on what you actually add or tell it.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.8 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.9 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
