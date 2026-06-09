-- BBSIA Fase 1.0 — schema principal
-- Banco como fronteira de integridade: enums via CHECK (schema portátil) + limites de tamanho.

create table if not exists public.submissoes (
  id                  uuid primary key default gen_random_uuid(),
  criado_em           timestamptz not null default now(),

  -- Bloco A — identificação e localização
  email               text not null check (char_length(email) <= 320),
  nome_completo       text not null check (char_length(nome_completo) <= 200),
  cargo               text check (char_length(cargo) <= 150),
  telefone            text check (char_length(telefone) <= 20),
  orgao               text not null check (char_length(orgao) <= 250),
  nivel_governo       text not null check (nivel_governo in ('federal','estadual','municipal','academia_ict','privado','outro')),
  uf                  char(2) not null check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  cidade              text not null check (char_length(cidade) <= 150),

  -- Bloco B — a solução
  nome_solucao        text not null check (char_length(nome_solucao) <= 200),
  problema            text not null check (char_length(problema) <= 3000),
  como_funciona       text check (char_length(como_funciona) <= 2000),
  tecnologia_ia       text check (tecnologia_ia is null or tecnologia_ia in ('nlp','visao','ml_preditivo','recomendacao','otimizacao','fala','outro','nao_sei')),
  tipo_ativo          text not null check (tipo_ativo in ('codigo','api','dataset','agente','modelo','publicacao','guia','outro')),
  area                text not null check (area in ('saude','educacao','seguranca','fazenda','meio_ambiente','gestao_publica','administracao','outro')),

  -- Bloco C — maturidade (perguntas-fato)
  ja_usado            text not null check (ja_usado in ('outro_orgao','so_nos','ninguem')),
  ponto_atual         text not null check (ponto_atual in ('pesquisa','desenvolvimento','teste','producao')),

  -- Bloco D — abertura e soberania
  aberta              text not null check (aberta in ('aberto','com_ajustes','nao','nao_sei')),
  recursos_publicos   text check (recursos_publicos is null or recursos_publicos in ('sim','nao','ppp','privado','outro')),
  soberania           text check (soberania is null or soberania in ('nacional','externo','misto','nao_sei','nao_se_aplica')),
  dado_sensivel       text check (dado_sensivel is null or dado_sensivel in ('sim','nao','nao_sei')),

  -- Bloco E — fechamento
  links               text not null check (char_length(links) <= 3000),
  resultados          text check (char_length(resultados) <= 3000),
  disposicao_aberto   text not null check (disposicao_aberto in ('sim','nao_momento','talvez','parcial_demo')),
  observacoes         text check (char_length(observacoes) <= 3000),

  -- LGPD
  consentimento_lgpd  boolean not null check (consentimento_lgpd = true),
  consentimento_em    timestamptz,

  -- Sistema / triagem
  estagio             text check (estagio is null or estagio in ('pesquisa','prototipo','prova_conceito','implementado_reuso','implementado_interno','inconsistente')),
  status_maturacao    text not null default 'mapeada' check (status_maturacao in ('mapeada','em_adequacao','validada')),
  encaminhamento      text check (char_length(encaminhamento) <= 3000),
  triagem_notas       text check (char_length(triagem_notas) <= 5000),
  tipo_ativo_extra    jsonb,

  -- LGPD — anonimização auditada (nunca DELETE)
  anonimizado_em      timestamptz,
  anonimizado_por     text check (char_length(anonimizado_por) <= 200),
  motivo_anonimizacao text check (char_length(motivo_anonimizacao) <= 1000),

  -- Origem / base legal (formulário vs. carga inicial)
  origem              text not null default 'formulario' check (origem in ('formulario','importacao')),
  base_legal          text check (char_length(base_legal) <= 200),
  fonte               text check (char_length(fonte) <= 500),
  importado_em        timestamptz,
  importado_por       text check (char_length(importado_por) <= 200),

  atualizado_em       timestamptz not null default now()
);

create index if not exists idx_submissoes_criado_em on public.submissoes (criado_em desc);
create index if not exists idx_submissoes_status on public.submissoes (status_maturacao);
create index if not exists idx_submissoes_estagio on public.submissoes (estagio);
create index if not exists idx_submissoes_uf on public.submissoes (uf);
create index if not exists idx_submissoes_area on public.submissoes (area);
create index if not exists idx_submissoes_tipo on public.submissoes (tipo_ativo);

-- Admins: fonte de verdade de quem cura (consultada pela RLS)
create table if not exists public.admins (
  email        text primary key check (char_length(email) <= 320),
  criado_em    timestamptz not null default now(),
  convidado_por text
);

-- Auditoria: trilha imutável (login admin, convite, export, anonimização)
create table if not exists public.auditoria (
  id         uuid primary key default gen_random_uuid(),
  criado_em  timestamptz not null default now(),
  ator_email text not null,
  acao       text not null check (acao in ('login','convite_admin','export_csv','anonimizacao')),
  detalhe    jsonb
);
create index if not exists idx_auditoria_criado_em on public.auditoria (criado_em desc);

-- Rate limit: janela por IP (nunca exposta ao anon; acesso só via RPC SECURITY DEFINER)
create table if not exists public.rate_limit (
  ip            text not null,
  janela        timestamptz not null,
  contador      int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (ip, janela)
);
