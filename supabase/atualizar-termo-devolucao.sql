-- =====================================================================
-- Atualiza o termo de DEVOLUÇÃO na tabela "DocumentTemplate" para o
-- documento oficial completo — o mesmo texto que o app já traz embutido.
--
-- Por que: a linha gravada no banco era o rascunho curto das primeiras
-- versões ("Eu, {NOME}, declaro ter devolvido…"), que não tem os campos
-- {ENDERECO}, {CNPJ_EMPRESA} nem {CPF_RESPONSAVEL_TI}. Com ele, o termo
-- saía sem o endereço e o CNPJ da unidade e sem os CPFs na assinatura.
--
-- Seguro e idempotente: só toca na linha de devolução que ainda NÃO tem o
-- campo de CNPJ. Rodar de novo não faz nada. Não apaga nem cria linhas, e
-- não mexe nos outros templates.
-- =====================================================================

update "DocumentTemplate"
   set content = E'TERMO DE DEVOLUÇÃO DE EQUIPAMENTOS CORPORATIVOS\n\nPor este instrumento, a {EMPRESA}, sediada no endereço {ENDERECO}, inscrita no CNPJ sob o nº {CNPJ_EMPRESA}, declara ter recebido do colaborador {NOME}, portador do CPF nº {CPF}, doravante denominado simplesmente "Colaborador", os equipamentos corporativos abaixo descritos, outrora cedidos para o exercício de suas funções.\n\nCLÁUSULA 1 – DOS EQUIPAMENTOS DEVOLVIDOS\nO Colaborador devolve neste ato os seguintes equipamentos e acessórios pertencentes à Empresa:\n\n{EQUIPAMENTOS}\n\nCLÁUSULA 2 – DO ESTADO DE CONSERVAÇÃO E VISTORIA\nOs equipamentos foram inspecionados neste ato pelo departamento de T.I. e encontram-se:\n{CHECK_PERFEITO} Em perfeito estado de conservação e funcionamento, ressalvado o desgaste natural de uso.\n{CHECK_AVARIAS} Com as seguintes avarias, faltas ou observações: {AVARIAS}.\n\nCLÁUSULA 3 – DA QUITAÇÃO E RESPONSABILIDADES\na) Estando os equipamentos em perfeito estado (ressalvado o desgaste natural), a Empresa confere ao Colaborador/Prestador ampla e geral quitação quanto à guarda e devolução dos bens. b) Caso tenham sido constatadas avarias, danos físicos ou extravios (assinalados na Cláusula 2) decorrentes de mau uso, negligência, imprudência ou dolo, fica resguardado à Empresa o direito de exigir o ressarcimento e realizar os descontos correspondentes aos custos de reparo ou reposição. Tais descontos poderão ser efetuados:\nI. Nas verbas rescisórias ou salário do Colaborador, caso o vínculo seja regido pela Consolidação das Leis do Trabalho (conforme Artigo 462, § 1º da CLT); ou\nII. Nos honorários, notas fiscais ou quaisquer pagamentos pendentes devidos ao Prestador de Serviços (PJ), em conformidade com as regras de responsabilização civil previstas no Código Civil Brasileiro.\n\nUma via deste termo será enviada ao e-mail pessoal do ex-colaborador: {EMAIL_EX}\n\nE por estarem de perfeito acordo, as partes firmam o presente termo por meio de assinatura eletrônica, reconhecendo a validade jurídica desta modalidade, para que produza todos os seus regulares efeitos de direito.\n\n{CIDADE_UF}, {DATA_EXTENSO}.\n\n__________________________________\n{NOME}\nCPF: {CPF}\nColaborador\n\n__________________________________\n{RESPONSAVEL_TI}\nCPF: {CPF_RESPONSAVEL_TI}\nResponsável T.I.\n\n__________________________________\n{EMPRESA}\nCNPJ: {CNPJ_EMPRESA}\nEmpresa',
       "updatedAt" = now()
 where lower(name) like '%devolu%'
   and position('{CNPJ_EMPRESA}' in content) = 0;

-- Conferência: as três linhas devem aparecer com "tem_campos" = true
-- select name,
--        position('{ENDERECO}' in content) > 0
--    and position('{CNPJ_EMPRESA}' in content) > 0 as tem_campos,
--        length(content) as tamanho
--   from "DocumentTemplate" order by id;
