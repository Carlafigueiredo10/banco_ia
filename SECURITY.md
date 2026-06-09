# Política de Segurança

## Como reportar uma vulnerabilidade

Se você encontrar uma vulnerabilidade de segurança neste projeto, **não abra uma issue
pública**. Em vez disso, envie um e-mail para:

**liia@enap.gov.br**

Inclua, se possível:
- uma descrição da vulnerabilidade e do impacto;
- passos para reproduzir;
- versões/ambiente afetados.

Faremos o possível para responder em até **5 dias úteis** e manteremos você informado sobre a
correção. Pedimos que você dê um prazo razoável para a correção antes de qualquer divulgação
pública (divulgação responsável).

## Escopo

Este repositório contém o **sistema de captação** do BBSIA (formulário público, área
administrativa, indicadores). Pontos sensíveis a observar:

- **Autorização** é a tabela `public.admins` + a função `private.is_admin()` (RLS).
- **Sem `SERVICE_ROLE_KEY` na aplicação** — apenas no script local de importação.
- **Escrita pública** passa exclusivamente por `POST /api/submissao` (validação Zod, honeypot,
  rate limit via RPC).
- **Banco como fronteira de integridade** (CHECK, triggers, RLS) — ver `docs/RLS_TESTES.md`.

## Boas práticas ao usar este código

- Nunca commite `.env.local` (já ignorado). Use `.env.example` como referência.
- Mantenha a `SERVICE_ROLE_KEY` apenas em ambiente local/CI protegido.
- Após mudar policies/grants, reexecute a matriz de testes de RLS antes de publicar.
