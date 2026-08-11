# ADR 001 — Hospedagem, soberania de dados e plano de saída

**Status:** aceito (mitigação aplicada) · **Data:** 2026-08-04 · **Decide:** coordenação BBSIA

---

## Contexto

O BBSIA é o Banco Brasileiro de Soluções de IA para a Gestão Pública. O sistema pergunta a cada
solução submetida se ela é de tecnologia `nacional`, `externo` ou `misto` (campo `soberania`, ver
[01_schema_submissoes.sql](../supabase/migrations/01_schema_submissoes.sql)). Um sistema que faz
essa pergunta precisa saber responder a ela sobre si mesmo, em público e com dados.

A infraestrutura atual é Vercel (aplicação) + Supabase (Postgres, Auth, RLS). Ambas são empresas
sediadas nos Estados Unidos.

## Que dado o sistema guarda, de fato

Isto dimensiona o risco e delimita o que está em discussão. Qualquer avaliação de soberania sobre
este sistema parte desta tabela, não de suposição sobre o que um sistema de governo costuma guardar.

| Categoria | Contém | Onde |
|---|---|---|
| `submissoes` | Contato de **quem submete** (servidor público): nome, e-mail, cargo, telefone, órgão, UF, cidade — com `consentimento_lgpd` obrigatório via CHECK. Mais a descrição da solução, que é conteúdo **destinado a ser público**. | Supabase `sa-east-1` |
| `admins`, `auditoria` | E-mail de curador; trilha imutável de login/export/anonimização. | Supabase `sa-east-1` |
| `acessos` | Métrica agregada: `(dia, evento, chave, contagem)`. **Sem IP, sem user-agent, sem sessão, sem referrer, sem hora.** Não há linha por visitante. | Supabase `sa-east-1` |
| `rate_limit` | IP em janela de minuto, para conter abuso. Nunca exposto ao `anon`; só via RPC `security definer`. | Supabase `sa-east-1` |

**Não há dado de cidadão, não há base de serviço público, não há dado sensível de terceiro.**
O risco real é o dado de contato de servidor público — significativo sob a LGPD, mas de ordem de
grandeza distinta de uma base de atendimento ou de benefício.

## Decisão

### 1. Declarar explicitamente a região de execução (aplicado)

[`vercel.json`](../vercel.json) define `"regions": ["gru1"]` (São Paulo).

A região de execução das funções passa a ser uma decisão de arquitetura declarada no repositório,
e não um comportamento herdado da plataforma: na ausência dessa chave, a Vercel aloca as funções
em `iad1` (Washington, DC) por padrão. Como `POST /api/submissao` trata nome, e-mail, telefone,
cargo e órgão, a região de execução é matéria de projeto e precisa estar sob controle do
repositório, não do default do fornecedor.

Com isso, dado em repouso (Supabase `sa-east-1`) e dado em processamento (funções `gru1`) ficam
ambos em São Paulo.

### 2. Remover telemetria de terceiro (aplicado)

`@vercel/analytics` foi removido de [`app/layout.tsx`](../app/layout.tsx) e do `package.json`.

Motivo duplo: (a) enviava telemetria de visitante para infraestrutura estrangeira; (b) era
**redundante** — a migration [17_acessos.sql](../supabase/migrations/17_acessos.sql) já implementa
contagem de visitas própria, agregada, sem dado pessoal, e que não sai do banco em São Paulo.

### 3. Registrar o limite honestamente

**Geografia não resolve jurisdição.** Vercel Inc. e Supabase Inc. são empresas americanas. Sob o
CLOUD Act, uma ordem judicial dos EUA alcança dados sob custódia dessas empresas
independentemente de onde o disco está fisicamente. Criptografia em trânsito e em repouso não
neutraliza isso quando o provedor detém as chaves de gestão.

Os itens 1 e 2 são **mitigação e redução de superfície**, não soberania. Chamar isso de soberania
seria exatamente o tipo de marketing que o projeto existe para combater.

**Resíduo conhecido:** o proxy/middleware do Next ([middleware.ts](../middleware.ts)) roda na Edge
Network global, fora do alcance da chave `regions`. Ele trata cookie de sessão do Supabase Auth
(só curadores logados; o formulário público não passa por sessão). Para tráfego brasileiro o POP
mais próximo é o de São Paulo, mas isso é comportamento de rede, não garantia contratual.

## Por que não migramos hoje

