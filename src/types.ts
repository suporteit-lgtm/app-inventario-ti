export type EquipStatus = 'Disponível' | 'Em uso' | 'Manutenção' | 'Descartado' | 'Perdido';

export const EQUIP_TIPOS = ['Notebook', 'Desktop', 'Monitor', 'Impressora', 'Celular'] as const;
export const EQUIP_STATUS: EquipStatus[] = ['Disponível', 'Em uso', 'Manutenção', 'Descartado', 'Perdido'];
export const CONDICOES = ['Novo', 'Bom', 'Regular', 'Ruim'];
/** Linhas corporativas têm condições próprias */
export const CONDICOES_LINHA = ['Usável', 'Bloqueado'];

export interface Equipment {
  id: string;
  assetId?: string;
  unidade: string;
  tipo: string;
  marca: string;
  modelo: string;
  serial: string;
  patrimonio: string;
  status: EquipStatus;
  usuario: string;
  local: string;
  compra: string;
  garantia: string;
  obs?: string;
  foto?: string | null;
  // Campos completos do sistema web
  cor?: string;
  configuracao?: string;
  condicao?: string;
  propriedade?: string;
  fornecedor?: string;
  emailUsuario?: string;
  cpfUsuario?: string;
  departamento?: string;
  gestor?: string;
  entrega?: string;
  conferencia?: string;
  valor?: string;
  acessorios?: string;
  // Específicos de celular
  imei1?: string;
  imei2?: string;
  mac?: string;
  pelicula?: string;
  capa?: string;
  // Específicos de linha corporativa
  operadora?: string;
  plano?: string;
  portabilidade?: string;
  iccid?: string;
  telefone?: string;
  usuarioAntigo?: string;
}

// Rótulos usados no histórico de alterações
export const FIELD_LABELS: Partial<Record<keyof Equipment, string>> = {
  tipo: 'Tipo',
  marca: 'Marca',
  modelo: 'Modelo',
  serial: 'Nº de série',
  patrimonio: 'Patrimônio',
  status: 'Status',
  usuario: 'Responsável',
  local: 'Localização',
  compra: 'Data de aquisição',
  garantia: 'Garantia',
  obs: 'Observações',
  cor: 'Cor',
  configuracao: 'Configuração',
  condicao: 'Condição',
  propriedade: 'Propriedade',
  fornecedor: 'Fornecedor',
  emailUsuario: 'E-mail do usuário',
  cpfUsuario: 'CPF do usuário',
  departamento: 'Departamento',
  gestor: 'Gestor',
  entrega: 'Data de entrega',
  conferencia: 'Última conferência',
  valor: 'Valor',
  acessorios: 'Acessórios',
  imei1: 'IMEI 1',
  imei2: 'IMEI 2',
  mac: 'Endereço MAC',
  pelicula: 'Película',
  capa: 'Capa',
  operadora: 'Operadora',
  plano: 'Plano',
  portabilidade: 'Portabilidade',
  iccid: 'ICCID',
  telefone: 'Número de telefone',
  usuarioAntigo: 'Usuário antigo',
};

export interface HistEvent {
  evento: string;
  data: string;
}

export interface EquipmentLogEntry {
  id: string;
  equipmentId: string;
  descricao: string;
  data: string;
}

export interface Colaborador {
  nome: string;
  setor: string;
}

export type Role = 'Admin' | 'Técnico';

export interface AppUser {
  nome: string;
  email: string;
  role: Role;
  access: string[];
  cpf?: string;
}

export interface Movement {
  id: string;
  titulo: string;
  origem: string;
  destino: string;
  data: string;
  saida: boolean;
  equipmentId?: string;
  dataFull?: string;
}

export type AlertKind = 'aviso' | 'critico' | 'info' | 'ok';

export interface Alerta {
  id: string;
  titulo: string;
  sub: string;
  quando: string;
  kind: AlertKind;
}

export interface ImportRecord {
  id: string;
  arquivo: string;
  info: string;
  st: 'Concluída' | 'Com erros' | 'Processando';
}

export interface Inventory {
  id: string;
  nome: string;
  sigla: string;
  cnpj?: string;
  endereco?: string;
  apelido?: string;
}

