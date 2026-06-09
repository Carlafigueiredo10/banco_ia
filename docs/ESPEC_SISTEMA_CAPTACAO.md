# BBSIA — Sistema de Captação de Soluções (Fase 1.0)
### Especificação funcional + modelo de dados

> Substitui o Google Forms por um sistema próprio (Claude Code + Supabase), com formulário público de submissão, view de administração para a coordenação e painel de indicadores. O formulário continua simples para quem submete; toda a complexidade (heterogeneidade de ativos, classificação, triagem) vive no banco e na camada de admin — não na cara do contribuinte.

---

## 1. Princípios de desenho

- **Pergunta só o fato que o contribuinte sabe.** Maturidade é *calculada* a partir de perguntas-fato, nunca autodeclarada.
- **Formulário plano, sem ramificação.** O tipo de ativo é só uma etiqueta; a profundidade específica de cada tipo é enriquecida depois pela equipe/triagem.
- **Sem login.** Fricção de acesso mata submissão. Qualquer pessoa responde.
- **A ferramenta é descartável; o schema é o ativo.** Os campos abaixo migram sem retrabalho entre Forms, Supabase ou qualquer destino.
- **Entrada pela dor, não pela categoria.** O campo central é o problema em uma frase, em linguagem de quem usa.

---

## 2. Formulário público (campos)

Legenda de tipos: `email` · `texto` (curto) · `texto longo` · `seleção` (uma opção) · `UF` (menu de 27 estados).
`*` = obrigatório.

### Bloco A — Identificação e localização
| # | Campo | Tipo | Opções | Obrig. |
|---|-------|------|--------|:------:|
| 1 | E-mail | email | — | * |
| 2 | Nome completo | texto | — | * |
| 3 | Cargo | texto | — | |
| 4 | Órgão / Entidade / Empresa | texto | — | * |
| 5 | Nível de governo | seleção | Federal · Estadual · Municipal · Academia ou ICT · Setor privado · Outro | * |
| 6 | Estado (UF) | UF | menu com as 27 UFs | * |
| 7 | Cidade / Município | texto | — | * |

> Campos 6 e 7 alimentam o **Mapa de Ecossistema (3.2)** — de onde, no Brasil, as soluções estão surgindo. O ganho regional vem sobretudo de estados e municípios.

### Bloco B — A solução
| # | Campo | Tipo | Opções | Obrig. |
|---|-------|------|--------|:------:|
| 8 | Nome curto da solução | texto | — | * |
| 9 | Em uma frase, qual problema ela resolve? *(escreva como explicaria pra um colega, sem termos técnicos)* | texto longo | — | * |
| 10 | Tipo de ativo | seleção | Código/software · API · Dataset · Agente/multiagente · Modelo de IA (treinado) · Publicação/pesquisa científica · Guia/material/metodologia · Outro | * |
| 11 | Área de atuação | seleção | Saúde · Educação · Segurança Pública · Fazenda/Tributação · Meio Ambiente · Gestão Pública · Administração/Processos · Outro | * |

> Campo 9 é a porta de entrada pela dor. Campos 10–11 são etiquetas; o tipo de tecnologia de IA (NLP/Visão/etc.) **não** é perguntado — a triagem infere da descrição.

### Bloco C — Maturidade (perguntas-fato)
| # | Campo | Tipo | Opções | Obrig. |
|---|-------|------|--------|:------:|
| 12 | Além de você ou da sua equipe, alguém já usou? | seleção | Sim, outro órgão/instituição · Só nós · Ninguém ainda | * |
| 13 | Em que ponto está hoje? | seleção | É pesquisa em andamento (artigo, modelo ou PoC em universidade/ICT) · Ainda em desenvolvimento (protótipo) · Funciona, mas em fase de teste · Em uso / produção em pelo menos um órgão | * |

> O **estágio** é derivado destes dois campos (regra na seção 4). O degrau "pesquisa em andamento" faz o mesmo formulário alimentar também o **Catálogo de Soluções Científicas (2.2, TRL 1-3)**.

