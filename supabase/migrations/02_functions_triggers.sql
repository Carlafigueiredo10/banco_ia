-- Funções e triggers. NOTA: is_admin foi posteriormente movida para o schema `private`
-- (ver 06_harden_functions.sql) e os triggers ganharam search_path fixo.

-- atualizado_em em todo UPDATE
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_submissoes_atualizado_em on public.submissoes;
create trigger trg_submissoes_atualizado_em
  before update on public.submissoes
  for each row execute function public.set_atualizado_em();

-- estagio é SEMPRE recalculado pelo banco (fecha spoofing via insert direto / PostgREST).
-- Regra da seção 4 da spec. Total sobre todas as combinações de ponto_atual × ja_usado.
create or replace function public.calc_estagio()
returns trigger
language plpgsql
as $$
begin
  new.estagio := case
    when new.ponto_atual = 'pesquisa' then 'pesquisa'
    when new.ponto_atual = 'desenvolvimento' then 'prototipo'
    when new.ponto_atual = 'teste' then 'prova_conceito'
    when new.ponto_atual = 'producao' and new.ja_usado = 'outro_orgao' then 'implementado_reuso'
    when new.ponto_atual = 'producao' and new.ja_usado = 'so_nos' then 'implementado_interno'
    when new.ponto_atual = 'producao' and new.ja_usado = 'ninguem' then 'inconsistente'
    else 'inconsistente'
  end;
  return new;
end;
$$;

drop trigger if exists trg_submissoes_estagio on public.submissoes;
create trigger trg_submissoes_estagio
  before insert or update of ponto_atual, ja_usado on public.submissoes
  for each row execute function public.calc_estagio();

-- Rate limit por IP via RPC. Tabela nunca exposta ao anon; só a função (SECURITY DEFINER) escreve.
create or replace function public.check_rate_limit(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count  int;
  v_limit  int := 10;  -- até 10 submissões por IP por minuto
begin
  if random() < 0.02 then
    delete from public.rate_limit where janela < now() - interval '1 day';
  end if;

  insert into public.rate_limit (ip, janela, contador, atualizado_em)
  values (p_ip, v_window, 1, now())
  on conflict (ip, janela)
  do update set contador = public.rate_limit.contador + 1, atualizado_em = now()
  returning contador into v_count;

  return v_count <= v_limit;
end;
$$;
