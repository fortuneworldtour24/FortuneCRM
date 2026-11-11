import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

export async function fetchTable<T>(table: string): Promise<T[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(table).select("*").order("created_at", { ascending: false }).limit(500);
    if (error || !data || data.length === 0) return null;
    return data as unknown as T[];
  } catch { return null; }
}

export async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  try { await supabase.from(table).insert(row); } catch { /* offline */ }
}

export async function patchRow(table: string, id: string, patch: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  try { await supabase.from(table).update(patch).eq("id", id); } catch { /* offline */ }
}

export async function deleteRow(table: string, id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from(table).delete().eq("id", id); } catch { /* offline */ }
}