// Nome de exibição curto da unidade (máscara); o nome completo fica nos termos
export const invDisplay = (list: Inventory[], nome: string) => {
  const i = list.find((x) => x.nome === nome);
  return i?.apelido || nome;
};

export const invSiglaDisplay = (list: Inventory[], nome: string) => {
  const i = list.find((x) => x.nome === nome);
  return i?.apelido || i?.sigla || sigla(nome);
};

export interface TermoTemplateDB {
  id: number | null;
  name: string;
  content: string;
}

export interface EquipForm {
  tipo: string;
  marca: string;
  modelo: string;
  serial: string;
  patrimonio: string;
  local: string;
  usuario: string;
  obs: string;
  status: EquipStatus;
  foto: string | null;
  cor: string;
  configuracao: string;
  condicao: string;
  propriedade: string;
  fornecedor: string;
  emailUsuario: string;
  cpfUsuario: string;
  departamento: string;
  gestor: string;
  compra: string;
  entrega: string;
  garantia: string;
  conferencia: string;
  valor: string;
  acessorios: string;
  imei1: string;
  imei2: string;
  mac: string;
  pelicula: string;
  capa: string;
  operadora: string;
  plano: string;
  portabilidade: string;
  iccid: string;
  telefone: string;
  usuarioAntigo: string;
}

export const emptyForm = (): EquipForm => ({
  tipo: 'Notebook',
  marca: '',
  modelo: '',
  serial: '',
  patrimonio: '',
  local: '',
  usuario: '',
  obs: '',
  status: 'Disponível',
  foto: null,
  cor: '',
  configuracao: '',
  condicao: 'Bom',
  propriedade: '',
  fornecedor: '',
  emailUsuario: '',
  cpfUsuario: '',
  departamento: '',
  gestor: '',
  compra: '',
  entrega: '',
  garantia: '',
  conferencia: '',
  valor: '',
  acessorios: '',
  imei1: '',
  imei2: '',
  mac: '',
  pelicula: '',
  capa: '',
  operadora: '',
  plano: '',
  portabilidade: '',
  iccid: '',
  telefone: '',
  usuarioAntigo: '',
});

export const isCelular = (tipo: string) => /celular|smart|phone|iphone/i.test(tipo);
export const isNotebook = (tipo: string) => /notebook|laptop|ultrabook|macbook/i.test(tipo);
/** Linhas corporativas / chips — usam um formulário próprio */
export const isLinha = (tipo: string) => /linha|chip|sim\s?card|corporativ/i.test(tipo);

export type TermoTemplate = 'Padrão' | 'Comodato' | 'Devolução';

// Cidade/UF do rodapé do termo, derivada da unidade escolhida no passo 1
const CIDADES: { chave: string; nome: string; uf: string }[] = [
  { chave: 'belo horizonte', nome: 'Belo Horizonte', uf: 'MG' },
  { chave: 'sao paulo', nome: 'São Paulo', uf: 'SP' },
  { chave: 'rio de janeiro', nome: 'Rio de Janeiro', uf: 'RJ' },
  { chave: 'aracaju', nome: 'Aracaju', uf: 'SE' },
  { chave: 'belem', nome: 'Belém', uf: 'PA' },
  { chave: 'maceio', nome: 'Maceió', uf: 'AL' },
  { chave: 'salvador', nome: 'Salvador', uf: 'BA' },
  { chave: 'fortaleza', nome: 'Fortaleza', uf: 'CE' },
  { chave: 'recife', nome: 'Recife', uf: 'PE' },
  { chave: 'curitiba', nome: 'Curitiba', uf: 'PR' },
  { chave: 'porto alegre', nome: 'Porto Alegre', uf: 'RS' },
  { chave: 'brasilia', nome: 'Brasília', uf: 'DF' },
  { chave: 'goiania', nome: 'Goiânia', uf: 'GO' },
  { chave: 'manaus', nome: 'Manaus', uf: 'AM' },
  { chave: 'vitoria', nome: 'Vitória', uf: 'ES' },
  { chave: 'natal', nome: 'Natal', uf: 'RN' },
  { chave: 'joao pessoa', nome: 'João Pessoa', uf: 'PB' },
  { chave: 'teresina', nome: 'Teresina', uf: 'PI' },
  { chave: 'campo grande', nome: 'Campo Grande', uf: 'MS' },
  { chave: 'cuiaba', nome: 'Cuiabá', uf: 'MT' },
  { chave: 'florianopolis', nome: 'Florianópolis', uf: 'SC' },
  { chave: 'sao luis', nome: 'São Luís', uf: 'MA' },
  { chave: 'macapa', nome: 'Macapá', uf: 'AP' },
  { chave: 'palmas', nome: 'Palmas', uf: 'TO' },
  { chave: 'porto velho', nome: 'Porto Velho', uf: 'RO' },
  { chave: 'rio branco', nome: 'Rio Branco', uf: 'AC' },
  { chave: 'boa vista', nome: 'Boa Vista', uf: 'RR' },
];

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Procura a cidade no nome da unidade, no apelido e no endereço cadastrado —
// assim funciona tanto para "LOCAGORA ... - Belo Horizonte" quanto para
// unidades cujo nome não traz a cidade, mas o endereço traz
export const cidadeUfDaUnidade = (nomeUnidade: string, endereco?: string, apelido?: string): string => {
  const alvo = semAcento(`${nomeUnidade} ${apelido || ''} ${endereco || ''}`);
  const achou = CIDADES.find((c) => alvo.includes(c.chave));
  if (achou) return `${achou.nome}/${achou.uf}`;
  // sem cidade conhecida: usa o trecho após o último "-" do nome, ou o apelido
  const partes = nomeUnidade.split('-');
  if (partes.length > 1) return partes[partes.length - 1].trim();
  return (apelido || '').trim() || nomeUnidade.trim();
};

