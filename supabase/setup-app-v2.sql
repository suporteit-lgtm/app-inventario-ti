-- =====================================================================
-- Setup v2 do APP MOBILE — histórico de alterações + templates padrão
-- Seguro para produção: só cria coisas novas, não altera dados existentes.
-- Execute UMA VEZ no SQL Editor do Supabase (depois do setup-app.sql).
--
-- O que faz:
--   1. Cria a tabela "EquipmentLog" — auditoria de alterações dos
--      equipamentos feita pelo app (ex.: 'IMEI 1 alterado de X para Y').
--   2. Garante os 3 templates padrão de termo (Responsabilidade,
--      Comodato, Devolução) na tabela "DocumentTemplate", caso não
--      existam. Os templates podem ser editados dentro do app em
--      Configurações → Templates de termos.
-- =====================================================================

-- 1) Tabela de auditoria
create table if not exists "EquipmentLog" (
  id text primary key,
  "equipmentId" text not null,
  description text not null,
  "changedBy" text,
  "createdAt" timestamptz not null default now()
);
create index if not exists "EquipmentLog_equipmentId_idx" on "EquipmentLog" ("equipmentId");

alter table "EquipmentLog" enable row level security;
drop policy if exists "app_authenticated_all" on "EquipmentLog";
create policy "app_authenticated_all" on "EquipmentLog"
  for all to authenticated using (true) with check (true);

-- 2) Templates padrão (só insere se ainda não houver um com nome parecido)
insert into "DocumentTemplate" (id, name, content, "updatedAt")
select coalesce((select max(id) from "DocumentTemplate"), 0) + 1,
       'Responsabilidade',
       E'Eu, {NOME}, declaro ter recebido da empresa os equipamentos abaixo, comprometendo-me a zelar por sua guarda e conservação:\n\n{EQUIPAMENTOS}\n\nData: {DATA}   ·   Assinatura: ____________________',
       now()
where not exists (select 1 from "DocumentTemplate" where lower(name) like '%respons%');

insert into "DocumentTemplate" (id, name, content, "updatedAt")
select coalesce((select max(id) from "DocumentTemplate"), 0) + 1,
       'Comodato',
       E'Eu, {NOME}, declaro receber em regime de comodato os equipamentos abaixo, que permanecem de propriedade da empresa e devem ser devolvidos quando solicitado:\n\n{EQUIPAMENTOS}\n\nData: {DATA}   ·   Assinatura: ____________________',
       now()
where not exists (select 1 from "DocumentTemplate" where lower(name) like '%comodato%');

insert into "DocumentTemplate" (id, name, content, "updatedAt")
select coalesce((select max(id) from "DocumentTemplate"), 0) + 1,
       'Devolução',
       E'Eu, {NOME}, declaro ter devolvido à empresa os equipamentos abaixo, nas condições registradas na conferência:\n\n{EQUIPAMENTOS}\n\nData: {DATA}   ·   Assinatura: ____________________',
       now()
where not exists (select 1 from "DocumentTemplate" where lower(name) like '%devolu%');
