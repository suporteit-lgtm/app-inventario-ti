-- =====================================================================
-- Colunas da tabela "Unit" usadas pelo app nos termos.
--
-- Por que: o termo imprime o nome completo, o CNPJ e o endereço da
-- unidade ({EMPRESA}, {CNPJ_EMPRESA}, {ENDERECO}). Se as colunas não
-- existirem no banco, dois sintomas aparecem juntos:
--   1. o termo sai com linha pontilhada no lugar do CNPJ e do endereço;
--   2. Configurações › Locais e unidades não salva, porque a gravação
--      inclui uma coluna que o banco não conhece.
--
-- Nenhum script anterior criava "cnpj" e "address" — elas vinham do
-- schema do sistema web. Este script fecha essa lacuna.
--
-- Seguro: só adiciona coluna, com "if not exists". Não altera nem apaga
-- dado nenhum, e rodar de novo não faz efeito. O sistema web ignora
-- coluna extra que não esteja no schema dele.
-- =====================================================================

alter table "Unit" add column if not exists cnpj text;
alter table "Unit" add column if not exists address text;
alter table "Unit" add column if not exists nickname text;

-- Conferência: as três colunas devem aparecer na lista
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'Unit'
--  order by ordinal_position;

-- Depois de rodar, preencha CNPJ e endereço de cada unidade pelo app,
-- em Configurações › Locais e unidades › editar.
