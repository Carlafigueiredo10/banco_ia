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
* Supabase Auth (Magic Link)
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

* Login por Magic Link
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

Criar um arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

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

A definir.
Possível adoção de licença MIT para facilitar reutilização por órgãos públicos e instituições parceiras.

---

## Sobre o Projeto

O BBSIA é uma iniciativa voltada à identificação, catalogação e disseminação de soluções de inteligência artificial aplicadas à gestão pública brasileira.

Este repositório contém a primeira camada operacional da iniciativa: o sistema de captação e curadoria de soluções.
