import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL ?? "",
  key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const publicConfigured = Boolean(url && key);
const client = publicConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
export async function readPublicDocument(id: string) {
  if (!client) throw new Error("Viewer not configured");
  const { data, error } = await client
    .rpc("read_public_document", { p_public_id: id })
    .maybeSingle();
  if (error) throw error;
  return data as { payload: unknown } | null;
}
