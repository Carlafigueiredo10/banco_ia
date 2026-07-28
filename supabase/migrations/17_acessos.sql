-- BBSIA — Monitoramento de visitas (agregado, sem dado pessoal)
--
-- O QUE MEDE:
--   'pagina'         → visita a uma página pública (chave = rota)
--   'clique_solucao' → clique no link externo de uma solução do catálogo (chave = uuid)
--   'clique_base'    → clique no card de uma base reutilizável (chave = uuid)
--
-- O QUE NÃO GUARDA: IP, user-agent, sessão, referrer, hora. Só (dia, evento, chave, contagem).
-- Não há linha por visitante — logo, não há dado pessoal e o RIPD não muda.
--
-- Escrita: SÓ pela RPC registrar_acesso (security definer). anon não tem grant na tabela,
-- então não dá para INSERT/UPDATE direto nem para inflar contadores fora do caminho oficial.
-- O caminho público é /api/metrica (Zod strict + rate limit), como manda o AGENTS.md.

create table if not exists public.acessos (
  dia           date not null default current_date,
  evento        text not null check (evento in ('pagina','clique_solucao','clique_base')),
  chave         text not null check (char_length(chave) between 1 and 120),
  contagem      integer not null default 0 check (contagem >= 0),
  atualizado_em timestamptz not null default now(),

  primary key (dia, evento, chave),

  -- Banco = fronteira de integridade: rota começa com '/', clique é uuid. Sem lixo na tabela
  -- mesmo que a rota de API algum dia deixe passar.
  constraint acessos_chave_coerente check (
    (evento = 'pagina' and chave ~ '^/[a-z0-9/_-]*$')
    or (evento in ('clique_solucao','clique_base')
        and chave ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  )
);

create index if not exists idx_acessos_evento on public.acessos (evento);
create index if not exists idx_acessos_dia on public.acessos (dia);

-- =====================================================================================
-- RPC de escrita — único caminho para incrementar
-- =====================================================================================
create or replace function public.registrar_acesso(p_evento text, p_chave text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Falha silenciosa em entrada inválida: métrica nunca quebra a navegação de quem visita.
  if p_evento is null or p_chave is null then return; end if;
  if p_evento not in ('pagina','clique_solucao','clique_base') then return; end if;
  if char_length(p_chave) < 1 or char_length(p_chave) > 120 then return; end if;

  insert into public.acessos (dia, evento, chave, contagem, atualizado_em)
  values (current_date, p_evento, p_chave, 1, now())
  on conflict (dia, evento, chave)
  do update set contagem = public.acessos.contagem + 1, atualizado_em = now();
exception
  when check_violation then return;  -- chave incoerente com o evento: ignora, não estoura
end;
$$;

-- =====================================================================================
-- Rate limit próprio da métrica — reusa public.rate_limit, chave prefixada 'm:'
-- para não competir com o contador do formulário. Limite alto: pageview é barato e
-- órgão atrás de NAT compartilha um IP só.
-- =====================================================================================
create or replace function public.check_rate_limit_metrica(p_chave text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count  int;
  v_limit  int := 300;  -- até 300 eventos por origem por minuto
begin
  if random() < 0.02 then
    delete from public.rate_limit where janela < now() - interval '1 day';
  end if;

  insert into public.rate_limit (ip, janela, contador, atualizado_em)
  values ('m:' || p_chave, v_window, 1, now())
  on conflict (ip, janela)
  do update set contador = public.rate_limit.contador + 1, atualizado_em = now()
  returning contador into v_count;

  return v_count <= v_limit;
end;
$$;

-- =====================================================================================
-- RLS + grants
--   anon      → nenhum acesso à tabela; só EXECUTE nas duas RPCs
--   admin     → SELECT (o painel lê e agrega)
--   DELETE/UPDATE diretos → nenhuma policy => negados a todos
-- =====================================================================================
alter table public.acessos enable row level security;

drop policy if exists acessos_admin_select on public.acessos;
create policy acessos_admin_select on public.acessos
  for select to authenticated using (private.is_admin());

revoke all on public.acessos from anon, authenticated;
grant select on public.acessos to authenticated;

-- Só anon executa. O Supabase concede EXECUTE ao authenticated por default privileges,
-- então revogamos explicitamente (mesmo tratamento da 07 para check_rate_limit):
-- admin logado não tem por que incrementar contador de visita.
revoke all on function public.registrar_acesso(text, text) from public, authenticated;
grant execute on function public.registrar_acesso(text, text) to anon;

revoke all on function public.check_rate_limit_metrica(text) from public, authenticated;
grant execute on function public.check_rate_limit_metrica(text) to anon;
