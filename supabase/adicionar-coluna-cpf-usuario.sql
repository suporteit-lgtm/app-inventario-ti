-- =====================================================================
-- Coluna "cpf" da tabela "User" — o CPF que sai na assinatura dos termos
-- e que a tela Usuários e permissões grava.
--
-- Sintoma que este script resolve: você edita o CPF de um usuário, a tela
-- diz "Usuário atualizado", mas ao reabrir o campo está vazio. Isso
-- acontece quando o banco recusa a coluna "cpf" — e há duas causas:
--
--   1. a coluna não existe (o "restore-after-reset.sql" já a cria, mas um
--      banco montado por outro caminho pode não tê-la);
--   2. a coluna existe, mas o PostgREST — a API que o app usa — ainda tem
--      o schema antigo em cache e responde "Could not find the 'cpf'
--      column of 'User' in the schema cache". O cache costuma se atualizar
--      sozinho, mas o "notify" abaixo força na hora.
--
-- Seguro: só adiciona coluna, com "if not exists". Não altera nem apaga
-- dado nenhum, e rodar de novo não faz efeito.
-- =====================================================================

alter table "User" add column if not exists cpf text;

-- Faz o PostgREST reler o schema imediatamente
notify pgrst, 'reload schema';

-- Conferência: a coluna deve aparecer, e os CPFs já gravados devem vir
-- select name, email, cpf from "User" order by name;
