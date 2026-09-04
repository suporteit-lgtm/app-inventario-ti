-- =====================================================================
-- Dá à "service_role" a escrita que as Edge Functions precisam.
--
-- Sintoma que resolve:
--   "Falha ao salvar o usuário: permission denied for table User"
--   ao editar um usuário em Usuários e permissões (e o mesmo em criar,
--   excluir e mudar acessos).
--
-- Por quê:
--   O "endurecer-tabela-user.sql" tira a escrita da tabela "User" do
--   app (role "authenticated") e passa a responsabilidade para a função
--   "admin-users", que roda como "service_role". Só que service_role
--   ignora RLS — NÃO ignora GRANT de tabela. Se ela nunca recebeu
--   insert/update/delete, a função apanha do banco e nada salva.
--
-- Por que não usar o corrigir-permissoes.sql aqui:
--   Aquele script também roda
--     grant select, insert, update, delete on all tables ... to authenticated;
--   o que DESFAZ o endurecimento e devolve a qualquer pessoa logada o
--   poder de se promover a ADMIN direto na tabela. Este script mexe
--   apenas na service_role e, no fim, reafirma o fechamento do "User".
--
-- Seguro: só concede acesso à service_role, não altera nem apaga dado.
-- Idempotente. O sistema web não é afetado (conecta como dono das
-- tabelas, isento de RLS e de grants).
-- =====================================================================

-- 1) Acesso ao schema e às tabelas de hoje
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- 2) Tabelas futuras já nascem acessíveis — evita o problema voltar se o
--    time do web rodar uma migration que recrie o schema
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;

-- 3) Reafirma o fechamento da tabela "User" para o app. O passo 1 não
--    tocou em "authenticated", mas deixar explícito evita que rodar este
--    script depois do corrigir-permissoes.sql reabra a brecha.
revoke insert, update, delete on "User" from authenticated;

-- 4) O PostgREST relê o schema na hora
notify pgrst, 'reload schema';


-- =====================================================================
-- CONFERÊNCIA
-- =====================================================================

-- service_role deve listar INSERT, UPDATE, DELETE além de SELECT:
-- select privilege_type from information_schema.role_table_grants
--  where table_schema='public' and table_name='User'
--    and grantee='service_role' order by privilege_type;

-- authenticated deve continuar SÓ com SELECT:
-- select privilege_type from information_schema.role_table_grants
--  where table_schema='public' and table_name='User'
--    and grantee='authenticated' order by privilege_type;

-- Depois, no app: editar um usuário e salvar o CPF deve funcionar.
