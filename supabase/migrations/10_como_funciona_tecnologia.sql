-- "Como funciona?" (texto opcional) + "Tecnologia de IA" (enum opcional, assistido por heurística)
alter table public.submissoes
  add column if not exists como_funciona text check (char_length(como_funciona) <= 2000),
  add column if not exists tecnologia_ia text check (
    tecnologia_ia is null or tecnologia_ia in
    ('nlp','visao','ml_preditivo','recomendacao','otimizacao','fala','outro','nao_sei')
  );
