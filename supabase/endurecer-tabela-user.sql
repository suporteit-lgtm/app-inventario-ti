-- =====================================================================
-- MUDANÇA 2 — Fechar a tabela "User"
--
-- Problema que resolve:
--   A política atual permite que QUALQUER pessoa logada altere qualquer
--   linha da tabela "User" — inclusive a própria. Na prática, um Técnico
--   consegue se promover a Admin com uma única chamada, e a partir daí
--   passa na checagem de administrador da função "admin-users", que roda
--   com service_role.
--
-- Depois deste script:
--   · cada pessoa lê a lista de usuários (a tela de Usuários precisa)
--   · ninguém escreve na tabela pelo app — nem o próprio Admin
--   · criar, editar, excluir e mudar acessos passa a ser exclusividade da
--     função "admin-users", que confere o cargo antes de gravar
--
-- >>> NÃO RODE ANTES DE:
--   1. publicar a versão nova da função "admin-users"
--      (supabase/functions/admin-users/index.ts)
--   2. instalar em todos os aparelhos o APK que fala com ela
--   Rodar antes disso faz a tela de Usuários parar de funcionar para
--   quem estiver com a versão antiga.
--
-- O sistema web não é afetado: conecta como "postgres", dono das tabelas,
-- isento de RLS. Nenhum "force row level security" é usado aqui.
-- Idempotente.
-- =====================================================================

-- Leitura continua liberada para quem está logado: a tela de Usuários
-- lista todo mundo, e o app resolve nome/cargo a partir daqui.
drop policy if exists "app_authenticated_all" on "User";
drop policy if exists "app_user_leitura" on "User";
create policy "app_user_leitura" on "User"
  for select to authenticated
  using (true);

-- Nenhuma política de insert/update/delete para "authenticated".
-- Sem política, o RLS nega — e a service_role (que a função Edge usa)
-- passa por cima do RLS, então a função continua gravando normalmente.

-- Tira as permissões de escrita também no nível de tabela, para o erro
-- aparecer como "permission denied" em vez de sumir silenciosamente.
revoke insert, update, delete on "User" from authenticated;


-- =====================================================================
-- CONFERÊNCIA
-- =====================================================================

-- 1) Deve listar APENAS a política de leitura:
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'public' and tablename = 'User';

-- 2) Teste real, o que importa. Logado no app como TÉCNICO, tente:
--      update "User" set role = 'ADMIN' where email = '<seu email>';
--    pelo app (não pelo SQL Editor — aqui você é postgres e passa).
--    O esperado é falhar. Se passar, algo ficou aberto: me avise.

-- 3) Depois de aplicar, confirme no app: criar usuário, editar usuário,
--    excluir usuário e mudar acessos na tela de Permissões.


-- =====================================================================
-- COMO REVERTER (se a tela de Usuários quebrar)
-- =====================================================================
-- grant insert, update, delete on "User" to authenticated;
-- drop policy if exists "app_user_leitura" on "User";
-- create policy "app_authenticated_all" on "User"
--   for all to authenticated using (true) with check (true);
