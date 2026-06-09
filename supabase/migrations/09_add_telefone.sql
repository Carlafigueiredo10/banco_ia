-- Telefone/WhatsApp opcional do proponente (canal de contato alternativo ao e-mail).
alter table public.submissoes
  add column if not exists telefone text check (char_length(telefone) <= 20);
