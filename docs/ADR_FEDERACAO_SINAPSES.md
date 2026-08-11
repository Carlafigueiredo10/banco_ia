# ADR — Federação da API pública do Sinapses (CNJ)

**Data:** 05/08/2026 · **Responsável:** Carla Figueiredo (coordenação BBSIA) · **Status:** aceito
**Atualizado em 11/08/2026:** origem migrada para produção (ver abaixo).

## Produção — 11/08/2026

O CNJ comunicou formalmente que a **API pública do Sinapses2 está em produção**:
`https://sinapses2-backend.ia.pje.jus.br/api` (documentação em `/docs/api`). A URL entrou na
allowlist e a env var passou a apontar para ela.

Com isso, **três coisas se desligaram sozinhas** — por dedução do hostname (`.hml.`), não por flag
que alguém precisasse lembrar de virar: a tarja de "ambiente de testes", o `noindex` automático e a
ressalva de risco institucional de publicar dado de homologação sob a marca do BBSIA. Era exatamente
o mecanismo previsto na v1 desta decisão, e ele funcionou sem deploy de código para a regra em si.

Medido na primeira coleta de produção: **178 informados / 178 recebidos / 178 válidos**, zero
descartes, zero duplicados, **46 tribunais**, 16 vocabulários sem degradação, snapshot de **489 KB**
(72% de folga sob a guarda de 1,8 MB) e **nenhum campo `contato_*`** no payload. Contrato idêntico
ao da homologação — a normalização não precisou de um ajuste sequer.

A homologação continua na allowlist, para diagnóstico. Apontar para ela reativa tarja e `noindex`
automaticamente.

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

✅ **Resolvido em 11/08/2026:** URL oficial de produção informada formalmente pelo CNJ, com a API
declarada em produção. Entrou na allowlist.

Continuam **em aberto**, sem bloquear nada: aceitação formal do cache de 24 h (a resposta deles ainda
traz `Cache-Control: no-cache, private`), canal para correções, política de remoção de registros,
versionamento do contrato e estabilidade esperada do ambiente — a homologação ficou 13 h fora do ar
em 05/08, e não temos compromisso de disponibilidade para a produção.

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
técnica determinou `noindex` automático em homologação, e é o que valeu. Tarja visual não impede
buscador de servir dado de ambiente de **testes** como conteúdo oficial do BBSIA, e a API não expõe
URL canônica por projeto — não há `rel=canonical` para devolver o crédito ao CNJ.

**Encerrado em 11/08/2026:** com a origem em produção, a vitrine passou a `index, follow`. A regra
continua no código e volta a valer sozinha se alguém apontar a env var para homologação de novo —
não foi removida, foi apenas deixada de ser acionada.

As demais linhas da tabela seguem ativas: query string, fonte indisponível, snapshot velho e `pid`
malformado continuam saindo do índice.

## Consequências

**Boas.** Zero obrigação de sincronizar; a ficha nunca fica desatualizada; o CNJ segue dono e
responsável pelo dado; custo de ~3 requisições por dia (5 se houver retry por inconsistência), contra
um teto de 60 req/min publicado por eles.

**Medido contra a API real em 05/08/2026** (após a origem voltar do 503):

| Medida | Valor |
|---|---|
| Projetos informados / recebidos / válidos | 159 / 159 / 159 |
| Descartados · duplicados | 0 · 0 |
| Vocabulários em `/enums` | 16 campos, sem degradação |
| **Snapshot serializado** | **401 KB** — 77% de folga sob a guarda de 1,8 MB |

O snapshot ficou **menor que o payload bruto** (446 KB) porque o `bruto` é descartado e só a projeção
por allowlist é persistida. Cache confirmado: `consultadoEm` idêntico em 6 cargas distintas (lista,
três listas filtradas e duas fichas) — uma consulta só à origem.

**Aceitas.** Os projetos do Judiciário **não** saem no export CSV e **não** são editáveis pela
curadoria — são dado do CNJ, não nosso. Se a coordenação quiser curar um projeto específico, o
caminho é cadastrá-lo no catálogo com link próprio.

### Contadores da home — revisto em 05/08/2026 (decisão da coordenação)

A v1 desta decisão mantinha os 159 fora de todos os contadores. **Mudou:** eles entram em
"Soluções mapeadas" (158 + 159 = 317), **com marca de fonte**, e ganham card próprio linkando para
`/judiciario`. Racional da coordenação: em algum lugar precisa aparecer o tamanho real do que o banco
entrega — isso engaja — e virão outras integrações.

A separação que sustenta o crédito ao CNJ continua de pé, em três camadas:
- o card próprio leva o chip cinza **"CNJ · Sinapses"**, fora da paleta de curadoria;
- o card do total mostra a composição (`158 curadas · 159 integradas`);
- uma nota abaixo dos números define "integradas": exibidas a partir de fontes públicas de outras
  instituições, com crédito à origem, **sem passar pela curadoria do banco**.

**"Publicadas" e "Em curadoria" não mudam** — continuam contando só o nosso pipeline.
`app/page.tsx` monta isso a partir de uma lista `Integracao[]`, que é a costura para as próximas
fontes. Se a origem estiver fora do ar, a home não soma, não mostra o card e **não inventa número**.

*Verificado empiricamente:* `dynamic = "force-dynamic"` na home **não** derruba o `unstable_cache` —
são mecanismos distintos, e o `force-dynamic` só governa `fetch()`. Nove cargas da home mais uma da
vitrine consumiram **3 requisições** ao CNJ (medido pelo `X-RateLimit-Remaining`: 59 → 55, descontados
dois probes manuais).

**Riscos conhecidos.**
- *Estabilidade da origem.* A homologação **caiu durante a implementação** (503 do load balancer, às
  03h de 05/08/2026, voltando por volta das 16h30). A degradação graciosa não é precaução teórica: é
  requisito comprovado em campo — durante a queda, `/judiciario` respondeu 200 com a página de
  indisponibilidade, Header e Footer inteiros.
- *Cache contra o header deles.* Cacheamos 24 h apesar do `Cache-Control: no-cache, private`. A
  escolha é para **protegê-los** (3 req/dia em vez de N por visita), com TTL curto e "consultado em"
  visível na página. Consta da pauta a confirmar com o CNJ.
- *Ordenação de paginação.* `sort` aceita só `nome | ano_inicio | updated_at` (`sort=pid` responde
  422) — **não há chave única**. Pedimos `sort=nome&order=asc` explicitamente em todas as páginas:
  é a mais estável sob escrita, já que nome muda raramente; `updated_at` seria a pior escolha, pois
  toda edição reordenaria a coleta em andamento. Como `nome` pode repetir, permanecem o dedup por
  `pid`, a conferência de contagens e **uma** repetição da coleta; persistindo a divergência, o
  snapshot anterior é mantido.
- *Stale-on-error não provado.* A expectativa é que o Data Cache sirva o último valor válido quando a
  revalidação falha. **Ainda não foi provado na Vercel** (ver README, seção de verificação). Até lá, a
  promessa nos textos é "tenta preservar", não "preserva". Se não preservar, fica a página de
  indisponibilidade — não se adiciona Redis nem Postgres por causa disso.

## O que deliberadamente NÃO existe

Sem dashboard, sem endpoint administrativo de revalidação, sem fila, sem cron, sem circuit breaker
elaborado e sem monitoramento dedicado. Para 159 registros lidos uma vez por dia, seria peso morto.
A invalidação de emergência é incrementar `SINAPSES_VERSAO` e fazer deploy; o desligamento de
emergência é `SINAPSES_ENABLED=false` (ver rollback no README).
