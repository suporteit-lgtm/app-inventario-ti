-- =====================================================================
-- Campos da categoria "Linhas corporativas" (chips / SIM cards)
-- Execute UMA VEZ no SQL Editor. Só adiciona colunas — o sistema web
-- ignora colunas que não conhece, então nada quebra lá.
-- =====================================================================

alter table "Equipment" add column if not exists operadora text;
alter table "Equipment" add column if not exists plano text;
alter table "Equipment" add column if not exists portabilidade text;
alter table "Equipment" add column if not exists iccid text;
alter table "Equipment" add column if not exists telefone text;
alter table "Equipment" add column if not exists "previousUserName" text;

-- Garante que a categoria exista (o app também a cria ao cadastrar)
insert into "Category" (id, name, "unitId", "createdAt")
select 'cat-linhas-corporativas', 'Linhas corporativas', null, now()
where not exists (
  select 1 from "Category" where lower(name) like '%linha%corporativ%'
);

-- Conferência (opcional):
-- select column_name from information_schema.columns
-- where table_name = 'Equipment' and column_name in
--   ('operadora','plano','portabilidade','iccid','telefone','previousUserName');
