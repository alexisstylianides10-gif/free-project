"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  // True only while a profile fetch for a *newly-seen* user id is in
  // flight (initial sign-in, a user switch). Deliberately NOT set for
  // TOKEN_REFRESHED/USER_UPDATED-style events on an already-known user id
  // — those fire routinely (e.g. every token refresh) for an already-
  // rendering, already-authenticated screen and must never flip this true,
  // or every such screen would flash a loading state it didn't have before.
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  // Tracks the last user id we've already kicked off (or completed) a
  // profile load for, so onAuthStateChange can tell "this is a genuinely
  // new sign-in" apart from "this is a routine re-fire (token refresh,
  // user-metadata update, etc.) for the user we already have."
  const lastUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    // Staleness guard: a newer sign-in (or a sign-out) may have superseded
    // this fetch while it was in flight — e.g. User A signs in, their
    // profile fetch starts, User A signs out, User B signs in and their
    // (faster) fetch resolves and correctly sets `profile` for User B. If
    // User A's stale fetch were allowed to land unconditionally afterward,
    // it would clobber User B's already-correct profile with User A's data
    // even though `user` in context is still (correctly) User B. Comparing
    // against `lastUserIdRef.current` at *resolve* time (not at call time,
    // when this closure's `userId` argument was captured) catches this:
    // only write if this fetch is still the one that matters. Harmless
    // no-op for the common case (nothing raced), since the ref still equals
    // `userId` whenever no newer sign-in/sign-out has happened meanwhile.
    if (lastUserIdRef.current !== userId) return;
    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const initialUserId = data.session?.user?.id ?? null;
      setUser(data.session?.user ?? null);
      lastUserIdRef.current = initialUserId;
      if (initialUserId) {
        loadProfile(initialUserId).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Fires on every auth event, not just the first: SIGNED_IN, SIGNED_OUT,
    // TOKEN_REFRESHED (routinely, on a timer, for an already-authenticated
    // session), USER_UPDATED, etc. `loading` only ever gets set by the
    // effect above, so a fresh sign-in landing here (e.g. login/page.tsx's
    // own router.push("/app") racing this handler's own profile fetch)
    // previously left `loading === false` while `profile` was still null —
    // the exact regression QA caught. `profileLoading` closes that gap by
    // tracking this handler's own in-flight fetch, but only when the user
    // id actually changed, so routine same-user events (token refresh)
    // never toggle it and never flicker an already-rendered screen.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUser(session?.user ?? null);

      if (!nextUserId) {
        lastUserIdRef.current = null;
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if (nextUserId !== lastUserIdRef.current) {
        // New sign-in or a different user than the one we last loaded —
        // this is the case the previous fix's `loading` check missed.
        lastUserIdRef.current = nextUserId;
        setProfileLoading(true);
        loadProfile(nextUserId).finally(() => {
          // Only clear profileLoading if this fetch is still the current
          // one. If a *newer* sign-in has already superseded it (this
          // fetch's own userId no longer matches lastUserIdRef.current),
          // firing setProfileLoading(false) here would stomp the newer
          // sign-in's own still-in-flight profileLoading=true back to
          // false while its fetch hasn't resolved yet — which would let
          // app/layout.tsx's `!profile` fallback flash for the *new*,
          // perfectly healthy user during that window. The newer sign-in's
          // own `.finally` is responsible for clearing profileLoading once
          // *it* resolves.
          if (lastUserIdRef.current === nextUserId) {
            setProfileLoading(false);
          }
        });
      } else {
        // Same user as already loaded (token refresh, user-updated, a
        // duplicate INITIAL_SESSION fire, etc.) — refresh in the
        // background to stay fresh, but never toggle profileLoading for
        // it, so no already-rendering authenticated screen flickers.
        loadProfile(nextUserId);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
