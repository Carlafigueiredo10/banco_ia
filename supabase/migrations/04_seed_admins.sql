-- Seed de bootstrap (intencional, versionado): sem isso ninguém vira admin.
-- AO INSTALAR: troque o e-mail abaixo pelo do seu primeiro admin antes de aplicar
-- esta migration. Depois, novos admins podem ser convidados pela própria tela
-- (/admin/admins). A autorização é esta tabela + a função private.is_admin().
insert into public.admins (email, convidado_por) values
  ('admin@example.gov.br', 'seed')
on conflict (email) do nothing;