### Bloco D — Abertura e soberania (o DNA do banco)
| # | Campo | Tipo | Opções | Obrig. |
|---|-------|------|--------|:------:|
| 14 | É aberta / reusável por outro órgão? | seleção | Sim, código aberto · Sim, com ajustes · Não · Não sei | * |
| 15 | Desenvolvida majoritariamente com recursos públicos? | seleção | Sim · Não · Parceria público-privada · Privado · Outro | |
| 16 | *Se for software/agente/API:* roda em modelo aberto e infra nacional, ou depende de serviço externo (ChatGPT, Gemini, etc.)? | seleção | Infra/modelo nacional ou aberto · Depende de serviço externo · Misto · Não sei · Não se aplica | |
| 17 | Lida com dado pessoal ou sensível? | seleção | Sim · Não · Não sei | |

### Bloco E — Fechamento
| # | Campo | Tipo | Opções | Obrig. |
|---|-------|------|--------|:------:|
| 18 | Link(s): repositório, documentação ou demo | texto longo | — | * |
| 19 | Tem algum número ou resultado pra contar? *(economia, tempo, nº de atendimentos…)* | texto longo | — | |
| 20 | Sua instituição está disposta a fornecer a solução (código, documentação, know-how) pra ser adaptada e escalada como código aberto? | seleção | SIM · Não, no momento · Talvez, precisamos de mais informações · Parcialmente, em versão demo | * |
| 21 | Observações e sugestões | texto longo | — | |

**Aviso no topo do formulário:**
> *"Leva uns 4 minutos. Vou te perguntar: o que é a sua solução, qual problema ela resolve, quem já usa, e os links. Tenha o link do repositório/documentação à mão. São informações abertas."*

---

## 3. Modelo de dados (Supabase / Postgres)

Tabela principal: **`submissoes`**

| Coluna | Tipo | Origem | Notas |
|--------|------|--------|-------|
| `id` | `uuid` PK | sistema | `default gen_random_uuid()` |
| `criado_em` | `timestamptz` | sistema | `default now()` |
| `email` | `text` not null | campo 1 | |
| `nome_completo` | `text` not null | campo 2 | |
| `cargo` | `text` | campo 3 | |
| `orgao` | `text` not null | campo 4 | |
| `nivel_governo` | `text` not null | campo 5 | enum |
| `uf` | `char(2)` not null | campo 6 | enum 27 UFs |
| `cidade` | `text` not null | campo 7 | |
| `nome_solucao` | `text` not null | campo 8 | |
| `problema` | `text` not null | campo 9 | |
| `tipo_ativo` | `text` not null | campo 10 | enum |
| `area` | `text` not null | campo 11 | enum |
| `ja_usado` | `text` not null | campo 12 | enum: `outro_orgao` / `so_nos` / `ninguem` |
| `ponto_atual` | `text` not null | campo 13 | enum: `pesquisa` / `desenvolvimento` / `teste` / `producao` |
| `aberta` | `text` not null | campo 14 | enum |
| `recursos_publicos` | `text` | campo 15 | enum |
| `soberania` | `text` | campo 16 | enum |
| `dado_sensivel` | `text` | campo 17 | enum: `sim` / `nao` / `nao_sei` |
| `links` | `text` not null | campo 18 | |
| `resultados` | `text` | campo 19 | |
| `disposicao_aberto` | `text` not null | campo 20 | enum |
| `observacoes` | `text` | campo 21 | |
| **— campos do sistema (equipe/triagem) —** | | | |
| `estagio` | `text` | calculado | regra na seção 4 |
| `status_maturacao` | `text` | equipe | `default 'mapeada'` → `em_adequacao` → `validada` |
| `encaminhamento` | `text` | equipe | ex.: link da comunidade, motivo |
| `triagem_notas` | `text` | equipe/IA | |
| `tipo_ativo_extra` | `jsonb` | equipe | profundidade específica por tipo de ativo (dataset, API…), enriquecida depois |
| `atualizado_em` | `timestamptz` | sistema | trigger on update |

> **Heterogeneidade resolvida aqui:** o formulário é comum a todos os ativos; os metadados específicos de cada tipo vivem em `tipo_ativo_extra` (jsonb), preenchidos na curadoria — não na submissão.

