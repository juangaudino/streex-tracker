revoke all on public.earnings_attributions from anon;
revoke delete, truncate, references, trigger on public.earnings_attributions from authenticated;

grant select, insert, update on public.earnings_attributions to authenticated;
