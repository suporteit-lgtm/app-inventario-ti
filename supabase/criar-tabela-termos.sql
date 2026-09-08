-- =====================================================================
-- Tabela "TermoEnvio" — o histórico de termos que o app não tinha.
--
-- Hoje o app gera o PDF, manda para a Clicksign e esquece: não havia
-- onde registrar quem recebeu, quem assinou, quem recusou, nem o link do
-- arquivo no Drive. Esta tabela é a base da tela "Termos por colaborador".
--
-- Quem escreve aqui são as Edge Functions (service_role):
--   clicksign-send    → insere com status 'enviado'
--   clicksign-webhook → passa para 'assinado' (com o link do Drive) ou
--                       'recusado' (com o motivo)
-- O app apenas lê. O status "não enviado" NÃO fica aqui: é deduzido na
-- tela, para quem tem equipamento e nenhuma linha nesta tabela.
--
-- Seguro: cria tabela nova, não altera nem apaga nada existente.
-- Idempotente. O sistema web ignora tabela que não está no schema dele.
-- =====================================================================

create table if not exists "TermoEnvio" (
  id            text primary key,
  "documentKey" text unique,          -- chave do documento na Clicksign
  colaborador   text not null,
  "emailColaborador" text,
  unidade       text,
  template      text,
  equipamentos  text[],
  status        text not null default 'enviado',   -- enviado | assinado | recusado
  "driveFileId" text,                 -- id do PDF assinado no Google Drive
  "motivoRecusa" text,
  "enviadoPor"  text,
  "enviadoEm"   timestamptz not null default now(),
  "assinadoEm"  timestamptz,
  "recusadoEm"  timestamptz
);

create index if not exists "TermoEnvio_colaborador_idx" on "TermoEnvio" (colaborador);
create index if not exists "TermoEnvio_status_idx" on "TermoEnvio" (status);
create index if not exists "TermoEnvio_unidade_idx" on "TermoEnvio" (unidade);

-- RLS: o app (authenticated) só LÊ. Quem grava é a service_role das
-- Edge Functions, que passa por cima do RLS — mesmo desenho da tabela
-- "User" depois do endurecimento.
alter table "TermoEnvio" enable row level security;

drop policy if exists "app_termo_leitura" on "TermoEnvio";
create policy "app_termo_leitura" on "TermoEnvio"
  for select to authenticated
  using (true);

grant usage on schema public to authenticated, service_role;
grant select on "TermoEnvio" to authenticated;
grant all privileges on "TermoEnvio" to service_role;
revoke insert, update, delete on "TermoEnvio" from authenticated;


-- =====================================================================
-- REALTIME — é o que faz a tela mudar sozinha, sem fechar e abrir o app
--
-- Adiciona as tabelas à publicação que o Supabase Realtime escuta. Isso
-- só habilita a leitura do WAL; não altera dado, não cria trigger e o
-- Prisma/sistema web não é afetado.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['Equipment', 'TermoEnvio'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';


-- =====================================================================
-- CONFERÊNCIA
-- =====================================================================

-- 1) A tabela existe e está vazia (ainda):
-- select count(*) from "TermoEnvio";

-- 2) As duas tabelas devem aparecer na publicação do realtime:
-- select tablename from pg_publication_tables
--  where pubname = 'supabase_realtime' and schemaname = 'public'
--  order by tablename;

-- 3) authenticated deve ter só SELECT em "TermoEnvio":
-- select privilege_type from information_schema.role_table_grants
--  where table_schema='public' and table_name='TermoEnvio'
--    and grantee='authenticated' order by privilege_type;
