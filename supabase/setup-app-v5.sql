-- =====================================================================
-- Setup v5 — nome curto (máscara) das unidades
-- Execute UMA VEZ no SQL Editor. Só adiciona uma coluna, não apaga nada.
--
-- A coluna "nickname" da tabela "Unit" guarda o nome curto exibido no
-- app (seletor de inventário, tela inicial e termo). O nome completo
-- ("name") continua sendo usado nos termos gerados. O sistema web
-- ignora a coluna extra.
-- Preencha pelo app: Configurações → Locais e unidades → Editar.
-- =====================================================================

alter table "Unit" add column if not exists nickname text;