// Texto oficial fornecido pelo cliente (Termo de Responsabilidade - 01.docx)
export const TERMO_RESPONSABILIDADE_OFICIAL = `TERMO DE RESPONSABILIDADE E SIGILO PELO USO DE EQUIPAMENTOS CORPORATIVOS

Por este instrumento, a {EMPRESA}, sediada no endereço {ENDERECO}, inscrita no CNPJ sob o nº {CNPJ_EMPRESA}, e o colaborador {NOME}, portador do CPF nº {CPF}, doravante denominado simplesmente "Colaborador", ajustam os termos de entrega, recebimento e uso dos equipamentos descritos abaixo.

CONSIDERANDO QUE: a) A Empresa fornecerá ao Colaborador, em regime de comodato, os equipamentos listados neste termo, com o objetivo exclusivo de viabilizar o desempenho de suas atividades profissionais; b) O Colaborador compromete-se a zelar pela boa guarda, conservação, segurança e utilização correta dos bens recebidos; c) Os equipamentos e os dados neles contidos são de propriedade exclusiva da Empresa.

CLÁUSULA 1 – DO OBJETO E DESCRIÇÃO DOS EQUIPAMENTOS
É objeto deste termo a entrega ao Colaborador, em perfeito estado de funcionamento, dos seguintes equipamentos e acessórios:

{EQUIPAMENTOS}

CLÁUSULA 2 – DAS OBRIGAÇÕES E CONDUTA DO COLABORADOR
O Colaborador recebe os equipamentos neste ato e se compromete expressamente a: a) Utilizar os equipamentos exclusivamente para atividades profissionais inerentes ao seu cargo, sendo terminantemente proibido o uso pessoal (como salvar fotos pessoais, jogos ou arquivos não relacionados ao trabalho); b) Não vender, doar, alugar, emprestar, ceder ou alienar os equipamentos a terceiros (incluindo familiares); c) Segurança da Informação: Não compartilhar suas senhas de acesso com terceiros ou outros colegas, bem como bloquear a tela do equipamento sempre que se ausentar de sua mesa/estação de trabalho; d) Softwares e Sistemas: Não formatar, instalar, desinstalar ou alterar sistemas operacionais, softwares ou aplicativos, bem como não baixar arquivos piratas ou de fontes não seguras. Qualquer intervenção técnica é de exclusividade da equipe de T.I.; e) Manutenção: Não realizar personalizações físicas (adesivos, colagens, marcações) e comunicar imediatamente à T.I. qualquer defeito, lentidão ou necessidade de manutenção; f) Sinistros: Em caso de perda, roubo ou furto dos equipamentos, comunicar imediatamente à Empresa (para bloqueio remoto e proteção de dados) e apresentar, em até 48 horas, o respectivo Boletim de Ocorrência (B.O.); g) Devolução: Devolver todos os equipamentos nas mesmas condições em que foram recebidos (salvo desgaste natural pelo uso regular), sempre que solicitado pela Empresa ou imediatamente no ato de seu desligamento.

CLÁUSULA 3 – DA PRIVACIDADE, MONITORAMENTO E LGPD
O Colaborador declara ciência de que: a) Por se tratar de ferramenta de trabalho de propriedade da Empresa, não há expectativa de privacidade no uso dos equipamentos; b) A Empresa reserva-se o direito de monitorar, auditar, rastrear (geolocalização, no caso de smartphones) e inspecionar remotamente ou presencialmente os equipamentos, e-mails corporativos, históricos de navegação e arquivos armazenados, a qualquer momento e sem aviso prévio; c) O Colaborador deve respeitar as diretrizes da Lei Geral de Proteção de Dados (LGPD), mantendo sigilo absoluto sobre dados de clientes, fornecedores e da própria empresa armazenados nestes dispositivos.

CLÁUSULA 4 – DAS OBRIGAÇÕES DA EMPRESA
A Empresa se compromete a: a) Entregar os equipamentos em plenas condições de uso, devidamente configurados e com os softwares necessários licenciados; b) Arcar com os custos de manutenção preventiva e corretiva por desgaste natural; c) Prestar suporte técnico adequado por meio do departamento de T.I.

CLÁUSULA 5 – DAS PENALIDADES E DESCONTOS
Nos termos do Artigo 462, § 1º da CLT, o Colaborador autoriza expressamente o desconto em seu salário ou em suas verbas rescisórias dos valores correspondentes a: a) Danos, avarias, perda ou extravio dos equipamentos decorrentes de mau uso, imperícia, imprudência ou negligência (ex: queda, derramamento de líquidos, deixar o equipamento visível dentro de veículos); b) Custos de reparo ou reposição, quando comprovadamente causados por ação ou omissão intencional (dolo) do Colaborador.

CLÁUSULA 6 – DISPOSIÇÕES FINAIS
a) O presente termo tem validade por prazo indeterminado, enquanto o Colaborador estiver de posse de qualquer equipamento da Empresa; b) O não cumprimento das obrigações aqui assumidas caracteriza falta grave e poderá acarretar medidas disciplinares (advertência, suspensão ou demissão por justa causa), além da responsabilização cível e criminal cabível.

E por estarem de perfeito acordo, assinam o presente termo em 02 (duas) vias de igual teor, para que produza seus regulares efeitos legais e jurídicos.

{CIDADE_UF}, {DATA_EXTENSO}.

__________________________________
{NOME}
CPF: {CPF}
Colaborador

__________________________________
{RESPONSAVEL_TI}
CPF: {CPF_RESPONSAVEL_TI}
Responsável T.I. / Representante da Empresa

__________________________________
{EMPRESA}
CNPJ: {CNPJ_EMPRESA}
Empresa`;

