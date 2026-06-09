-- Consentimento de formulário é exigido só quando origem='formulario'.
-- Registros de carga inicial (origem='importacao') têm base legal distinta.
alter table public.submissoes drop constraint if exists submissoes_consentimento_lgpd_check;
alter table public.submissoes
  add constraint submissoes_consentimento_formulario_check
  check (origem <> 'formulario' or consentimento_lgpd = true);
