-- Remove os grants default amplos do Supabase e concede só o mínimo necessário.
revoke all on public.submissoes from authenticated;
revoke all on public.admins    from authenticated;
revoke all on public.auditoria from authenticated;

-- admin (authenticated): lê e edita submissões (curadoria/anonimização); sem INSERT/DELETE/TRUNCATE.
grant select, update on public.submissoes to authenticated;
-- gestão de admins: lê e convida (sem update/delete).
grant select, insert on public.admins to authenticated;
-- auditoria: lê e escreve (trilha imutável; sem update/delete).
grant select, insert on public.auditoria to authenticated;

-- anon permanece só com INSERT em submissoes + EXECUTE na RPC (já configurado).
