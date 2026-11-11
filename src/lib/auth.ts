/**
 * Supabase Auth helpers
 * All auth operations are centralised here — no other file imports
 * @supabase/supabase-js for auth concerns.
 */

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Super Admin seed — hardcoded fallback recognition                   */
/* ------------------------------------------------------------------ */
export const SUPER_ADMIN_EMAIL = "avitechtube@gmail.com";
export const SUPER_ADMIN_NAME  = "Avinash Bharti";
export const SUPER_ADMIN_TITLE = "Primary Super Admin";

/** Returns true if the given email is the hardcoded primary super-admin. */
export function isSuperAdmin(email: string | null | undefined): boolean {
  return email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Avatar colours                                                      */
/* ------------------------------------------------------------------ */
const STAFF_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
  "from-sky-400 to-blue-600",
];

function colorFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return STAFF_COLORS[h % STAFF_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Profile loading                                                     */
/* ------------------------------------------------------------------ */

/** Load (or synthesise) the CRM Profile row for the authenticated user. */
export async function loadProfile(user: User): Promise<Profile> {
  // Always force super-admin role for the primary email,
  // regardless of what the DB row says.
  const superAdmin = isSuperAdmin(user.email);

  if (!supabase) {
    return fallbackProfile(user, superAdmin);
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      return {
        id:           String(data.id),
        full_name:    superAdmin ? SUPER_ADMIN_NAME : (data.full_name ?? user.email ?? "Staff member"),
        email:        data.email ?? user.email ?? "",
        role:         superAdmin ? "admin" : (data.role === "admin" ? "admin" : "staff"),
        title:        superAdmin ? SUPER_ADMIN_TITLE : (data.title ?? data.role_title ?? "Consultant"),
        avatar_color: data.avatar_color ?? colorFor(user.id),
        avatar_url:   data.avatar_url ?? undefined,
        status:       "online",
        suspended:    superAdmin ? false : data.is_active === false,
      };
    }
  } catch {
    /* fall through to synthesised profile */
  }

  return fallbackProfile(user, superAdmin);
}

function fallbackProfile(user: User, superAdmin: boolean): Profile {
  const meta = user.user_metadata as Record<string, string> | undefined;
  return {
    id:           user.id,
    full_name:    superAdmin ? SUPER_ADMIN_NAME : (meta?.full_name ?? user.email?.split("@")[0] ?? "Agent"),
    email:        user.email ?? "",
    role:         superAdmin ? "admin" : "staff",
    title:        superAdmin ? SUPER_ADMIN_TITLE : (meta?.role_title ?? "Consultant"),
    avatar_color: colorFor(user.id),
    status:       "online",
    suspended:    false,
  };
}

/* ------------------------------------------------------------------ */
/*  Session                                                             */
/* ------------------------------------------------------------------ */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Sign-in / Sign-up / Sign-out                                       */
/* ------------------------------------------------------------------ */
export interface SignInResult {
  ok: boolean;
  error?: string;
  profile?: Profile;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Sign in failed." };
  }
  const profile = await loadProfile(data.user);
  return { ok: true, profile };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  roleTitle: string,
  roleValue: Role = "staff",
): Promise<SignInResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim(), role_title: roleTitle.trim() } },
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Sign up failed." };
  }

  /* Upsert the CRM profile row with the chosen role */
  const color = colorFor(data.user.id);
  try {
    await supabase.from("profiles").upsert(
      {
        id:           data.user.id,
        full_name:    fullName.trim(),
        email:        email.trim(),
        role:         roleValue,
        title:        roleTitle.trim() || "Consultant",
        avatar_color: color,
        status:       "online",
        is_active:    true,
      },
      { onConflict: "id" }
    );
  } catch {
    /* non-fatal */
  }

  const profile: Profile = {
    id:           data.user.id,
    full_name:    fullName.trim(),
    email:        email.trim(),
    role:         roleValue,
    title:        roleTitle.trim() || "Consultant",
    avatar_color: color,
    status:       "online",
    suspended:    false,
  };

  return { ok: true, profile };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
}

/** Promote or demote any existing team member's role in Supabase. */
export async function updateMemberRole(memberId: string, newRole: Role): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", memberId);
    return !error;
  } catch {
    return false;
  }
}
