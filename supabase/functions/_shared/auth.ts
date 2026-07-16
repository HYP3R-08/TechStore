/**
 * Caller identification for Edge Functions.
 *
 * Supabase verifies the JWT before a function runs, but that check is satisfied
 * by the anon key — which ships inside the public browser bundle. So "the JWT is
 * valid" means "the caller found our public key", not "the caller is signed in",
 * and certainly not "the caller is an admin". Every function that does anything
 * privileged has to establish who is calling, here.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

/** Service-role client: bypasses RLS. Never hand this to anything user-supplied. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

export interface Caller {
  id: string;
  email: string | null;
}

/** Resolves the signed-in user from the Authorization header, or null. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length);
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/** True only if the caller's profile row actually carries the admin role. */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return false;
  return data?.role === 'admin';
}
