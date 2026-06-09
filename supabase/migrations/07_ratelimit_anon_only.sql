-- check_rate_limit é entrypoint só do formulário público (anon). authenticated não precisa.
-- (Supabase concede EXECUTE ao authenticated por default privileges; revogamos explicitamente.)
revoke execute on function public.check_rate_limit(text) from authenticated;
grant execute on function public.check_rate_limit(text) to anon;