Migrar agora atrasaria a Fase 1.0 (captação das 30 soluções de lançamento) sem eliminar o risco
principal, que é jurídico e não geográfico. A escolha é migrar **com o plano pronto**, não sob
pressão de crítica.

O que torna essa escolha defensável é o **custo de saída, que foi mantido baixo por desenho**:

- Enums via `CHECK` em vez de tipos `ENUM` do Postgres — o schema é portátil (comentário explícito
  na migration 01).
- RLS, policies e funções em PL/pgSQL padrão. Nenhuma Edge Function proprietária.
- `SERVICE_ROLE_KEY` nunca no app — só no script de import, local.
- Supabase é open source e self-hostável.
- A aplicação é Next.js padrão: roda em qualquer host Node ou container.

**Sair daqui é `pg_dump` + container atrás de proxy. É uma decisão, não uma reescrita.**

## Plano de saída

| # | Ação | Dependência |
|---|---|---|
| 1 | Levantar alternativas nacionais: Nuvem Serpro / GovCloud, Dataprev, Magalu Cloud (capital nacional), ou infra própria ENAP via SISP. Comparar custo, SLA, suporte a Postgres 17 e processo de contratação. | — |
| 2 | Validar com DPO/jurídico a base legal da transferência internacional enquanto durar o arranjo atual (LGPD art. 33; cláusulas-padrão contratuais da ANPD). Registrar no RIPD. | Revisão de [app/privacidade](../app/privacidade) já pendente |
| 3 | Prova de conceito: Postgres gerenciado nacional + Next em container. Medir latência e custo. | 1 |
| 4 | Publicar a decisão de migração com prazo, ou publicar a justificativa fundamentada de permanência. | 3 |

## Auditoria de segurança — agosto/2026

Uma auditoria GRC do repositório, verificada contra o banco de produção, gerou as migrations 21–26.
Fechados: PII do catálogo legível por qualquer conta autenticada (A-1), open redirect no callback
de auth (A-2), escrita pública que contornava a rota e forjava campos de curadoria (A-4),
autorrevogação de admin por PostgREST, e default privileges do Supabase que davam `DELETE`/
`TRUNCATE` a `authenticated` (A-5). Evidência antes/depois de cada um em
[docs/RLS_TESTES.md](RLS_TESTES.md).

**Backlog que ficou registrado, em ordem de prioridade:**

| | Item | Por quê |
|---|---|---|
| **P1** | RPC atômica para escrita pública — rate limit e `insert` na mesma transação | O grant por coluna limita *o que* o anônimo grava, não *quanto*. Chamada direta ao PostgREST ainda pula o `check_rate_limit`. Como não há DELETE, spam de formulário é irreversível pela aplicação — e, num projeto com restrição de custo, encher tabela é problema financeiro além de operacional. |
| **P2** | Auditoria transacional (trigger ou RPC) no lugar da aplicacional | Hoje a mutação e o registro na trilha são operações independentes: se a segunda falhar, houve mudança sem registro; e escrita direta via PostgREST não gera registro nenhum. Cobre o uso normal do painel, não garante cobertura total. Só vale a pena se auditoria virar requisito formal de governança. |
| **P3** | A-3: fechar o cadastro público de contas | Enquanto estiver aberto, `authenticated` é qualquer pessoa do mundo. Exige mudança no painel do Supabase, não só código. |
| **P3** | CAPTCHA no Auth (Attack Protection) | Mitiga enumeração de contas na API do Supabase, que a aplicação não consegue fechar sozinha. Decisão de custo/atrito. |

**Não fazer** (avaliado e descartado nesta rodada): RBAC próprio, tabela de papéis, middleware novo
de autorização, API administrativa genérica, `service_role` para operações de browser. O Supabase
já entrega as primitivas; deslocar a segurança da RLS para código de aplicação seria regressão.

## Transparência

Esta decisão é pública. A página `/privacidade` deve declarar onde o dado está hospedado, qual a
base legal da transferência internacional e a existência deste plano de saída — em linguagem
compreensível, não em juridiquês.

Um projeto de soberania digital que esconde a própria dependência perde a autoridade para cobrar
transparência de qualquer outro.

## Referências

- LGPD (Lei 13.709/2018), art. 33 — transferência internacional de dados
- Resolução CD/ANPD nº 19/2024 — cláusulas-padrão contratuais *(confirmar vigência com o jurídico)*
- Plano Brasileiro de IA (PBIA 2024–2028) — eixo de infraestrutura e soberania
- CLOUD Act (EUA, 2018) — alcance extraterritorial sobre provedores sob jurisdição americana
