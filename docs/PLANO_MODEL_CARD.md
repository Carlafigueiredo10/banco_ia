# Plano — Model Card / Ficha da Solução (BBSIA)

> Documento de trabalho para revisão **antes** da execução. Nada foi aplicado ao banco.
> Fonte: conversa Carla × Eunice (LIIA/ENAP) + `BBSIA_Documentacao_com_Catalogo_16campos.docx`
> (Padrão LIIA/Gov.br v0.3 — 16 Campos Essenciais) + imagem "model card" (IMG-20260710-WA0042).

## Contexto

A coordenação (Eunice/LIIA) pediu um **model card** para exibir as soluções, e adota o padrão
**LIIA/Gov.br v0.3 — Versão Essencial (16 campos)**. O `catalogo_solucoes` hoje já cobre 11 dos 16;
faltam campos de LGPD, ética, soberania detalhada e datas, além da cascata de risco do "model card
de livro". Além disso, a coordenação quer **medir demanda** ("Tenho interesse"/curtida) em vez de
uma nota de qualidade inventada (o "⭐4.6" da imagem, que a conversa nunca resolveu).

Correção de rumo da Carla (registrada na conversa, 10/07): o card deve ser **gestor-first** —
descrição em linguagem natural **antes** da stack técnica, porque quem consulta o banco é mais
gestor do que desenvolvedor.

## Decisões já tomadas

| Decisão | Escolha |
|---|---|
| Escopo | Model card **completo** (inclui cascata de risco: viés, robustez, explicabilidade…) |
| Abrangência | **Ficha única para todos os tipos**; seções específicas quando `tipo_solucao = modelo` |
| Nota do card | **Sem estrela.** Rodapé mede **interesse do público** (curtida) — sinal de demanda |
| Modelagem | **Colunas achatadas + CHECK** (padrão do projeto), **não** JSONB — diverge de propósito do cofre JSONB do MVP Payload da LIIA |
| Selo de status | Usa o enum `status` existente (Ativo/Em revisão/…); **não** o "Escalonada" da imagem (vocabulário inexistente — a alinhar com a Eunice) |

## O que muda (por camada)

### 1. Banco — `supabase/migrations/18_model_card.sql` *(já escrito, não aplicado)*
17 colunas novas em `catalogo_solucoes`, **todas nullable, achatadas, com CHECK**:

- **Ficha:** `versao`, `ano_inicio` ("desde"), `supervisao_descricao`, `responsavel_lgpd`
- **Soberania de dados:** `hospedagem_inferencia`, `transferencia_internacional`, `certificacao`
- **Ética (campo 12 LIIA):** `impacto_etico`, `grupos_afetados[]`, `mitigacoes[]`
- **Cascata de risco (§3.2 LIIA):** `ia_generativa`, `avaliacao_vies`, `robustez`,
  `explicabilidade`, `auditoria_certificacoes`, `canal_reclamacao`, `data_revisao_proxima`

Mais o evento **`interesse`** na tabela `acessos` (a tabela foi **criada** na migration 17; toda a
alteração é feita **aqui, na 18** — migration histórica não se reescreve). Fonte única da verdade =
migration 18: recria o CHECK de `evento` e o `acessos_chave_coerente` (nomes reais das constraints)
e atualiza a RPC `registrar_acesso` (escrita pública). **Sem RPC de leitura:** o painel de indicadores
(admin) lê `acessos` direto pela RLS existente `acessos_admin_select` (`private.is_admin`) — não-admin
recebe zero linhas. Nada é concedido a `anon` além do `registrar_acesso` que já existia.

### 2. Contrato / anti-drift
- `lib/metrica.ts`: adiciona `interesse` a `EVENTOS` (chave = uuid). *(já editado)*
- `tests/drift.test.ts`: 2 casos novos — `EVENTOS` (TS) == CHECK de `acessos.evento` (migration 18)
  e `TRANSFERENCIA_INTERNACIONAL` (TS) == CHECK de `transferencia_internacional` (migration 18).
- `lib/enums.ts`: `HOSPEDAGEM_INFERENCIA` reusa `SOBERANIA_CATALOGO` (mesmos valores do padrão LIIA);
  **1 enum novo** `TRANSFERENCIA_INTERNACIONAL` (vocabulário controlado `nao/sim/parcial/nao_informado`,
  não booleano — 'nao_informado'/'parcial' são estados de curadoria). *(já editado)*

### 3. Admin
- `components/admin/CatalogoForm.tsx`: campos novos, agrupados num bloco "Model Card / Conformidade".
- `lib/actions-catalogo.ts`: `criarCatalogo`/`editarCatalogo` gravam os campos novos.

