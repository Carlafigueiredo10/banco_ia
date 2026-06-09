import { createClient } from "@supabase/supabase-js";

// Cliente anônimo stateless (role anon) para rotas server-side públicas
// (ex.: POST /api/submissao). Não persiste sessão. NUNCA usa service role.
export function createSupabaseAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
