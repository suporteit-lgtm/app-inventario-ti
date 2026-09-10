-- =====================================================================
-- Termos: o app passa a LER E ESCREVER na MESMA tabela do sistema web.
--
-- Antes este script criava uma tabela própria ("TermoEnvio"). Isso obrigava
-- a lançar o termo duas vezes — uma no web, outra no app — e as duas telas
-- discordavam. Agora os dois usam "TermSubmission", que o sistema web já
-- cria pela migration 20260908130000_term_submission.
--
-- Este script NÃO cria tabela. Ele só:
--   1. libera o acesso do app (leitura) e das Edge Functions (escrita)
--   2. liga o realtime, que é o que faz a tela mudar sozinha
--
-- PRÉ-REQUISITO: o sistema web precisa ter rodado a migration dele. Se a
-- tabela não existir, o script avisa e não faz nada.
--
-- Seguro: não cria, não altera e não apaga dado. Idempotente.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'TermSubmission'
  ) then
    raise notice '"TermSubmission" não existe. Rode a migration do sistema web antes (backend: npx prisma migrate deploy).';
    return;
  end if;

  -- --- Acesso -------------------------------------------------------
  -- O app lê; quem escreve são as Edge Functions (service_role) e o
  -- sistema web (conecta como dono da tabela, isento de RLS e de grants).
  execute 'alter table "TermSubmission" enable row level security';
  execute 'drop policy if exists "app_termo_leitura" on "TermSubmission"';
  execute 'create policy "app_termo_leitura" on "TermSubmission" for select to authenticated using (true)';

  execute 'grant select on "TermSubmission" to authenticated';
  execute 'grant all privileges on "TermSubmission" to service_role';
  execute 'revoke insert, update, delete on "TermSubmission" from authenticated';
  execute 'revoke all on "TermSubmission" from anon';

  -- --- Realtime -----------------------------------------------------
  -- Só habilita a leitura do WAL: não cria trigger, não altera dado e o
  -- Prisma/sistema web não é afetado.
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'TermSubmission'
  ) then
    execute 'alter publication supabase_realtime add table "TermSubmission"';
  end if;

  raise notice 'TermSubmission liberada para o app e publicada no realtime.';
end $$;

-- Equipment no realtime: é o que faz um cadastro feito no sistema web (ou
-- em outro celular) aparecer no app sem fechar e abrir.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Equipment'
  ) then
    execute 'alter publication supabase_realtime add table "Equipment"';
  end if;
end $$;

notify pgrst, 'reload schema';


-- =====================================================================
-- SE VOCÊ JÁ RODOU A VERSÃO ANTERIOR DESTE SCRIPT
-- =====================================================================
-- Ela criou uma tabela "TermoEnvio" que não é mais usada. Ela não
-- atrapalha, mas se quiser limpar, rode a linha abaixo À MÃO — confira
-- antes que não há nada que você queira lá dentro:
--
--   select count(*) from "TermoEnvio";
--   drop table if exists "TermoEnvio";


-- =====================================================================
-- CONFERÊNCIA
-- =====================================================================

-- As duas tabelas devem aparecer na publicação do realtime:
-- select tablename from pg_publication_tables
--  where pubname = 'supabase_realtime' and schemaname = 'public'
--  order by tablename;

-- authenticated deve ter só SELECT em TermSubmission:
-- select privilege_type from information_schema.role_table_grants
--  where table_schema='public' and table_name='TermSubmission'
--    and grantee='authenticated' order by privilege_type;