// Texto oficial (Termo de comodato - 01.docx)
export const TERMO_COMODATO_OFICIAL = `TERMO DE CONTRATO DE COMODATO DE EQUIPAMENTOS

Por este instrumento particular de comodato, de um lado, {EMPRESA}, sediada no endereço {ENDERECO}, inscrita no CNPJ sob o nº {CNPJ_EMPRESA}, doravante denominada simplesmente "COMODANTE", e de outro lado, o(a) colaborador(a) {NOME}, portador do CPF nº {CPF}, doravante denominado simplesmente "COMODATÁRIO", têm entre si justo e acertado o presente contrato, mediante as cláusulas e condições seguintes:

CLÁUSULA 1 – DO OBJETO
A COMODANTE cede ao COMODATÁRIO, em regime de comodato (empréstimo gratuito), os equipamentos corporativos abaixo descritos, de sua legítima propriedade:

{EQUIPAMENTOS}

CLÁUSULA 2 – DA FINALIDADE
Os bens descritos na Cláusula 1 destinam-se única e exclusivamente para a execução das atividades e rotinas profissionais do COMODATÁRIO no desempenho de seu cargo junto à COMODANTE. É expressamente vedada a utilização dos equipamentos para fins particulares, bem como o seu empréstimo, locação ou cessão a terceiros, sob pena de rescisão imediata deste instrumento e sanções disciplinares.

CLÁUSULA 3 – DA GUARDA, CONSERVAÇÃO E MANUTENÇÃO
O COMODATÁRIO compromete-se a zelar pela boa guarda, segurança e conservação dos bens comodatados. a) É responsabilidade do COMODATÁRIO comunicar imediatamente à COMODANTE qualquer falha técnica, dano, roubo ou furto, apresentando o respectivo Boletim de Ocorrência (B.O.) nas hipóteses de sinistro. b) O COMODATÁRIO responderá financeiramente por perdas, danos ou extravios que ocorrerem por sua culpa, negligência, imperícia ou dolo.

CLÁUSULA 4 – DO PRAZO E DA RESTITUIÇÃO
O presente comodato é firmado por prazo indeterminado, vigorando enquanto durar o vínculo empregatício ou de prestação de serviços entre as partes. a) O COMODATÁRIO obriga-se a restituir os bens imediatamente em caso de desligamento da empresa (por qualquer motivo) ou a qualquer tempo, sempre que solicitado pela COMODANTE. b) A devolução deverá ocorrer nas mesmas condições de conservação em que os bens foram entregues, admitido apenas o desgaste natural decorrente do uso regular.

CLÁUSULA 5 – DA PROPRIEDADE DOS DADOS
Fica estabelecido que toda e qualquer informação, arquivo ou dado processado e armazenado nos equipamentos objeto deste comodato é de propriedade exclusiva da COMODANTE, sujeitando-se às normas internas de Segurança da Informação e à Lei Geral de Proteção de Dados (LGPD).

E por estarem de perfeito acordo, as partes firmam o presente termo por meio de assinatura eletrônica, reconhecendo a validade jurídica desta modalidade, para que produza todos os seus regulares efeitos de direito.

{CIDADE_UF}, {DATA_EXTENSO}.

__________________________________
{NOME}
CPF: {CPF}
Colaborador

__________________________________
{RESPONSAVEL_TI}
CPF: {CPF_RESPONSAVEL_TI}
Responsável T.I.

__________________________________
{EMPRESA}
CNPJ: {CNPJ_EMPRESA}
Empresa`;

