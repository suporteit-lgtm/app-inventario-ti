import { Alerta, AppUser, Colaborador, Equipment, ImportRecord, Inventory, Movement, TermoEnvio } from '../types';

export const INVENTORIES: Inventory[] = [
  { id: 'bh', nome: 'Belo Horizonte', sigla: 'BH' },
  { id: 'sp', nome: 'São Paulo', sigla: 'SP' },
  { id: 'rj', nome: 'Rio de Janeiro', sigla: 'RJ' },
];

export const EQUIPMENTS: Equipment[] = [
  { id: '1', unidade: 'Belo Horizonte', tipo: 'Notebook', marca: 'Dell', modelo: 'Latitude 5440', serial: 'BRJ0K33', patrimonio: 'PAT-0142', status: 'Em uso', usuario: 'Carla Nunes', local: 'Matriz — 2º andar', compra: '12/03/2024', garantia: '12/03/2027' },
  { id: '2', unidade: 'Belo Horizonte', tipo: 'Notebook', marca: 'Lenovo', modelo: 'ThinkPad E14', serial: 'LNV88213', patrimonio: 'PAT-0158', status: 'Disponível', usuario: '—', local: 'Estoque TI', compra: '05/06/2024', garantia: '05/06/2027' },
  { id: '3', unidade: 'São Paulo', tipo: 'Desktop', marca: 'Dell', modelo: 'OptiPlex 7010', serial: 'DKT55901', patrimonio: 'PAT-0097', status: 'Em uso', usuario: 'Rafael Souza', local: 'Financeiro', compra: '20/01/2023', garantia: '20/01/2026' },
  { id: '4', unidade: 'Belo Horizonte', tipo: 'Monitor', marca: 'LG', modelo: '24MK430H', serial: 'LG24-7761', patrimonio: 'PAT-0110', status: 'Em uso', usuario: 'Bruno Lima', local: 'Operações', compra: '02/02/2024', garantia: '02/02/2026' },
  { id: '5', unidade: 'São Paulo', tipo: 'Impressora', marca: 'HP', modelo: 'LaserJet M404', serial: 'HPM40331', patrimonio: 'PAT-0071', status: 'Manutenção', usuario: '—', local: 'Assistência externa', compra: '15/09/2022', garantia: '15/09/2025' },
  { id: '6', unidade: 'Belo Horizonte', tipo: 'Celular', marca: 'Samsung', modelo: 'Galaxy A54', serial: 'SM5540912', patrimonio: 'PAT-0163', status: 'Em uso', usuario: 'Juliana Prado', local: 'Comercial', compra: '10/04/2025', garantia: '10/04/2026' },
  { id: '7', unidade: 'Belo Horizonte', tipo: 'Notebook', marca: 'Acer', modelo: 'Aspire 5', serial: 'ACR33108', patrimonio: 'PAT-0129', status: 'Manutenção', usuario: '—', local: 'Bancada TI', compra: '08/11/2023', garantia: '08/11/2025' },
  { id: '8', unidade: 'São Paulo', tipo: 'Monitor', marca: 'Dell', modelo: 'P2422H', serial: 'DLP24761', patrimonio: 'PAT-0088', status: 'Em uso', usuario: 'Rafael Souza', local: 'Financeiro', compra: '20/01/2023', garantia: '20/01/2026' },
  { id: '9', unidade: 'Rio de Janeiro', tipo: 'Desktop', marca: 'Positivo', modelo: 'Master D3400', serial: 'PSV10229', patrimonio: 'PAT-0042', status: 'Descartado', usuario: '—', local: 'Descarte', compra: '03/05/2019', garantia: '03/05/2021' },
  { id: '10', unidade: 'Rio de Janeiro', tipo: 'Celular', marca: 'Motorola', modelo: 'Moto G84', serial: 'MTG84055', patrimonio: 'PAT-0170', status: 'Disponível', usuario: '—', local: 'Estoque TI', compra: '22/05/2025', garantia: '22/05/2026' },
];

export const CATEGORIAS = ['Notebook', 'Desktop', 'Monitor', 'Impressora', 'Celular'];

export const COLABORADORES: Colaborador[] = [
  { nome: 'Carla Nunes', setor: 'Financeiro' },
  { nome: 'Rafael Souza', setor: 'Financeiro' },
  { nome: 'Juliana Prado', setor: 'Comercial' },
  { nome: 'Bruno Lima', setor: 'Operações' },
];

