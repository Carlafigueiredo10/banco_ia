import type { SupabaseClient } from "@supabase/supabase-js";

// Extrai um IP "melhor esforço" dos headers (atrás do proxy da Vercel).
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "desconhecido";
}

// Chama a RPC SECURITY DEFINER. Retorna true se a submissão é permitida.
// Em caso de erro na RPC, NÃO bloqueia o usuário legítimo (fail-open) — o
// rate limit é defesa contra abuso casual, não a fronteira de integridade
// (essa são as CHECK do banco).
export async function checkRateLimit(
  supabase: SupabaseClient,
  ip: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", { p_ip: ip });
  if (error) return true;
  return data === true;
}
