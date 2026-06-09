-- Seed de bootstrap (intencional, versionado): sem isso ninguém vira admin.
insert into public.admins (email, convidado_por) values
  ('eunice.liu@enap.gov.br', 'seed'),
  ('carlacristinesoares@gmail.com', 'seed')
on conflict (email) do nothing;
