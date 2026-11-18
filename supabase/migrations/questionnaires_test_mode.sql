-- Test mode for the client questionnaires (dashboard → Analytics → "Test").
--
-- The practitioner can send a questionnaire to themselves to try it out. A
-- test link belongs to no client: client_id is null and is_test is true. Every
-- non-test row must still have a client (the check constraints below), so
-- real results can never lose their owner. Test emails go to the practice's
-- own address; test results are labelled "Test" in the dashboard, left out of
-- the caseload figures, and can be cleared with one button.
--
-- Idempotent and safe to re-run.

alter table public.questionnaire_tokens    add column if not exists is_test boolean not null default false;
alter table public.questionnaire_responses add column if not exists is_test boolean not null default false;

alter table public.questionnaire_tokens    alter column client_id drop not null;
alter table public.questionnaire_responses alter column client_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'questionnaire_tokens_client_or_test') then
    alter table public.questionnaire_tokens
      add constraint questionnaire_tokens_client_or_test
      check ((is_test and client_id is null) or (not is_test and client_id is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'questionnaire_responses_client_or_test') then
    alter table public.questionnaire_responses
      add constraint questionnaire_responses_client_or_test
      check ((is_test and client_id is null) or (not is_test and client_id is not null));
  end if;
end $$;

-- Verify: expect 2 rows, both is_test_column = true and client_id_nullable = 'YES'.
select c.table_name, true as is_test_column, n.is_nullable as client_id_nullable
from information_schema.columns c
join information_schema.columns n
  on n.table_schema = c.table_schema and n.table_name = c.table_name and n.column_name = 'client_id'
where c.table_schema = 'public' and c.column_name = 'is_test'
  and c.table_name in ('questionnaire_tokens', 'questionnaire_responses')
order by 1;