**Acesso (RLS — Row Level Security):**
- Inserção pública anônima (o formulário): policy permitindo *apenas* `INSERT` via chave anônima.
- Leitura e edição: restritas a usuários autenticados (Supabase Auth) com papel de admin — a Eunice e a equipe de coordenação.

---

## 4. Regra de cálculo do estágio

`estagio` é derivado, nunca digitado pelo contribuinte. Cruza os campos 12 (`ja_usado`) e 13 (`ponto_atual`):

| `ponto_atual` | `ja_usado` | → `estagio` |
|---------------|-----------|-------------|
| `pesquisa` | qualquer | **Pesquisa** (TRL 1-3) |
| `desenvolvimento` | qualquer | **Protótipo** |
| `teste` | `so_nos` / `ninguem` | **Prova de conceito / teste** |
| `producao` | `outro_orgao` | **Implementado — reuso comprovado** |
| `producao` | `so_nos` | **Implementado — uso interno** |
| `producao` | `ninguem` | *Inconsistente — marcar pra revisão manual* |

> O selo "reusável em produção" (que habilita `status_maturacao = validada`) **exige confirmação humana** — a IA de triagem nunca dá esse verde sozinha. Errar ali faz outro órgão reusar coisa insegura.

---

## 5. View de admin (Eunice + equipe de coordenação)

Acesso autenticado. Funcionalidades:

- **Listagem** de todas as submissões, com **filtros** por: status de maturação, estágio, tipo de ativo, área, UF, abertura, soberania, dado sensível, nível de governo.
- **Busca** por texto (nome da solução, problema, órgão).
- **Detalhe** de cada submissão com todos os campos.
- **Edição de curadoria:** atribuir `status_maturacao` (Mapeada → Em adequação → Validada), preencher `encaminhamento` e `triagem_notas`, completar `tipo_ativo_extra`.
- **Encaminhamento não-punitivo:** ao marcar uma solução como "Em adequação", registrar motivo + próximo passo concreto (ex.: link da comunidade/5.1, soluções equivalentes em infra nacional).
- **Export CSV:** botão para exportar tudo ou o resultado filtrado.
- **Controle de acesso:** gestão de quem é admin.

---

## 6. Painel de indicadores

Métricas para a coordenação acompanhar a captação e o lançamento (meta: 30 soluções no lançamento jul/ago, +10/mês):

- **Volume:** total de submissões; por `status_maturacao`; por `estagio`; ao longo do tempo (curva de captação vs. meta).
- **Distribuição:** por tipo de ativo · por área · por **UF (mapa regional)** · por nível de governo.
- **DNA do banco:** % aberta vs. fechada · % soberana (infra/modelo nacional) vs. dependente de serviço externo · % que lida com dado sensível · % desenvolvida com recursos públicos.
- **Reuso e adoção:** quantas com reuso comprovado (`ja_usado = outro_orgao`); top órgãos contribuintes.
- **Lacunas:** áreas/problemas com muita submissão e poucas soluções *abertas* — insumo para identificar demandas recorrentes não atendidas.

---

## 7. Notas de implementação (Claude Code + Supabase)

- **Stack mínima:** front do formulário público (sem login) → `INSERT` na tabela `submissoes` via chave anônima com RLS restrita a insert; admin em rota autenticada (Supabase Auth) com leitura/edição protegida; painel lendo agregações da mesma tabela.
- **CSV:** o Supabase exporta nativamente; no admin custom, um botão "exportar filtrado" gera o CSV do recorte atual.
- **Soberania, com honestidade:** o Supabase é open-source e self-hostável (Postgres) — então mesmo começando no Supabase Cloud, o caminho pra infra nacional fica aberto, e o schema é portátil. Como a captação é de **informação aberta**, a aposta de soberania não está aqui: está em onde o catálogo e a IA de triagem vão rodar depois. Não gastar essa preocupação no formulário; gastar no banco e na triagem.
- **Fase 2 (datada, não "depois"):** intake conversacional ("digo meu problema → o sistema me diz o que vai perguntar → captura") e o chatbot de consulta, sobre este mesmo schema. Construído quando o schema estiver provado e houver volume.

---

*Documento de trabalho — BBSIA, Fase 1.0. Schema pronto para implementação e para anexar à coordenação.*
