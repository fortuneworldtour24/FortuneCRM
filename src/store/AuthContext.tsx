/**
 * AuthContext — single source of truth for the authenticated session.
 *
 * Responsibilities:
 *  - Checks for an existing Supabase session on mount (no flash).
 *  - Subscribes to onAuthStateChange so tokens are refreshed automatically.
 *  - Exposes signIn / signUp / signOut methods that update state atomically.
 *  - `authLoading` is true only during the first session check; components
 *    should render a spinner or nothing until it resolves.
 *  - When `session` is null the app renders the Login screen.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  getSession,
  loadProfile,
  signIn as sbSignIn,
  signOut as sbSignOut,
  signUp as sbSignUp,
} from "@/lib/auth";
import type { Profile } from "@/types/database";

/* ------------------------------------------------------------------ */

interface AuthContextValue {
  session: Session | null;
  authUser: Profile | null;
  authLoading: boolean;
  supabaseReady: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    roleTitle: string
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // true until first check done

  /* ── 1. Restore session on mount ──────────────────────────────── */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const sess = await getSession();
      if (!mounted) return;

      if (sess?.user) {
        const profile = await loadProfile(sess.user);
        if (mounted) {
          setSession(sess);
          setAuthUser(profile);
        }
      }
      if (mounted) setAuthLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ── 2. Listen for token refresh / sign-out from other tabs ───── */
  useEffect(() => {
    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (event === "SIGNED_OUT" || !sess) {
          setSession(null);
          setAuthUser(null);
          return;
        }
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          sess.user
        ) {
          const profile = await loadProfile(sess.user);
          setSession(sess);
          setAuthUser(profile);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ── 3. Auth actions ───────────────────────────────────────────── */
  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const result = await sbSignIn(email, password);
      if (!result.ok) return result.error ?? "Sign in failed.";
      if (result.profile) setAuthUser(result.profile);
      return null;
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      roleTitle: string
    ): Promise<string | null> => {
      const result = await sbSignUp(email, password, fullName, roleTitle);
      if (!result.ok) return result.error ?? "Sign up failed.";
      if (result.profile) setAuthUser(result.profile);
      return null;
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    await sbSignOut();
    setSession(null);
    setAuthUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        authUser,
        authLoading,
        supabaseReady: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
