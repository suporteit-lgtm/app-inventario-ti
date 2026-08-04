-- =====================================================================
-- Remove da tabela "DocumentTemplate" os textos curtos provisórios que o
-- app usava antes dos documentos oficiais. O app já os ignora sozinho,
-- mas apagá-los evita confusão para quem olhar o banco ou o sistema web.
--
-- Seguro: apaga SOMENTE linhas cujo conteúdo bate exatamente com os
-- textos provisórios. Templates do sistema web e personalizações feitas
-- pelo app não são tocados.
-- =====================================================================

delete from "DocumentTemplate"
where content like '%comprometendo-me a zelar por sua guarda e conservação%'
   or content like '%permanecem de propriedade da empresa e devem ser devolvidos quando solicitado%'
   or content like '%nas condições registradas na conferência%';

-- Conferência: o que sobrou na tabela
-- select id, name, left(content, 80) as inicio from "DocumentTemplate" order by id;
