-- BBSIA — Curadoria: infraestrutura aberta de IA + metodologia de especificação.
--
-- 8 entradas de terceiros, todas com `publicado=false`: a coordenação revisa antes de expor.
-- Licença e estado conferidos na API do GitHub em 05/08/2026 (não no painel lateral) — o
-- caso do BMAD-METHOD justifica a regra: o GitHub reporta NOASSERTION porque o texto é MIT
-- com cláusula de marca acrescentada.
--
-- Sobre `soberania='brasil_soberano'` em software de autoria estrangeira: o campo responde
-- "onde roda e de quem depende quem adotar", não "quem escreveu". Estes seis rodam no
-- servidor do próprio órgão, sem chamada externa — é justamente o que os distingue.
-- A autoria fica em `orgao`, e a dependência que sobra (pesos de modelo, governança do
-- mantenedor) está declarada em `ressalva`.

insert into public.fundacao
  (tipo, esforco, soberania, nome, descricao, url, orgao, categoria, licenca, stack,
   ressalva, ordem, publicado, verificado_em, fonte)
values
  ('repo','desenvolver','brasil_soberano','Ollama',
   'Roda um modelo de linguagem na máquina do próprio órgão, sem enviar o texto para serviço externo. É a base para usar IA generativa sobre documento sigiloso.',
   'https://github.com/ollama/ollama','Ollama Inc. / comunidade','Infraestrutura de IA','MIT','Go / CLI',
   'A soberania depende de onde ficam os pesos: o download padrão vem de repositório externo. Para uso sensível, o órgão precisa espelhar e versionar os modelos internamente. Exige GPU ou muita RAM conforme o modelo.',
   40,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('repo','desenvolver','brasil_soberano','PaddleOCR',
   'Lê documento digitalizado preservando a estrutura da página — tabela, coluna, carimbo e assinatura —, e não só a linha de texto solta.',
   'https://github.com/PaddlePaddle/PaddleOCR','Baidu / PaddlePaddle','OCR e documentos','Apache-2.0','Python',
   'Governança concentrada em um único mantenedor corporativo estrangeiro (Baidu). Roda local sem chamada externa, mas a continuidade do projeto não depende de comunidade distribuída.',
   41,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('repo','desenvolver','brasil_soberano','Tesseract OCR',
   'Extrai o texto de documento digitalizado. É a linha de base madura de OCR — velha, estável e homologável, com décadas de uso.',
   'https://github.com/tesseract-ocr/tesseract','Comunidade tesseract-ocr','OCR e documentos','Apache-2.0','C++',
   'Precisão cai muito em documento de baixa resolução, manuscrito ou com ruído de digitalização. Para acervo antigo, testar contra amostra real antes de decidir.',
   42,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('repo','desenvolver','brasil_soberano','Whisper',
   'Transcreve áudio para texto — audiência, sessão de colegiado, atendimento de ouvidoria — rodando no servidor do órgão, com os pesos do modelo abertos.',
   'https://github.com/openai/whisper','OpenAI','Voz e áudio','MIT','Python / PyTorch',
   'Voz é dado pessoal: transcrever atendimento ou audiência exige base legal e informe ao titular (LGPD). A transcrição tem erro e não substitui ata — trate como rascunho sujeito a revisão humana.',
   43,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('repo','desenvolver','brasil_soberano','MarkItDown',
   'Converte arquivo de qualquer formato (PDF, Word, Excel, apresentação) em texto estruturado, que é o passo anterior a qualquer processamento por IA.',
   'https://github.com/microsoft/markitdown','Microsoft','Ingestão de documentos','MIT','Python',
   'A conversão perde parte da formatação e do posicionamento. Para documento em que o layout importa (planta, formulário, tabela complexa), conferir o resultado antes de usar como fonte.',
   44,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('repo','desenvolver','brasil_soberano','PageIndex',
   'Recupera a seção certa de um documento longo — norma, edital, relatório — sem picar o texto em pedaços de tamanho fixo, que é o que faz a busca trazer trecho fora de contexto.',
   'https://github.com/VectifyAI/PageIndex','VectifyAI','Recuperação semântica','MIT','Python',
   'Projeto novo e mantido por uma empresa pequena. Menos maturidade que o resto desta prateleira — avaliar o risco de descontinuidade antes de tornar dependência de sistema em produção.',
   45,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('referencia','estudar','nao_se_aplica','Spec Kit',
   'Método para escrever a especificação do que se quer ANTES de desenvolver ou contratar. Ajuda o órgão a descrever o problema em vez de comprar a solução de alguém.',
   'https://github.com/github/spec-kit','GitHub','Metodologia','MIT','Markdown / CLI',
   'É metodologia de desenvolvimento de software adaptada, não norma de contratação pública. Não substitui a instrução normativa de contratação de TIC nem o estudo técnico preliminar — complementa a redação do requisito.',
   46,false,now(),'curadoria da coordenação — licença conferida na API do GitHub'),

  ('referencia','estudar','nao_se_aplica','BMAD-METHOD',
   'Metodologia de desenvolvimento orientado a especificação, independente de fornecedor e de modelo de IA. Serve para estruturar o que se pede antes de qualquer contratação.',
   'https://github.com/bmad-code-org/BMAD-METHOD','BMad Code, LLC','Metodologia','MIT (com cláusula de marca)','Markdown',
   'A licença é texto MIT com cláusula de marca acrescentada — o GitHub a classifica como NOASSERTION, não como MIT. Antes de adotar institucionalmente ou redistribuir material derivado, submeter o texto ao jurídico.',
   47,false,now(),'curadoria da coordenação — licença conferida na API do GitHub');