// Texto oficial (Termo de devolução - 01.docx) — com vistoria e e-mail do ex-colaborador
export const TERMO_DEVOLUCAO_OFICIAL = `TERMO DE DEVOLUÇÃO DE EQUIPAMENTOS CORPORATIVOS

Por este instrumento, a {EMPRESA}, sediada no endereço {ENDERECO}, inscrita no CNPJ sob o nº {CNPJ_EMPRESA}, declara ter recebido do colaborador {NOME}, portador do CPF nº {CPF}, doravante denominado simplesmente "Colaborador", os equipamentos corporativos abaixo descritos, outrora cedidos para o exercício de suas funções.

CLÁUSULA 1 – DOS EQUIPAMENTOS DEVOLVIDOS
O Colaborador devolve neste ato os seguintes equipamentos e acessórios pertencentes à Empresa:

{EQUIPAMENTOS}

CLÁUSULA 2 – DO ESTADO DE CONSERVAÇÃO E VISTORIA
Os equipamentos foram inspecionados neste ato pelo departamento de T.I. e encontram-se:
{CHECK_PERFEITO} Em perfeito estado de conservação e funcionamento, ressalvado o desgaste natural de uso.
{CHECK_AVARIAS} Com as seguintes avarias, faltas ou observações: {AVARIAS}.

CLÁUSULA 3 – DA QUITAÇÃO E RESPONSABILIDADES
a) Estando os equipamentos em perfeito estado (ressalvado o desgaste natural), a Empresa confere ao Colaborador/Prestador ampla e geral quitação quanto à guarda e devolução dos bens. b) Caso tenham sido constatadas avarias, danos físicos ou extravios (assinalados na Cláusula 2) decorrentes de mau uso, negligência, imprudência ou dolo, fica resguardado à Empresa o direito de exigir o ressarcimento e realizar os descontos correspondentes aos custos de reparo ou reposição. Tais descontos poderão ser efetuados:
I. Nas verbas rescisórias ou salário do Colaborador, caso o vínculo seja regido pela Consolidação das Leis do Trabalho (conforme Artigo 462, § 1º da CLT); ou
II. Nos honorários, notas fiscais ou quaisquer pagamentos pendentes devidos ao Prestador de Serviços (PJ), em conformidade com as regras de responsabilização civil previstas no Código Civil Brasileiro.

Uma via deste termo será enviada ao e-mail pessoal do ex-colaborador: {EMAIL_EX}

E por estarem de perfeito acordo, as partes firmam o presente termo por meio de assinatura eletrônica, reconhecendo a validade jurídica desta modalidade, para que produza todos os seus regulares efeitos de direito.

{CIDADE_UF}, {DATA_EXTENSO}.

__________________________________
{NOME}
CPF: {CPF}
Colaborador

__________________________________
{RESPONSAVEL_TI}
CPF: {CPF_RESPONSAVEL_TI}
Responsável T.I.

__________________________________
{EMPRESA}
CNPJ: {CNPJ_EMPRESA}
Empresa`;