export const USERS: AppUser[] = [
  { nome: 'André Costa', email: 'andre@locgrupo.com.br', role: 'Admin', access: ['Belo Horizonte', 'São Paulo', 'Rio de Janeiro'] },
  { nome: 'Diego Martins', email: 'diego@locgrupo.com.br', role: 'Técnico', access: ['Belo Horizonte', 'São Paulo'] },
  { nome: 'Paula Ribeiro', email: 'paula@locgrupo.com.br', role: 'Técnico', access: ['Belo Horizonte'] },
  { nome: 'Marcos Vieira', email: 'marcos@locgrupo.com.br', role: 'Admin', access: ['Belo Horizonte', 'São Paulo', 'Rio de Janeiro'] },
];

export const MOVEMENTS: Movement[] = [
  { id: '1', titulo: 'Dell Latitude 5440', origem: 'Estoque TI', destino: 'Carla Nunes', data: '14/05', saida: true },
  { id: '2', titulo: 'Galaxy A54', origem: 'Estoque TI', destino: 'Juliana Prado', data: '02/05', saida: true },
  { id: '3', titulo: 'Acer Aspire 5', origem: 'Diego Martins', destino: 'Bancada TI', data: '28/04', saida: false },
  { id: '4', titulo: 'Monitor LG 24MK430H', origem: 'Comercial', destino: 'Estoque TI', data: '19/04', saida: false },
  { id: '5', titulo: 'OptiPlex 7010', origem: 'Estoque TI', destino: 'Rafael Souza', data: '02/04', saida: true },
];

export const ALERTAS: Alerta[] = [
  { id: '1', titulo: 'Garantia vencendo — HP LaserJet M404', sub: 'PAT-0071 · vence em 30 dias', quando: 'hoje', kind: 'aviso' },
  { id: '2', titulo: 'Manutenção há 15 dias — Acer Aspire 5', sub: 'PAT-0129 · Bancada TI', quando: 'ontem', kind: 'critico' },
  { id: '3', titulo: 'Termo pendente de assinatura', sub: 'Juliana Prado · Galaxy A54', quando: '2 d', kind: 'info' },
  { id: '4', titulo: 'Estoque baixo — mouses USB', sub: 'Restam 3 unidades', quando: '4 d', kind: 'aviso' },
  { id: '5', titulo: 'Backup do inventário concluído', sub: 'Exportação automática semanal', quando: '6 d', kind: 'ok' },
];

// Um de cada status, para a tela de termos ter o que mostrar em demonstração.
// Bruno Lima tem equipamento e NENHUM termo aqui — é o caso "não enviado",
// que não vive no banco e sim na ausência de linha.
export const TERMOS: TermoEnvio[] = [
  {
    id: 't1',
    documentKey: 'demo-1',
    colaborador: 'Carla Nunes',
    emailColaborador: 'carla.nunes@locgrupo.com.br',
    unidade: 'Belo Horizonte',
    template: 'Responsabilidade',
    equipamentos: ['Dell Latitude 5440 — PAT-0142 (S/N BRJ0K33)'],
    status: 'assinado',
    driveFileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345',
    enviadoEm: '2026-08-20T13:00:00.000Z',
    assinadoEm: '2026-08-21T09:20:00.000Z',
  },
  {
    id: 't2',
    documentKey: 'demo-2',
    colaborador: 'Juliana Prado',
    emailColaborador: 'juliana.prado@locgrupo.com.br',
    unidade: 'Belo Horizonte',
    template: 'Responsabilidade',
    equipamentos: ['Samsung Galaxy A54 — PAT-0163 (S/N SM5540912)'],
    status: 'enviado',
    enviadoEm: '2026-09-02T18:40:00.000Z',
  },
  {
    id: 't3',
    documentKey: 'demo-3',
    colaborador: 'Rafael Souza',
    emailColaborador: 'rafael.souza@locgrupo.com.br',
    unidade: 'São Paulo',
    template: 'Comodato',
    equipamentos: ['Dell OptiPlex 7010 — PAT-0097 (S/N DKT55901)', 'Dell P2422H — PAT-0088 (S/N DLP24761)'],
    status: 'recusado',
    motivoRecusa: 'Rafael Souza rafael.souza@locgrupo.com.br — Dados pessoais incorretos — CPF divergente',
    enviadoEm: '2026-08-28T11:10:00.000Z',
    recusadoEm: '2026-08-28T15:02:00.000Z',
  },
];

export const IMPORTS: ImportRecord[] = [
  { id: '1', arquivo: 'inventario_maio.csv', info: '42 linhas · 26/05/2026', st: 'Concluída' },
  { id: '2', arquivo: 'notebooks_novos.csv', info: '12 linhas · 03/03/2026', st: 'Concluída' },
];
