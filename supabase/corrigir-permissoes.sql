-- =====================================================================
-- Restaura as permissões de acesso do schema public para TODAS as roles
-- usadas pelo Supabase — inclusive a "service_role", que é a identidade
-- das Edge Functions e ficou de fora do script anterior.
--
-- Sintoma que isso corrige:
--   "permission denied for schema public" nas Edge Functions
--   (clicksign-send, clicksign-webhook, admin-users)
--
-- Seguro: só concede acesso, não altera nem apaga dados.
-- O sistema web não é afetado (o Prisma conecta como dono das tabelas).
--
-- >>> CUIDADO se você já rodou o "endurecer-tabela-user.sql":
--   a linha que concede escrita a "authenticated" (mais abaixo) DESFAZ
--   aquele endurecimento e devolve a qualquer pessoa logada o poder de
--   se promover a ADMIN direto na tabela "User". Para só destravar as
--   Edge Functions sem reabrir isso, use
--   "permitir-escrita-edge-functions.sql".
-- =====================================================================

-- 1) Acesso ao schema
grant usage on schema public to anon, authenticated, service_role;

-- 2) Acesso às tabelas existentes
--    service_role: acesso total (é ela que roda as Edge Functions)
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

--    authenticated: leitura e escrita (o RLS limita o que cada um vê)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

--    anon: apenas leitura (o RLS bloqueia tudo na prática)
grant select on all tables in schema public to anon;

-- 3) Tabelas FUTURAS já nascem com as permissões — é isto que evita o
--    problema se o time do web rodar outra migration que recrie o schema
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant select on tables to anon;

-- =====================================================================
-- Conferência (opcional): deve listar service_role com privilégios
-- =====================================================================
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and grantee = 'service_role'
-- limit 20;