/**
 * Um termo enviado para assinatura. É a tabela "TermSubmission" do sistema
 * web — os dois usam a MESMA linha, para não haver dois históricos que
 * discordam. Por isso os campos aqui seguem o modelo de lá, não o do app.
 */
export type TermoStatus = 'enviado' | 'assinado' | 'recusado';

export interface TermoEnvio {
  id: string;
  documentKey?: string;
  colaborador: string;
  emailColaborador?: string;
  cpfColaborador?: string;
  unidade?: string;
  arquivo?: string;
  status: TermoStatus;
  /** URL completa do PDF assinado no Drive */
  driveUrl?: string;
  /** URL do documento no painel do Clicksign */
  clicksignUrl?: string;
  enviadoEm?: string;
  assinadoEm?: string;
  recusadoEm?: string;
}

/** PENDENTE | ASSINADO | RECUSADO (como o web grava) → o vocabulário do app. */
export const statusDoTermo = (bruto: string): TermoStatus =>
  ({ ASSINADO: 'assinado', RECUSADO: 'recusado' } as Record<string, TermoStatus>)[
    String(bruto || '').toUpperCase()
  ] || 'enviado';

/** "termo-responsabilidade-carla.pdf" → "Responsabilidade" */
export const templateDoArquivo = (arquivo?: string): string => {
  const m = /^termo-([a-zà-ú]+)/i.exec((arquivo || '').trim());
  if (!m) return '';
  const nome = m[1].toLowerCase();
  return nome.charAt(0).toUpperCase() + nome.slice(1);
};

export const TERMO_TEMPLATES_PADRAO: TermoTemplateDB[] = [
  { id: null, name: 'Responsabilidade', content: TERMO_RESPONSABILIDADE_OFICIAL },
  { id: null, name: 'Comodato', content: TERMO_COMODATO_OFICIAL },
  { id: null, name: 'Devolução', content: TERMO_DEVOLUCAO_OFICIAL },
];

export const isTemplateDevolucao = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .includes('DEVOLU');

export const termoTitulo = (name: string) => {
  const up = name.toUpperCase();
  return up.startsWith('TERMO') ? up : `TERMO DE ${up}`;
};

export const sigla = (n: string) =>
  ({ 'Belo Horizonte': 'BH', 'São Paulo': 'SP', 'Rio de Janeiro': 'RJ' } as Record<string, string>)[n] ||
  n.slice(0, 2).toUpperCase();

export const tipoTag = (tipo: string) =>
  ({ Notebook: 'NTB', Desktop: 'DSK', Monitor: 'MON', Impressora: 'IMP', Celular: 'CEL' } as Record<string, string>)[
    tipo
  ] || (tipo ? tipo.slice(0, 3).toUpperCase() : 'EQP');

export const iniciais = (nome: string) =>
  nome
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const equipNome = (e: Pick<Equipment, 'marca' | 'modelo'>) => `${e.marca} ${e.modelo}`.trim();

// Exibição compacta de nomes longos: primeiro + segundo nome
export const shortName = (nome: string) => {
  const parts = nome.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
};
