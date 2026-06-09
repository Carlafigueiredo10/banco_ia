# Banco Brasileiro de Soluções de IA para a Gestão Pública

> Documento de visão — versão inicial
> Última atualização: 2026-06-08

## O que é

Um banco nacional de soluções de IA para a gestão pública: um lugar onde **qualquer órgão** — de um ministério a uma prefeitura do interior — e também **universidades e ICTs** possam **encontrar** (e **oferecer**) soluções de IA que já funcionam.

A organização é **pelo problema que a solução resolve**, não pela categoria técnica.

Esse é o miolo. Em volta dele, cinco decisões diferenciam o projeto de "mais um repositório".

## Por que importa

O Brasil não tem visão do que já existe — há gente fazendo coisa boa, espalhada, sem ninguém enxergar. O banco é o **radar**.

Todo mundo discursa soberania; pouca gente está construindo a ferramenta que a torna real. É isso que estamos fazendo.

---

## Os 5 diferenciais (que viram requisito de sistema)

### 1. Aberto e soberano — não só simples
A facilidade de "pegar e usar" é a porta de entrada, mas o DNA é o que separa este banco de uma lista qualquer: cada solução diz
- se é **reusável por outro órgão**, e
- se **roda em infra nacional** ou depende de serviço estrangeiro.

Soberania não é discurso — é a **etiqueta no ativo**. E é prática: por isso a captação não é um Google Form emprestado da big tech, é **sistema próprio (Claude Code + Supabase)**. Se um laboratório de inovação em IA prega soberania, ele constrói.

### 2. Entrada pela dor
A lógica da Estônia aplicada a quem oferece solução: a pessoa chega, **descreve o problema em português de gente**, e o sistema **classifica, devolve e encaminha**.

A jornada do órgão: **receber → tratar → devolver → encaminhar**.

Quem é menos letrado resolve em poucos cliques; quem quer profundidade tem por onde.

### 3. Maturação não-punitiva, mas honesta
Status que muda no tempo: **Mapeada → Em adequação → Validada**, calculado a partir de **fatos que o contribuinte sabe**, nunca autodeclarado.

Solução imatura não é rejeitada — é **acolhida e encaminhada** à comunidade, com **motivo e próximo passo concretos**. Mas há **piso**: o que é inseguro reusar em produção **diz isso na cara**. Acolher sem fingir que está tudo bem.

### 4. Captado em escala, sem virar portão
Formulário-fato + **IA como triagem, não como juíza**: ela **deduplica, etiqueta e ordena a fila**; o humano só confirma o verde consequente.

Nada é descartado em silêncio — porque governança punitiva destrói justamente a informação de que ela depende.

### 5. Construído com o público, não para o público
"**Não faça nada por mim sem mim.**" Governança que se posiciona pela **diversidade** de forma ativa, com **recomendações sempre rastreáveis à fonte** — o oposto da opacidade que ela combate.

E **letramento como proteção**: na prática, isso é a vida das pessoas, não um conceito na nuvem.

---

## O primeiro tijolo (MVP atual)

O **sistema de captação** que abastece o banco:

- **Formulário público** de submissão de soluções
- **View de admin da Eunice** (triagem / curadoria)
- **Export** das soluções
- **Indicadores**

É por ele que entram as **30 soluções de lançamento**, e é ele que prova, já no primeiro passo, que **dá pra construir em casa**.

---

## Stack

- **Captação / backend:** Claude Code + Supabase
- Hospedagem de front a definir (Vercel / Render disponíveis)

---

## Status do projeto

- [x] Visão definida
- [x] Especificação detalhada do primeiro tijolo
- [x] Perguntas de esclarecimento respondidas
- [x] Plano de implementação
- [x] Implementação do MVP de captação (banco + RLS, formulário público, admin, export, indicadores)
- [x] Build verde + 38 testes + matriz de RLS + smoke test end-to-end
- [ ] Deploy na Vercel (aguardando OK + redirect URL do Supabase Auth)
- [ ] Carga das 30 soluções de lançamento (aguardando planilha)
