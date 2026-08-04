-- =====================================================================
-- RESTAURAÇÃO COMPLETA após um "prisma migrate reset" no banco
-- (aconteceu em 30/07/2026 ~03:37 UTC — confirmado por duas migrations
-- terminando no mesmo instante em _prisma_migrations).
--
-- Este script substitui os scripts antigos (setup-app.sql até v5) —
-- rode-o inteiro, de uma vez, no SQL Editor. É seguro rodar de novo no
-- futuro se isso acontecer outra vez (idempotente).
-- =====================================================================

-- 1) Colunas extras usadas pelo app (o Prisma ignora colunas que não conhece)
alter table "User" add column if not exists "allowedUnitIds" text[];
alter table "User" add column if not exists cpf text;
alter table "Unit" add column if not exists nickname text;

-- 2) Tabela de auditoria de alterações do equipamento
create table if not exists "EquipmentLog" (
  id text primary key,
  "equipmentId" text not null,
  description text not null,
  "changedBy" text,
  "createdAt" timestamptz not null default now()
);
create index if not exists "EquipmentLog_equipmentId_idx" on "EquipmentLog" ("equipmentId");

-- 3) RLS + políticas (acesso apenas para usuários autenticados via app)
do $$
declare t text;
begin
  foreach t in array array['Unit','Category','Equipment','User','AssignmentHistory','DocumentTemplate','Settings','EquipmentLog'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "app_authenticated_all" on %I', t);
    execute format('create policy "app_authenticated_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 4) GRANTs de schema/tabela — SEM isso, o RLS acima nem chega a ser avaliado
--    (é o que causou o "permission denied for schema public")
--    ATENÇÃO: a "service_role" é a identidade das Edge Functions e precisa
--    estar aqui, senão as funções falham mesmo com o app funcionando.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
-- garante que TABELAS FUTURAS (novas migrations do Prisma) já nasçam liberadas,
-- sem precisar rodar este script de novo a cada deploy do sistema web
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant select on tables to anon;

-- 5) Templates de termo (texto oficial, com as 3 assinaturas dinâmicas)
insert into "DocumentTemplate" (id, name, content, "updatedAt")
select coalesce((select max(id) from "DocumentTemplate"), 0) + 1,
       'Responsabilidade',
       E'TERMO DE RESPONSABILIDADE E SIGILO PELO USO DE EQUIPAMENTOS CORPORATIVOS\n\nPor este instrumento, a {EMPRESA}, sediada no endereço {ENDERECO}, inscrita no CNPJ sob o nº {CNPJ_EMPRESA}, e o colaborador {NOME}, portador do CPF nº {CPF}, doravante denominado simplesmente "Colaborador", ajustam os termos de entrega, recebimento e uso dos equipamentos descritos abaixo.\n\nCONSIDERANDO QUE: a) A Empresa fornecerá ao Colaborador, em regime de comodato, os equipamentos listados neste termo, com o objetivo exclusivo de viabilizar o desempenho de suas atividades profissionais; b) O Colaborador compromete-se a zelar pela boa guarda, conservação, segurança e utilização correta dos bens recebidos; c) Os equipamentos e os dados neles contidos são de propriedade exclusiva da Empresa.\n\nCLÁUSULA 1 – DO OBJETO E DESCRIÇÃO DOS EQUIPAMENTOS\nÉ objeto deste termo a entrega ao Colaborador, em perfeito estado de funcionamento, dos seguintes equipamentos e acessórios:\n\n{EQUIPAMENTOS}\n\nCLÁUSULA 2 – DAS OBRIGAÇÕES E CONDUTA DO COLABORADOR\nO Colaborador recebe os equipamentos neste ato e se compromete expressamente a: a) Utilizar os equipamentos exclusivamente para atividades profissionais inerentes ao seu cargo, sendo terminantemente proibido o uso pessoal (como salvar fotos pessoais, jogos ou arquivos não relacionados ao trabalho); b) Não vender, doar, alugar, emprestar, ceder ou alienar os equipamentos a terceiros (incluindo familiares); c) Segurança da Informação: Não compartilhar suas senhas de acesso com terceiros ou outros colegas, bem como bloquear a tela do equipamento sempre que se ausentar de sua mesa/estação de trabalho; d) Softwares e Sistemas: Não formatar, instalar, desinstalar ou alterar sistemas operacionais, softwares ou aplicativos, bem como não baixar arquivos piratas ou de fontes não seguras. Qualquer intervenção técnica é de exclusividade da equipe de T.I.; e) Manutenção: Não realizar personalizações físicas (adesivos, colagens, marcações) e comunicar imediatamente à T.I. qualquer defeito, lentidão ou necessidade de manutenção; f) Sinistros: Em caso de perda, roubo ou furto dos equipamentos, comunicar imediatamente à Empresa (para bloqueio remoto e proteção de dados) e apresentar, em até 48 horas, o respectivo Boletim de Ocorrência (B.O.); g) Devolução: Devolver todos os equipamentos nas mesmas condições em que foram recebidos (salvo desgaste natural pelo uso regular), sempre que solicitado pela Empresa ou imediatamente no ato de seu desligamento.\n\nCLÁUSULA 3 – DA PRIVACIDADE, MONITORAMENTO E LGPD\nO Colaborador declara ciência de que: a) Por se tratar de ferramenta de trabalho de propriedade da Empresa, não há expectativa de privacidade no uso dos equipamentos; b) A Empresa reserva-se o direito de monitorar, auditar, rastrear (geolocalização, no caso de smartphones) e inspecionar remotamente ou presencialmente os equipamentos, e-mails corporativos, históricos de navegação e arquivos armazenados, a qualquer momento e sem aviso prévio; c) O Colaborador deve respeitar as diretrizes da Lei Geral de Proteção de Dados (LGPD), mantendo sigilo absoluto sobre dados de clientes, fornecedores e da própria empresa armazenados nestes dispositivos.\n\nCLÁUSULA 4 – DAS OBRIGAÇÕES DA EMPRESA\nA Empresa se compromete a: a) Entregar os equipamentos em plenas condições de uso, devidamente configurados e com os softwares necessários licenciados; b) Arcar com os custos de manutenção preventiva e corretiva por desgaste natural; c) Prestar suporte técnico adequado por meio do departamento de T.I.\n\nCLÁUSULA 5 – DAS PENALIDADES E DESCONTOS\nNos termos do Artigo 462, § 1º da CLT, o Colaborador autoriza expressamente o desconto em seu salário ou em suas verbas rescisórias dos valores correspondentes a: a) Danos, avarias, perda ou extravio dos equipamentos decorrentes de mau uso, imperícia, imprudência ou negligência (ex: queda, derramamento de líquidos, deixar o equipamento visível dentro de veículos); b) Custos de reparo ou reposição, quando comprovadamente causados por ação ou omissão intencional (dolo) do Colaborador.\n\nCLÁUSULA 6 – DISPOSIÇÕES FINAIS\na) O presente termo tem validade por prazo indeterminado, enquanto o Colaborador estiver de posse de qualquer equipamento da Empresa; b) O não cumprimento das obrigações aqui assumidas caracteriza falta grave e poderá acarretar medidas disciplinares (advertência, suspensão ou demissão por justa causa), além da responsabilização cível e criminal cabível.\n\nE por estarem de perfeito acordo, assinam o presente termo em 02 (duas) vias de igual teor, para que produza seus regulares efeitos legais e jurídicos.\n\nBelo Horizonte/MG, {DATA_EXTENSO}.\n\n__________________________________\n{NOME}\nCPF: {CPF}\nColaborador\n\n__________________________________\n{RESPONSAVEL_TI}\nCPF: {CPF_RESPONSAVEL_TI}\nResponsável T.I. / Representante da Empresa\n\n__________________________________\n{EMPRESA}\nCNPJ: {CNPJ_EMPRESA}\nEmpresa',
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

-- =====================================================================
-- Verificação: confira se o app volta a funcionar e se os dados abaixo
-- batem com o esperado (equipamentos importados, usuários existentes).
-- =====================================================================
-- select count(*) from "Equipment";
-- select name, email, role, cpf from "User";
