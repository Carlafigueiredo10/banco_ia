# ADR — Federação da API pública do Sinapses (CNJ)

**Data:** 05/08/2026 · **Responsável:** Carla Figueiredo (coordenação BBSIA) · **Status:** aceito

## Contexto

O CNJ/PJe abriu a **API pública do Sinapses** (`/publico/v1/…`) com os projetos de IA dos tribunais
brasileiros — 159 registros na data desta decisão. A API foi gerada **para o BBSIA integrar**, com
autorização institucional confirmada pela coordenação.

É o maior acervo estruturado de IA no setor público brasileiro hoje e, em governança, mais rico que o
nosso: classificação de risco, base legal LGPD, RIPD, modelo principal, uso de RAG, participação de
universidade.

Dois fatos moldaram a decisão:

1. **O recurso público não tem link/URL por projeto.** A spec diz explicitamente "sem URLs internas";
   só há *flags* de `documentacao_disponivel`. Pela regra do projeto de só publicar item com link que
   funcione, esses 159 não virariam cards publicáveis do catálogo.
2. **A taxonomia é judiciária** (`foco_atuacao: grupo_3_apoio_jurisdicional`, `aderencia_pdpj_br`,
   `tribunal`) e não casa com a do BBSIA. Um de-para para `catalogo_solucoes` perderia informação e
   seria frágil.

## Decisão

**Federar em runtime, somente leitura. Nada do CNJ entra no nosso Postgres.**

As páginas são nossas — `/judiciario` (lista com filtros) e `/judiciario/[pid]` (ficha completa),
no nosso domínio e no layout gov.br. O dado continua sendo do CNJ, buscado sob demanda e cacheado por
24 h no Data Cache do Next (`unstable_cache`). Implementação em [`lib/sinapses.ts`](../lib/sinapses.ts)
(I/O) e [`lib/sinapses-normalizar.ts`](../lib/sinapses-normalizar.ts) (núcleo puro).

### Supera o registro anterior
[`docs/PLANO_MODEL_CARD.md`](PLANO_MODEL_CARD.md) previa o Sinapses como **importação em massa**
("adaptador na importação", ~170 soluções). Aquele documento registra uma decisão de sua época e não
foi reescrito: **este ADR o supera** no ponto específico da integração com o CNJ.

Consequência a reavaliar em separado: o `PLANO_MODEL_CARD.md` usava a importação em massa como
argumento para *não* colocar a cascata de risco no CHECK. Federando em runtime, esse argumento perde
força — a decisão sobre o CHECK precisa ser revista pelo seu próprio mérito, não por tabela.

### Exceção arquitetural, com fronteira escrita
[`lib/geo/brasil.ts`](../lib/geo/brasil.ts) declara a postura "sem API externa em runtime". Esta é a
**primeira exceção**, e ela é delimitada para não virar porta aberta. Só é permitida chamada externa
em runtime que atenda a **todos** os critérios:

- dado **público** de terceiro (nada de credencial, nada de dado pessoal);
- **somente leitura**;
- **degradação graciosa obrigatória** — a página nunca quebra se a origem cair;
- **nunca** em caminho de escrita ou de autenticação;
- **sem chave de API**.

## Escopo da autorização do CNJ

Confirmado pela coordenação em 05/08/2026: **integração, republicação das fichas e indexação**.
O CNJ gerou a API para o BBSIA consumir.

Continuam **em aberto**, sem bloquear o desenvolvimento: URL oficial de produção (para entrar na
allowlist exata), aceitação formal do cache de 24 h (a resposta deles traz `Cache-Control: no-cache,
private`), canal para correções, política de remoção de registros, versionamento do contrato e
estabilidade esperada do ambiente.

## Indexação

| Situação | `robots` |
|---|---|
| produção, base fresca, sem query string | `index, follow` |
| **homologação** | `noindex, follow` |
| qualquer query string (inclusive `?utm_source=`) | `noindex, follow` + canonical `/judiciario` |
| fonte indisponível, env ausente/inválida, kill switch desligado | `noindex, follow` |
| snapshot com mais de 72 h | `noindex, follow` |
| `pid` malformado | `noindex, nofollow` |

**Aceitação de risco registrada:** a coordenação optou inicialmente por indexar tudo; a revisão
técnica determinou `noindex` automático em homologação, e é o que vale. Tarja visual não impede
buscador de servir dado de ambiente de **testes** como conteúdo oficial do BBSIA, e a API não expõe
URL canônica por projeto — não há `rel=canonical` para devolver o crédito ao CNJ. O `noindex` se
desliga sozinho quando `SINAPSES_API_URL` apontar para produção.

## Consequências

**Boas.** Zero obrigação de sincronizar; a ficha nunca fica desatualizada; o CNJ segue dono e
responsável pelo dado; custo de ~3 requisições por dia (5 se houver retry por inconsistência), contra
um teto de 60 req/min publicado por eles.

**Aceitas.** Os projetos do Judiciário **não** entram nas contagens do `/catalogo`, **não** saem no
export CSV e **não** são editáveis pela curadoria — são dado do CNJ, não nosso. Se a coordenação
quiser curar um projeto específico, o caminho é cadastrá-lo no catálogo com link próprio.

**Riscos conhecidos.**
- *Estabilidade da origem.* A homologação **caiu durante a implementação** (503 do load balancer, às
  03h de 05/08/2026). A degradação graciosa não é precaução teórica: é requisito comprovado em campo.
- *Cache contra o header deles.* Cacheamos 24 h apesar do `Cache-Control: no-cache, private`. A
  escolha é para **protegê-los** (3 req/dia em vez de N por visita), com TTL curto e "consultado em"
  visível na página. Consta da pauta a confirmar com o CNJ.
- *Ordenação de paginação.* `sort` aceita só `nome | ano_inicio | updated_at` — **não há chave
  única**. Se a base mudar entre a primeira e a última página, a coleta pode escorregar. Mitigação:
  dedup por `pid`, conferência de contagens e **uma** repetição da coleta; persistindo a divergência,
  o snapshot anterior é mantido.
- *Stale-on-error não provado.* A expectativa é que o Data Cache sirva o último valor válido quando a
  revalidação falha. **Ainda não foi provado na Vercel** (ver README, seção de verificação). Até lá, a
  promessa nos textos é "tenta preservar", não "preserva". Se não preservar, fica a página de
  indisponibilidade — não se adiciona Redis nem Postgres por causa disso.

## O que deliberadamente NÃO existe

Sem dashboard, sem endpoint administrativo de revalidação, sem fila, sem cron, sem circuit breaker
elaborado e sem monitoramento dedicado. Para 159 registros lidos uma vez por dia, seria peso morto.
A invalidação de emergência é incrementar `SINAPSES_VERSAO` e fazer deploy; o desligamento de
emergência é `SINAPSES_ENABLED=false` (ver rollback no README).
