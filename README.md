# BBSIA — Sistema de Captação

Sistema de captação do Banco Brasileiro de Soluções de IA para a Gestão Pública (BBSIA).

O objetivo é permitir que órgãos públicos, universidades, ICTs e demais instituições submetam soluções de IA para compor o banco nacional de soluções organizado por problema resolvido.

Esta aplicação substitui formulários externos por uma solução própria, auditável, evolutiva e baseada em software aberto.

---

## Objetivos

* Captar soluções de IA para a gestão pública
* Apoiar a curadoria administrativa
* Produzir indicadores institucionais
* Permitir exportação estruturada dos dados
* Servir como fundação do Banco Brasileiro de Soluções de IA

---

## Stack

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* gov.br Design System (`@govbr-ds/core`)

### Backend

* Next.js Route Handlers
* Supabase Auth (login por senha; link de e-mail no primeiro acesso/recuperação)
* PostgreSQL

### Banco de Dados

* PostgreSQL (Supabase)
* Row Level Security (RLS)
* CHECK Constraints
* Triggers
* Auditoria

---

## Arquitetura

```text
Usuário
   │
   ▼
Next.js
(Formulário + Admin)
   │
   ▼
API
(Route Handlers)
   │
   ▼
Supabase / PostgreSQL
   ├─ RLS
   ├─ CHECK Constraints
   ├─ Triggers
   └─ Auditoria
```

Princípio adotado:

> O banco de dados é a autoridade final sobre integridade e autorização. A aplicação existe para oferecer uma experiência melhor ao usuário.

---

## Funcionalidades

### Formulário Público

* Sem autenticação
* Validação client-side e server-side
* Consentimento LGPD obrigatório
* Honeypot anti-spam
* Rate limiting
* Página de privacidade

### Administração

* Login por senha (link de e-mail no primeiro acesso/recuperação)
* Curadoria das submissões
* Alteração de status
* Exportação CSV
* Gestão de administradores

### Indicadores

* Distribuição por UF
* Distribuição por área
* Estágio de maturidade
* Evolução temporal
* Indicadores de abertura e soberania

---

## Segurança

O projeto adota uma abordagem de segurança simples e pragmática.

### Banco

* RLS habilitada
* Políticas explícitas USING e WITH CHECK
* DELETE bloqueado
* Trigger de cálculo de estágio
* Auditoria imutável

### Aplicação

* Validação Zod
* Proteção contra CSV Injection
* Proteção contra XSS
* CSP
* Headers de segurança

### LGPD

* Consentimento explícito
* Política de privacidade
* Processo de anonimização auditada
* Minimização de dados

---

## Desenvolvimento

### Instalação

```bash
npm install
```

### Executar localmente

```bash
npm run dev
```

Aplicação disponível em:

```text
http://localhost:3000
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Federação Sinapses (CNJ) — vitrine /judiciario. Server-only, sem NEXT_PUBLIC_.
SINAPSES_ENABLED=true
SINAPSES_API_URL=https://sinapses2-backend.ia.pje.jus.br/api
```

> **Não** use `SERVICE_ROLE_KEY` na aplicação — apenas, se necessário, no script local de
> importação (`scripts/import-solucoes.ts`).

#### `SINAPSES_ENABLED` e `SINAPSES_API_URL`

Alimentam a vitrine `/judiciario`, que consulta a API pública do CNJ em runtime (ver
[ADR de federação](docs/ADR_FEDERACAO_SINAPSES.md)). As duas falham para o lado seguro:

| Variável | Em produção | Em desenvolvimento |
|---|---|---|
| `SINAPSES_ENABLED` | exige o literal `true`; ausente, vazia ou com typo (`flase`, `1`) mantém **desligado** | ausente = ligado; `false` desliga |
| `SINAPSES_API_URL` | **obrigatória**; ausente ou fora da allowlist deixa a vitrine indisponível — não há fallback silencioso para homologação | ausente = homologação |

A URL é conferida contra uma **allowlist de URL-base exata** (`BASES_PERMITIDAS`, em
`lib/sinapses-normalizar.ts`): rejeita `http://`, credenciais, porta, query, hash e caminho
divergente. A allowlist tem duas entradas — produção e homologação.

O ambiente é deduzido do **hostname** (`.hml.` = homologação), não de uma flag. Apontando para
homologação, a vitrine sai com tarja de "ambiente de testes" e `noindex`; apontando para produção,
os dois se desligam sozinhos, sem deploy de código.

Desde **11/08/2026** a origem é a **produção** do CNJ
(`https://sinapses2-backend.ia.pje.jus.br/api`), formalmente autorizada — a vitrine é indexável.

#### Rollback da vitrine do Judiciário

Se aparecer dado inadequado, quebra de contrato ou pedido urgente de retirada:

1. `SINAPSES_ENABLED=false` na Vercel
2. redeploy
3. conferir `/judiciario`: indisponibilidade **planejada** + `noindex`, e **zero** requisição ao CNJ

O texto exibido diz que a decisão foi do BBSIA — não insinua problema no CNJ. Para forçar uma
atualização antes das 24 h de cache (correção urgente do CNJ), incremente `SINAPSES_VERSAO` em
`lib/sinapses-normalizar.ts` e faça deploy: a constante entra na chave do cache.

> **Verificado em 11/08/2026 (preview, TTL de 15 s + falha controlada):** com um snapshot válido em
> cache, a falha na revalidação **não** derruba a vitrine — o Data Cache segue servindo o último
> snapshot bom, com o "consultado em" congelado no horário da última coleta bem-sucedida. Observado
> por mais de 3 minutos de falhas consecutivas, sempre com os 178 projetos na tela.
>
> O limite: **em cold start (cache vazio) a página mostra indisponibilidade** — confirmado forçando
> chave de cache nova. Nesse estado a rota sai com `noindex` e a home volta a não somar a integração.
> Ou seja, a degradação é por ausência de snapshot, não por falha da origem.

### Configuração inicial (banco)

1. Aplique as migrations de `supabase/migrations/` (01 → 10) ao seu projeto Supabase.
2. **Antes de aplicar a `04_seed_admins.sql`, troque o e-mail placeholder
   (`admin@example.gov.br`) pelo do seu primeiro administrador.** Novos admins podem ser
   convidados depois pela própria tela (`/admin/admins`).
3. No Supabase Auth, configure **Site URL** e **Redirect URLs** do seu domínio.

---

## Estrutura do Projeto

```text
app/
components/
lib/
scripts/
supabase/
```

---

## Licença

Distribuído sob a licença **MIT** — veja [LICENSE](LICENSE). Software livre, para facilitar a
reutilização e a adaptação por órgãos públicos e instituições parceiras.

Para reportar vulnerabilidades, veja [SECURITY.md](SECURITY.md).

---

## Sobre o Projeto

O BBSIA é uma iniciativa voltada à identificação, catalogação e disseminação de soluções de inteligência artificial aplicadas à gestão pública brasileira.

Este repositório contém a primeira camada operacional da iniciativa: o sistema de captação e curadoria de soluções.
