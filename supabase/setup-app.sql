-- =====================================================================
-- Setup do APP MOBILE no banco EXISTENTE do sistema web (Prisma)
-- Seguro para produção: NÃO altera nem apaga nenhum dado existente.
-- Execute UMA VEZ no SQL Editor do Supabase.
--
-- O que faz:
--   1. Adiciona a coluna "allowedUnitIds" na tabela "User" (acesso do
--      usuário a múltiplas unidades/inventários pelo app). O sistema web
--      (Prisma) ignora colunas extras — nada quebra.
--   2. Liga o Row Level Security (RLS) e cria políticas que permitem
--      acesso APENAS a usuários autenticados (login pelo app).
--      O sistema web NÃO é afetado: o Prisma conecta como dono das
--      tabelas e o dono não é bloqueado pelo RLS.
--      Sem isso, a API pública do Supabase ficaria aberta a qualquer um
--      que tivesse a anon key.
-- =====================================================================

-- 1) Coluna de acessos por unidade no app
alter table "User" add column if not exists "allowedUnitIds" text[];

-- 2) RLS + políticas para o app (role "authenticated")
do $$
declare t text;
begin
  foreach t in array array['Unit','Category','Equipment','User','AssignmentHistory','DocumentTemplate','Settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "app_authenticated_all" on %I', t);
    execute format('create policy "app_authenticated_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- =====================================================================
-- Verificação (opcional): as duas consultas abaixo devem listar as
-- tabelas com rowsecurity = true e as políticas criadas.
-- =====================================================================
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select tablename, policyname, roles from pg_policies where schemaname = 'public';
