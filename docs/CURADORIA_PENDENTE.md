# Curadoria pendente — catálogo de soluções

Diagnóstico de 05/08/2026. Base: as 88 linhas de `catalogo_solucoes`, com os links testados um a um.

Fica aqui, e não no banco, porque não há coluna de nota de curadoria — e criar uma só para isto seria
schema novo antes da conversa. Ao resolver um item, atualize a linha no `/admin/catalogo` e risque-o
daqui.

## Publicadas em 05/08/2026 (4 → 14)

Critério aplicado: **nome real + órgão + uma frase do que faz + link que funciona**. Ter link não
basta: um card sem nome nem descrição não informa ninguém e desgasta o catálogo.

- 8 DPGs internacionais: AI Agro, Dymaxion Labs Toolkit, I-Stem, iVerify, Kindly, Koster Seafloor
  Observatory, OTTAA Project, Zamba
- 2 do bloco `gov`: eDemocracia (Câmara), LibreSign (Assinatura Digital)

Todas com `revisado = true`.

---

## 1. Link morto — corrigir ou despublicar de vez (2)

| Solução | Link | Situação |
|---|---|---|
| Projeto Hermes — MJSP | `https://gov.br/mj/hermes` | **404** — o caminho não existe |
| Assistente Redação Policial (GCM) | `https://chatgpt.com/g/redator-ocorrencias` | **404** — e GPT custom de conta pessoal não é solução publicável; some quando a conta muda |

## 2. Link impróprio — aponta para o lugar errado (2)

| Solução | Link | Problema |
|---|---|---|
| Chat IA — UFMA | `https://homologacao-chat.ufma.br` | Responde 200, mas é **ambiente de homologação** de outra instituição — mesmo problema que nos fez pôr tarja e `noindex` na vitrine do CNJ |
| Detecção de Resíduos — Porto Santos | `https://dataoverseas.com.br` | Home institucional de **empresa privada**, não leva à solução. É o caso que a coordenação já corrigiu no Software Público (link genérico não vale) |

## 3. Sem ficha — 9 do bloco `formulario`

Todas com **título gerado automaticamente** (`IA — <área> | <órgão>`), `descricao` vazia e `impacto`
vazio ou sem conteúdo útil ("Ainda não, pois está em fase inicial", "Não se aplica").

Falta o básico para existir como card: **nome real da solução e uma frase do que ela faz**. Os campos
de taxonomia (área, tipo, risco, soberania, licença) já estão preenchidos — o buraco é a identidade.

- IA — Administração/Processos | LibreCode coop
- IA — Educação | Universidade Federal do Maranhão
- IA — Fazenda/Tributação | UFPI
- IA — Gestão Pública | Associação de Educação e Cidadania Santos Dumont
- IA — Meio Ambiente | DATA OVERSEAS *(link é um design do Canva — 403)*
- IA — Meio Ambiente | EITA Recife
- IA — Saúde | Kidzenith Ai
- IA — Segurança Pública | Guarda Civil de Contagem-MG
- IA — Segurança Pública | Ministério da Justiça e Segurança Pública *(link é a home do ministério)*

## 4. Duplicatas entre blocos (5 pares)

As entradas de `formulario` são as submissões cruas; as de `gov` são a versão curada da **mesma**
solução. Hoje as duas coexistem, e publicar as duas mostraria a mesma coisa duas vezes no catálogo.

| Submissão crua (`formulario`) | Versão curada (`gov`) |
|---|---|
| IA — Administração/Processos \| LibreCode coop | LibreSign (Assinatura Digital) ✅ publicada |
| IA — Educação \| Universidade Federal do Maranhão | Chat IA — UFMA |
| IA — Segurança Pública \| Guarda Civil de Contagem-MG | Assistente Redação Policial (GCM) |
| IA — Meio Ambiente \| DATA OVERSEAS | Detecção de Resíduos — Porto Santos |
| IA — Segurança Pública \| MJSP | Projeto Hermes — MJSP |

Sugestão: manter a versão do bloco `gov` (tem nome real) e arquivar a do `formulario`
(`status = 'arquivado'`), preservando `origem_submissao_id` para não perder a rastreabilidade de quem
submeteu. **Sem DELETE** — o banco não permite, e é regra do projeto.

## 5. Os outros 61 privados, sem link

Travados pela regra de só publicar com link que funcione: 29 do `formulario`, 23 do `mgi`, 8 do `gov`
e 1 do `software_publico`. Enquanto não houver URL que leve à solução, seguem privados.

O bloco `mgi` (23) é o maior grupo e **nenhuma tem link** — vale decidir em conjunto o que fazer com
ele, em vez de item a item.

## 6. Submissões nunca promovidas (70)

Existem em `submissoes` e nunca viraram linha do catálogo. Entram na conta de "Soluções mapeadas" da
home, mas não aparecem em lugar nenhum público. É o maior estoque de curadoria represada do banco.
