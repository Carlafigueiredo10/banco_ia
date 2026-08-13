-- BBSIA — Conferência dos links das bases (05/08/2026) e primeira aplicação do gate
-- `verificado_em`. Os 21 registros sem data foram testados por HTTP e, nos duvidosos,
-- por leitura do conteúdo da página. Resultado: 16 corretos, 2 URLs erradas, 1 ficha sem
-- objeto localizável, 2 apontando para portal extinto (já privados).
--
-- Data fixada em literal, não now(): migration é histórico, e um `db reset` não pode
-- carimbar como conferido hoje algo que foi conferido naquele dia.

-- 1) SEI — a URL antiga responde 404 (confirmado com user-agent de navegador).
--    A página vigente do SEI dentro do PEN responde 200.
update public.fundacao set
  url = 'https://www.gov.br/gestao/pt-br/assuntos/gestaoeinovacao/informacoes-sistemas-e-servicos-de-gestao/processo-eletronico-nacional/conteudo/SEI',
  verificado_em = '2026-08-05T00:00:00Z'
where nome = 'SEI';

-- 2) Compras (Gov.br) — /dados-abertos redirecionava para a home do portal. O portal de
--    dados abertos existe em outro caminho; como a ficha é de API/base, aponta para ele.
update public.fundacao set
  url = 'https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos',
  verificado_em = '2026-08-05T00:00:00Z'
where nome = 'Compras (Gov.br)';

-- 3) BusCA — despublicado. A URL responde 200 mas leva à home do Governo Digital, que não
--    menciona a ferramenta; busca pública não localizou nenhum "BusCA" do SGD/MGI. A ficha
--    ainda afirma licença MIT sem fonte. Fica privada até alguém do SGD confirmar o objeto.
--    NÃO recebe verificado_em: foi conferida e reprovou — carimbar seria registrar o
--    contrário do que aconteceu.
update public.fundacao set
  publicado = false,
  ressalva = 'Ficha não confirmada. Em 05/08/2026 a URL levava à home do Governo Digital, sem menção à ferramenta, e não foi localizada publicação do BusCA pelo SGD/MGI. A licença MIT declarada não tem fonte. Confirmar objeto, link e licença com o SGD antes de republicar.'
where nome = 'BusCA (Busca Semântica)';

-- 4) Os 16 que passaram na conferência (HTTP 200 e conteúdo correspondente à ficha).
update public.fundacao set verificado_em = '2026-08-05T00:00:00Z'
where verificado_em is null
  and nome in (
    'Portal Brasileiro de Dados Abertos','IBGE — Serviço de Dados','Portal da Transparência (CGU)',
    'Receita Federal — CNPJ','DATASUS','TSE — Dados Abertos','InVesalius','e-SUS','Fala.BR',
    'CAR — Cadastro Ambiental Rural','i-Educar','DREX','PIX','ASES','Cacic','GGAS'
  );

-- 5) Participa+ e Painel SUS seguem sem verificado_em de propósito: apontam para a raiz do
--    softwarepublico.gov.br, que passou a responder 404 (o portal migrou; só as páginas
--    /social/<nome> sobreviveram). Já estavam privados desde a regra "só publicar com link".
update public.fundacao set
  ressalva = 'Link quebrado: a raiz do softwarepublico.gov.br responde 404 desde a migração do portal (verificado em 05/08/2026). Localizar a página /social/ correspondente ou outra fonte oficial antes de publicar.'
where nome in ('Participa+','Painel SUS');