### 4. Público
- **Novo:** `app/catalogo/[id]/page.tsx` — a ficha/model card completa. Render **condicional**
  (só mostra seção com dado). Bloco de conformidade destacado quando `nivel_risco = alto`.
  Sem PII (`responsavel_*` pessoais nunca entram no `select`).
- `app/catalogo/page.tsx`: restyle do card (gestor-first — descrição antes da stack) + link "→" para a ficha.
- Componente cliente do botão "Tenho interesse" (reusa `enviarMetrica("interesse", id)`):
  - **Contador NÃO exibido publicamente na v1** — com tráfego baixo, "0 interesses" comunica mal.
    Só o botão + feedback pós-clique; a contagem fica para gestão (indicadores). Exibição pública
    do número entra depois, se houver volume, e sempre como "manifestações de interesse", **nunca**
    "avaliações" ou "usuários únicos".
  - **Dedup leve:** o botão desabilita após o clique na mesma sessão (estado local), evitando
    duplicação acidental — sem login/fingerprint/cookie e sem prometer unicidade auditável.
- **Alto risco:** o bloco de conformidade usa **texto explícito + cor**, não só cor (e-MAG):
  ex. "Solução classificada como risco alto. Consulte as mitigações e a supervisão."

## Impactos

**Segurança / RLS / privacidade**
- ✅ Todas as 17 colunas novas são públicas por natureza e entram no **grant por coluna** do `anon`.
  `responsavel_nome/email/cargo` (PII pessoal) **continuam fora** do grant — sem regressão.
- ✅ `responsavel_lgpd` é texto de enquadramento ("DPO — Órgão" ou justificativa), **não** e-mail/nome
  pessoal. Convém a curadoria não colar PII aí (documentado no formulário).
- ✅ `interesse` não guarda IP/sessão/hora — só `(dia, evento, chave, contagem)`, como os outros
  eventos. **RIPD não muda.** Escrita só via RPC + rate limit (300/min por origem).
- ✅ Sem `DELETE`; sem `SERVICE_ROLE` no app. Nada disso é tocado.

**Anti-drift / integridade**
- ✅ Banco continua a fronteira: tamanhos/enums via CHECK. Teste novo cobre o evento `interesse`.
- ⚠️ A **cascata de risco** (obrigar viés/robustez quando risco=alto) é regra de **UX/curadoria**,
  não CHECK no banco — decisão consciente para não travar importação em massa (Sinapses/MJ, 170 soluções).

**Performance**
- Colunas nullable → custo desprezível. Interesse é agregado no banco (`group by chave`) só na tela
  admin de indicadores; a área pública não consulta contagem.

**Reversibilidade**
- Migration é aditiva (colunas nullable + evento novo). Reverter = `drop column`/restaurar CHECK.
  Nenhum dado existente é alterado.

**Compatibilidade**
- `select("*")` do admin já traz as colunas novas automaticamente. A listagem pública usa `select`
  explícito — será estendida. Nada quebra em telas não tocadas.

## Riscos / pontos a alinhar com a Eunice (não bloqueiam o build)
1. **Selo "Escalonada"** não existe no enum — vou usar `status`. Se a LIIA quiser esse vocábulo, é enum novo.
2. **Anti-abuso da curtida:** hoje é rate-limit por IP (como as outras métricas). Sem login, é um
   sinal de demanda, não votação auditável. Suficiente para o propósito; não confundir com avaliação.
3. **Interoperar com o cofre JSONB da LIIA (Payload):** ficamos achatados. Se o Sinapses exigir 1:1,
   faz-se um adaptador na importação — não muda este schema.

## Verificação (após aprovação)
1. `npm test` — anti-drift verde (inclui `interesse` e `transferencia_internacional`).
2. `npm run build` — sem erros de tipo nas telas novas.
3. Aplicar `18_model_card.sql` via Supabase MCP (`apply_migration`). Migration **antes** do deploy do
   código novo (é aditiva → seguro). Rollback = rollback do código, **nunca** `drop column` após haver
   preenchimento real.
4. **Teste direto de privilégio** (não só via UI): como `anon`, `select responsavel_email from
   catalogo_solucoes` deve retornar **erro de permissão** — idem `responsavel_nome`/`responsavel_cargo`.
   Rodar via MCP com o papel anon.
5. Manual: no admin, criar/editar uma solução preenchendo campos do model card → publicar →
   abrir `/catalogo/[id]` como anônimo: confere render condicional, ausência de PII, descrição antes
   da stack, e o botão "Tenho interesse" (desabilita após clique). Solução não publicada → `notFound()`.
6. Matriz de RLS (`docs/RLS_TESTES.md`) para o `catalogo_solucoes` — confirmar que anon não lê PII.
