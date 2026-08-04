-- =====================================================================
-- ENDURECIMENTO DE ACESSO (mudanças 1, 3 e 4)
--
-- O que este script NÃO faz:
--   · não apaga, move nem altera nenhum dado
--   · não cria, remove nem renomeia coluna
--   · não usa "force row level security" — o dono das tabelas (postgres,
--     que é como o sistema web conecta via Supavisor) continua isento de
--     RLS. O sistema web NÃO é afetado por nada aqui.
--   · não mexe na tabela "User" — isso é a mudança 2, que exige alterar
--     o app antes, senão a tela de Usuários para de funcionar.
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- Rode inteiro, de uma vez, no SQL Editor.
-- =====================================================================


-- =====================================================================
-- PARTE 1 — Tirar o acesso do visitante não-logado ("anon")
--
-- O script antigo dava leitura ao "anon" em toda tabela existente E
-- mandava repetir isso automaticamente em toda tabela futura. Hoje as
-- tabelas conhecidas estão protegidas por RLS, mas qualquer tabela nova
-- criada por uma migration do sistema web nasceria legível por quem
-- tivesse a anon key — que está embutida no APK, em qualquer celular.
--
-- O app nunca usa "anon" para dados: ele faz login antes de consultar.
-- =====================================================================

-- Tabelas e sequences que existem hoje
revoke select on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- E, principalmente, a regra que replicava isso nas tabelas FUTURAS
alter default privileges in schema public revoke select on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Idem para tabelas futuras e o usuário logado: sem isso, uma tabela nova
-- nasce gravável por qualquer pessoa logada e sem RLS nenhum.
-- (As tabelas de HOJE não são afetadas: seus grants continuam de pé.)
-- Para reverter só esta linha:
--   alter default privileges in schema public
--     grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  revoke select, insert, update, delete on tables from authenticated;

-- Obs.: "grant usage on schema public to anon" é mantido de propósito.
-- Ele não expõe dado nenhum sozinho e removê-lo tem efeito colateral em
-- partes internas do Supabase.


-- =====================================================================
-- PARTE 2 — Funções auxiliares: quem é o usuário logado
--
-- São "security definer" porque precisam ler a tabela "User" sem
-- esbarrar no próprio RLS que estamos criando.
-- =====================================================================

create or replace function public.app_eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(upper(role) like '%ADMIN%'), false)
  from "User"
  where lower(email) = lower(auth.jwt() ->> 'email')
$$;

-- Devolve a lista de inventários que o usuário pode ver.
--   NULL  = pode ver todos (é Admin)
--   {}    = não pode ver nenhum (não configurado — falha fechando)
create or replace function public.app_unidades_permitidas()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when upper(role) like '%ADMIN%' then null
    when "allowedUnitIds" is not null and cardinality("allowedUnitIds") > 0
      then "allowedUnitIds"
    when "unitId" is not null then array["unitId"]
    else array[]::text[]
  end
  from "User"
  where lower(email) = lower(auth.jwt() ->> 'email')
  limit 1
$$;

revoke execute on function public.app_eh_admin() from public, anon;
revoke execute on function public.app_unidades_permitidas() from public, anon;
grant execute on function public.app_eh_admin() to authenticated;
grant execute on function public.app_unidades_permitidas() to authenticated;


-- =====================================================================
-- PARTE 3 — Fazer a divisão por inventário valer no banco
--
-- Hoje ela existe só na tela do app: o banco entrega tudo para qualquer
-- pessoa logada e o app esconde o que não é da unidade. Aqui o banco
-- passa a respeitar EXATAMENTE a mesma lista que o Admin já preencheu
-- na tela de Usuários ("allowedUnitIds").
--
-- Quem é Admin continua vendo tudo. Quem é Técnico continua vendo os
-- inventários que o Admin liberou — 1, 3, 4, quantos forem.
-- =====================================================================

-- --- Equipamentos ---------------------------------------------------
drop policy if exists "app_authenticated_all" on "Equipment";
drop policy if exists "app_equipamento_por_unidade" on "Equipment";
create policy "app_equipamento_por_unidade" on "Equipment"
  for all to authenticated
  using (
    public.app_unidades_permitidas() is null
    or "unitId" = any (public.app_unidades_permitidas())
  )
  with check (
    public.app_unidades_permitidas() is null
    or "unitId" = any (public.app_unidades_permitidas())
  );

-- --- Inventários / unidades -----------------------------------------
drop policy if exists "app_authenticated_all" on "Unit";
drop policy if exists "app_unidade_por_acesso" on "Unit";
create policy "app_unidade_por_acesso" on "Unit"
  for all to authenticated
  using (
    public.app_unidades_permitidas() is null
    or id = any (public.app_unidades_permitidas())
  )
  with check (public.app_eh_admin());

-- --- Categorias (as de unitId nulo são globais, todos veem) ----------
drop policy if exists "app_authenticated_all" on "Category";
drop policy if exists "app_categoria_por_unidade" on "Category";
create policy "app_categoria_por_unidade" on "Category"
  for all to authenticated
  using (
    public.app_unidades_permitidas() is null
    or "unitId" is null
    or "unitId" = any (public.app_unidades_permitidas())
  )
  with check (
    public.app_unidades_permitidas() is null
    or "unitId" is null
    or "unitId" = any (public.app_unidades_permitidas())
  );

-- --- Histórico de movimentações (segue o equipamento) ----------------
drop policy if exists "app_authenticated_all" on "AssignmentHistory";
drop policy if exists "app_historico_segue_equipamento" on "AssignmentHistory";
create policy "app_historico_segue_equipamento" on "AssignmentHistory"
  for all to authenticated
  using (
    exists (select 1 from "Equipment" e where e.id = "equipmentId")
  )
  with check (
    exists (select 1 from "Equipment" e where e.id = "equipmentId")
  );

-- --- Log de alterações (segue o equipamento) ------------------------
do $$
begin
  if to_regclass('public."EquipmentLog"') is not null then
    execute 'drop policy if exists "app_authenticated_all" on "EquipmentLog"';
    execute 'drop policy if exists "app_log_segue_equipamento" on "EquipmentLog"';
    execute 'create policy "app_log_segue_equipamento" on "EquipmentLog"
      for all to authenticated
      using (exists (select 1 from "Equipment" e where e.id = "equipmentId"))
      with check (exists (select 1 from "Equipment" e where e.id = "equipmentId"))';
  end if;
end $$;

-- Obs.: "User", "DocumentTemplate" e "Settings" ficam como estão.
-- Apertar a "User" é a mudança 2 e quebra a tela de Usuários se for
-- feita antes de mover as gravações do app para a função admin-users.


-- =====================================================================
-- CONFERÊNCIA — rode depois e confira o resultado
-- =====================================================================

-- 1) Nenhuma linha deve aparecer. Se aparecer, o "anon" ainda lê algo:
-- select table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and grantee = 'anon';

-- 2) Toda tabela do schema deve ter rowsecurity = true. Se uma tabela
--    nova do sistema web aparecer com false, ela não está protegida por
--    RLS — mas também não é legível pelo "anon" depois da Parte 1.
--    Vale rodar isto de vez em quando, ou após cada deploy do web:
-- select tablename, rowsecurity
-- from pg_tables where schemaname = 'public' order by rowsecurity, tablename;

-- 3) As políticas ativas:
-- select tablename, policyname, cmd, roles
-- from pg_policies where schemaname = 'public' order by tablename;
