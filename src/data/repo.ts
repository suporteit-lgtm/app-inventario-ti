import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { getSupabase, getSupabaseAux, isSupabaseConfigured } from '../lib/supabase';
import {
  Alerta,
  AppUser,
  Colaborador,
  EquipStatus,
  Equipment,
  EquipmentLogEntry,
  FIELD_LABELS,
  ImportRecord,
  Inventory,
  Movement,
  TermoTemplateDB,
  TERMO_TEMPLATES_PADRAO,
  iniciais,
  sigla,
  tipoTag,
} from '../types';
import { ALERTAS, CATEGORIAS, COLABORADORES, EQUIPMENTS, IMPORTS, INVENTORIES, MOVEMENTS, USERS } from './mock';

export interface DB {
  equipments: Equipment[];
  users: AppUser[];
  colaboradores: Colaborador[];
  movements: Movement[];
  alertas: Alerta[];
  imports: ImportRecord[];
  inventories: Inventory[];
  categorias: string[];
  templates: TermoTemplateDB[];
  logs: EquipmentLogEntry[];
}

export interface TermoRecord {
  colaborador: string;
  template: string;
  equipamentos: string[];
  data: string;
}

export interface Repo {
  mode: 'mock' | 'supabase';
  signIn(email: string, senha: string): Promise<AppUser>;
  signInWithGoogle(): Promise<AppUser | null>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AppUser | null>;
  createCategory(nome: string): Promise<void>;
  fetchAll(): Promise<DB>;
  saveEquipment(e: Equipment, old?: Equipment | null): Promise<void>;
  insertEquipments(list: Equipment[]): Promise<void>;
  movimentar(e: Equipment, novoResponsavel: string, departamento: string): Promise<void>;
  devolverEquipamentos(list: Equipment[], responsavel: string): Promise<void>;
  saveTemplate(t: TermoTemplateDB): Promise<void>;
  /** Cria o usuário. Devolve um aviso (string) quando criado com ressalva, ou null se tudo certo. */
  createUser(
    nome: string,
    email: string,
    senha: string,
    role: 'Admin' | 'Técnico',
    access: string[],
    cpf?: string
  ): Promise<string | null>;
  changePassword(senha: string): Promise<void>;
  /** Devolve um aviso quando salvou só em parte (ex.: o CPF foi recusado). */
  updateUser(
    originalEmail: string,
    d: { nome: string; email: string; senha?: string; role: 'Admin' | 'Técnico'; access: string[]; cpf?: string }
  ): Promise<string | null>;
  deleteUser(email: string): Promise<void>;
  deleteEquipment(e: Equipment): Promise<void>;
  /** Devolve as colunas que o banco não tem — o resto foi salvo. */
  saveUnit(u: { id: string | null; nome: string; cnpj?: string; endereco?: string; apelido?: string }): Promise<string[]>;
  deleteUnit(id: string): Promise<void>;
  updateMyCpf(email: string, cpf: string): Promise<void>;
  updateUserAccess(nome: string, access: string[]): Promise<void>;
  addImport(rec: ImportRecord): Promise<void>;
  addTermo(t: TermoRecord): Promise<void>;
}

/* ---------------------------------- utils ---------------------------------- */

const pad = (n: number) => String(n).padStart(2, '0');

const isoToBR = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const brToISO = (br?: string): string | null => {
  if (!br || br === '—') return null;
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12).toISOString();
};

const numToBR = (v?: number | null): string => (v == null ? '' : v.toFixed(2).replace('.', ','));

const brToNum = (v?: string): number | null => {
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();

const STATUS_ALIASES: Record<string, EquipStatus> = {
  DISPONIVEL: 'Disponível',
  AVAILABLE: 'Disponível',
  STOCK: 'Disponível',
  ESTOQUE: 'Disponível',
  EMESTOQUE: 'Disponível',
  EMUSO: 'Em uso',
  INUSE: 'Em uso',
  ASSIGNED: 'Em uso',
  ACTIVE: 'Em uso',
  ATIVO: 'Em uso',
  MANUTENCAO: 'Manutenção',
  EMMANUTENCAO: 'Manutenção',
  MAINTENANCE: 'Manutenção',
  REPAIR: 'Manutenção',
  CONSERTO: 'Manutenção',
  BAIXADO: 'Descartado',
  RETIRED: 'Descartado',
  DISPOSED: 'Descartado',
  DESCARTADO: 'Descartado',
  INACTIVE: 'Descartado',
  PERDIDO: 'Perdido',
  LOST: 'Perdido',
  EXTRAVIADO: 'Perdido',
};

export const toAppStatus = (raw?: string | null): EquipStatus => STATUS_ALIASES[norm(raw || '')] || 'Disponível';

const toAppRole = (raw?: string | null): 'Admin' | 'Técnico' =>
  norm(raw || '').includes('ADMIN') ? 'Admin' : 'Técnico';

// id no estilo cuid do Prisma (25 chars, prefixo "c")
export const genId = () => {
  let s = 'c';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

const relTime = (iso: string): string => {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 30) return `${diff} d`;
  return isoToBR(iso);
};

// A coluna não existe no banco? O PostgREST responde "schema cache" e o
// Postgres, "does not exist" — as duas formas aparecem conforme o caminho.
const colunaAusente = (error: any, coluna: string) => {
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  return msg.toLowerCase().includes(coluna.toLowerCase()) && /schema cache|does not exist/i.test(msg);
};

/* ------------------------- templates de termo ------------------------- */

// Textos curtos usados nas primeiras versões do app; foram substituídos
// pelos documentos oficiais e devem ser ignorados se ainda estiverem no banco
const TEMPLATES_LEGADOS = [
  'comprometendo-me a zelar por sua guarda e conservação',
  'que permanecem de propriedade da empresa e devem ser devolvidos quando solicitado',
  'nas condições registradas na conferência',
  'declaro ..., referente aos equipamentos abaixo',
];

const ehFormatoDoApp = (c: string) => /\{(NOME|EQUIPAMENTOS|CPF|DATA)\}/.test(c || '');
// Compara em NFC: o mesmo texto gravado com acentos decompostos (NFD) não
// bateria num includes() direto
const nfc = (c: string) => (c || '').normalize('NFC');
const ehLegado = (c: string) => TEMPLATES_LEGADOS.some((s) => nfc(c).includes(nfc(s)));

// Campos que os documentos oficiais preenchem no cabeçalho e no bloco de
// assinatura. Um texto do banco que não traz NENHUM deles, e ainda é uma
// fração do tamanho do oficial, é rascunho de versão antiga — não uma
// personalização. Sobrescrever o oficial com ele faz o endereço, o CNPJ e
// os CPFs sumirem do termo sem aviso nenhum.
const CAMPOS_DO_OFICIAL = ['{ENDERECO}', '{CNPJ_EMPRESA}', '{CPF_RESPONSAVEL_TI}'];

const ehRascunho = (doBanco: string, oficial: string) => {
  const esperados = CAMPOS_DO_OFICIAL.filter((ph) => oficial.includes(ph));
  if (!esperados.length) return false;
  if (esperados.some((ph) => (doBanco || '').includes(ph))) return false;
  return (doBanco || '').length < oficial.length / 4;
};

const chaveTemplate = (nome: string) => {
  const n = (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (n.includes('respons')) return 'responsabilidade';
  if (n.includes('comodato')) return 'comodato';
  if (n.includes('devolu')) return 'devolucao';
  return n.trim();
};

// Parte dos textos oficiais embutidos e sobrescreve apenas com templates do
// banco que estejam no formato do app e tenham sido realmente customizados
export function mergeTemplates(rows: any[]): TermoTemplateDB[] {
  const out: TermoTemplateDB[] = TERMO_TEMPLATES_PADRAO.map((t) => ({ ...t }));
  rows
    .map((t) => ({ id: t.id, name: t.name, content: t.content }))
    .filter((t) => ehFormatoDoApp(t.content) && !ehLegado(t.content))
    .forEach((t) => {
      const i = out.findIndex((m) => chaveTemplate(m.name) === chaveTemplate(t.name));
      if (i < 0) return void out.push(t);
      const oficial = TERMO_TEMPLATES_PADRAO.find((m) => chaveTemplate(m.name) === chaveTemplate(t.name));
      if (oficial && ehRascunho(t.content, oficial.content)) return;
      out[i] = t;
    });
  return out;
}

// Diferenças entre o equipamento antigo e o novo → linhas de histórico
export const diffEquipment = (oldE: Equipment | null | undefined, newE: Equipment): string[] => {
  if (!oldE) return [];
  const out: string[] = [];
  (Object.keys(FIELD_LABELS) as (keyof Equipment)[]).forEach((k) => {
    const a = String(oldE[k] ?? '').trim();
    const b = String(newE[k] ?? '').trim();
    if (a !== b && !(a === '—' && b === '') && !(a === '' && b === '—')) {
      out.push(`${FIELD_LABELS[k]} alterado de "${a || '—'}" para "${b || '—'}"`);
    }
  });
  return out;
};

/* ---------------------------------- mock ---------------------------------- */

const MOCK_KEY = '@inventario/mockdb-v3';
const MOCK_SESSION_KEY = '@inventario/mock-session-v1';

class MockRepo implements Repo {
  mode = 'mock' as const;
  private db: DB | null = null;

  private async load(): Promise<DB> {
    if (this.db) return this.db;
    try {
      const raw = await AsyncStorage.getItem(MOCK_KEY);
      if (raw) {
        this.db = JSON.parse(raw) as DB;
        return this.db;
      }
    } catch {}
    this.db = {
      equipments: [...EQUIPMENTS],
      users: USERS.map((u) => ({ ...u, access: [...u.access] })),
      colaboradores: [...COLABORADORES],
      movements: [...MOVEMENTS],
      alertas: [...ALERTAS],
      imports: [...IMPORTS],
      inventories: [...INVENTORIES],
      categorias: [...CATEGORIAS],
      templates: TERMO_TEMPLATES_PADRAO.map((t, i) => ({ ...t, id: i + 1 })),
      logs: [],
    };
    return this.db;
  }

  private async persist() {
    if (!this.db) return;
    try {
      await AsyncStorage.setItem(MOCK_KEY, JSON.stringify(this.db));
    } catch {}
  }

  private hoje() {
    const d = new Date();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private log(equipmentId: string, descricao: string) {
    if (!this.db) return;
    this.db.logs = [{ id: genId(), equipmentId, descricao, data: this.hoje() }, ...this.db.logs];
  }

  private nextAsset(db: DB, tipo: string): string {
    const tag = tipoTag(tipo);
    let max = 0;
    db.equipments.forEach((e) => {
      if (!e.assetId || !e.assetId.startsWith(tag + '-')) return;
      const m = /-(\d+)$/.exec(e.assetId);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `${tag}-${String(max + 1).padStart(4, '0')}`;
  }

  async signIn(email: string, _senha: string): Promise<AppUser> {
    const db = await this.load();
    const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const user: AppUser =
      found ||
      ({
        nome: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Usuário',
        email: email.trim(),
        role: 'Admin',
        access: db.inventories.map((i) => i.nome),
      } as AppUser);
    try {
      await AsyncStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    } catch {}
    return user;
  }

  async signInWithGoogle(): Promise<AppUser | null> {
    throw new Error('Login com o Google exige conexão com o servidor (modo demonstração ativo)');
  }

  async signOut() {
    try {
      await AsyncStorage.removeItem(MOCK_SESSION_KEY);
    } catch {}
  }

  async restoreSession(): Promise<AppUser | null> {
    try {
      const raw = await AsyncStorage.getItem(MOCK_SESSION_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

  async createCategory(nome: string) {
    const db = await this.load();
    const n = nome.trim();
    if (!n) return;
    if (db.categorias.some((c) => c.toLowerCase() === n.toLowerCase())) throw new Error('Categoria já existe');
    db.categorias = [...db.categorias, n].sort();
    await this.persist();
  }

  async fetchAll(): Promise<DB> {
    return this.load();
  }

  async saveEquipment(e: Equipment, old?: Equipment | null) {
    const db = await this.load();
    const i = db.equipments.findIndex((x) => x.id === e.id);
    if (i < 0 && !e.assetId) e = { ...e, assetId: this.nextAsset(db, e.tipo) };
    // trocou de categoria → o ID do ativo acompanha a nova sigla
    const mudouCategoria = i >= 0 && !!old && old.tipo.toLowerCase() !== e.tipo.toLowerCase();
    if (mudouCategoria) e = { ...e, assetId: this.nextAsset(db, e.tipo) };
    if (i >= 0) db.equipments[i] = e;
    else db.equipments = [e, ...db.equipments];
    diffEquipment(old, e).forEach((d) => this.log(e.id, d));
    if (mudouCategoria) this.log(e.id, `ID do ativo alterado de "${old!.assetId || '—'}" para "${e.assetId}"`);
    if (old && old.status !== e.status) {
      db.movements = [
        {
          id: genId(),
          titulo: `${e.marca} ${e.modelo}`.trim(),
          origem: old.status,
          destino: e.status,
          data: this.hoje().slice(0, 5),
          dataFull: this.hoje(),
          saida: e.status === 'Em uso',
          equipmentId: e.id,
        },
        ...db.movements,
      ];
    }
    await this.persist();
  }

  async insertEquipments(list: Equipment[]) {
    const db = await this.load();
    for (const e of list) {
      const withId = e.assetId ? e : { ...e, assetId: this.nextAsset(db, e.tipo) };
      db.equipments = [withId, ...db.equipments];
    }
    await this.persist();
  }

  async movimentar(e: Equipment, novoResponsavel: string, departamento: string) {
    const db = await this.load();
    const antigo = e.usuario;
    const novo = novoResponsavel || '—';
    db.equipments = db.equipments.map((x) =>
      x.id === e.id
        ? { ...x, usuario: novo, departamento, status: novo === '—' ? 'Disponível' : 'Em uso' }
        : x
    );
    db.movements = [
      {
        id: genId(),
        titulo: `${e.marca} ${e.modelo}`.trim(),
        origem: antigo === '—' ? 'Estoque TI' : antigo,
        destino: novo === '—' ? 'Estoque TI' : novo,
        data: this.hoje().slice(0, 5),
        dataFull: this.hoje(),
        saida: novo !== '—',
        equipmentId: e.id,
      },
      ...db.movements,
    ];
    this.log(e.id, `Responsável alterado de "${antigo}" para "${novo}"`);
    await this.persist();
  }

  async devolverEquipamentos(list: Equipment[], responsavel: string) {
    const db = await this.load();
    const ids = new Set(list.map((e) => e.id));
    db.equipments = db.equipments.map((x) =>
      ids.has(x.id)
        ? { ...x, usuario: '—', status: 'Disponível', emailUsuario: '', cpfUsuario: '', departamento: '', gestor: '' }
        : x
    );
    list.forEach((e) => {
      this.log(e.id, `Devolvido por "${responsavel}" — transferido para o estoque (termo de devolução)`);
      db.movements = [
        {
          id: genId(),
          titulo: `${e.marca} ${e.modelo}`.trim(),
          origem: responsavel,
          destino: 'Estoque TI',
          data: this.hoje().slice(0, 5),
          dataFull: this.hoje(),
          saida: false,
          equipmentId: e.id,
        },
        ...db.movements,
      ];
    });
    await this.persist();
  }

  async saveTemplate(t: TermoTemplateDB) {
    const db = await this.load();
    if (t.id != null && db.templates.some((x) => x.id === t.id)) {
      db.templates = db.templates.map((x) => (x.id === t.id ? t : x));
    } else {
      const id = db.templates.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
      db.templates = [...db.templates, { ...t, id }];
    }
    await this.persist();
  }

  async createUser(
    nome: string,
    email: string,
    _senha: string,
    role: 'Admin' | 'Técnico',
    access: string[],
    cpf?: string
  ): Promise<string | null> {
    const db = await this.load();
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('E-mail já cadastrado');
    db.users = [...db.users, { nome, email, role, access, cpf }];
    await this.persist();
    return null;
  }

  async changePassword(_senha: string) {
    // Modo demonstração: senha não é validada
  }

  async updateUser(
    originalEmail: string,
    d: { nome: string; email: string; senha?: string; role: 'Admin' | 'Técnico'; access: string[]; cpf?: string }
  ) {
    const db = await this.load();
    db.users = db.users.map((u) =>
      u.email.toLowerCase() === originalEmail.toLowerCase()
        ? { ...u, nome: d.nome, email: d.email, role: d.role, access: d.access, cpf: d.cpf }
        : u
    );
    await this.persist();
    return null; // no modo demonstração nunca falta coluna
  }

  async deleteUser(email: string) {
    const db = await this.load();
    db.users = db.users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
    await this.persist();
  }

  async deleteEquipment(e: Equipment) {
    const db = await this.load();
    db.equipments = db.equipments.filter((x) => x.id !== e.id);
    db.movements = db.movements.filter((m) => m.equipmentId !== e.id);
    db.logs = db.logs.filter((l) => l.equipmentId !== e.id);
    await this.persist();
  }

  async saveUnit(u: { id: string | null; nome: string; cnpj?: string; endereco?: string; apelido?: string }) {
    const db = await this.load();
    if (u.id) {
      db.inventories = db.inventories.map((i) =>
        i.id === u.id
          ? { ...i, nome: u.nome, sigla: sigla(u.nome), cnpj: u.cnpj, endereco: u.endereco, apelido: u.apelido }
          : i
      );
    } else {
      db.inventories = [
        ...db.inventories,
        { id: genId(), nome: u.nome, sigla: sigla(u.nome), cnpj: u.cnpj, endereco: u.endereco, apelido: u.apelido },
      ];
    }
    await this.persist();
    return []; // no modo demonstração nunca falta coluna
  }

  async updateMyCpf(email: string, cpf: string) {
    const db = await this.load();
    db.users = db.users.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, cpf } : u));
    await this.persist();
  }

  async deleteUnit(id: string) {
    const db = await this.load();
    const unit = db.inventories.find((i) => i.id === id);
    if (unit && db.equipments.some((e) => e.unidade === unit.nome))
      throw new Error('A unidade possui equipamentos — mova ou exclua-os antes.');
    db.inventories = db.inventories.filter((i) => i.id !== id);
    await this.persist();
  }

  async updateUserAccess(nome: string, access: string[]) {
    const db = await this.load();
    db.users = db.users.map((u) => (u.nome === nome ? { ...u, access } : u));
    await this.persist();
  }

  async addImport(rec: ImportRecord) {
    const db = await this.load();
    db.imports = [rec, ...db.imports];
    await this.persist();
  }

  async addTermo(_t: TermoRecord) {}
}

/* -------------------------- supabase (esquema web) -------------------------- */
// Tabelas do sistema web (Prisma): Unit, Category, Equipment, User,
// AssignmentHistory, DocumentTemplate, Settings + EquipmentLog (criada p/ app).

class SupabaseRepo implements Repo {
  mode = 'supabase' as const;
  private units: { id: string; name: string; cnpj?: string | null; address?: string | null; nickname?: string | null }[] = [];
  private cats: { id: string; name: string; unitId: string | null }[] = [];
  private rawStatusByApp = new Map<EquipStatus, string>();
  private rawRoleByApp = new Map<'Admin' | 'Técnico', string>();
  private conditionDefault = 'Bom';
  private importsSession: ImportRecord[] = [];
  private hasLogTable = true;

  private get sb() {
    const c = getSupabase();
    if (!c) throw new Error('Supabase não configurado');
    return c;
  }

  private unitName(id?: string | null) {
    return this.units.find((u) => u.id === id)?.name || '—';
  }

  private unitId(name: string) {
    return this.units.find((u) => u.name === name)?.id || null;
  }

  private catName(id: string) {
    return this.cats.find((c) => c.id === id)?.name || 'Equipamento';
  }

  private async profileFor(email: string): Promise<AppUser> {
    const { data, error } = await this.sb.from('User').select('*').ilike('email', email).maybeSingle();
    if (error) throw new Error('Falha ao carregar o perfil: ' + error.message);
    if (!data) throw new Error('Usuário sem cadastro na tabela User. Peça a um administrador.');
    if (data.active === false) throw new Error('Usuário desativado.');
    return this.mapUser(data);
  }

  private mapUser(u: any): AppUser {
    const role = toAppRole(u.role);
    if (u.role && !this.rawRoleByApp.has(role)) this.rawRoleByApp.set(role, u.role);
    let access: string[];
    if (Array.isArray(u.allowedUnitIds) && u.allowedUnitIds.length) {
      access = u.allowedUnitIds.map((id: string) => this.unitName(id)).filter((n: string) => n !== '—');
    } else if (role === 'Admin' || !u.unitId) {
      access = this.units.map((x) => x.name);
    } else {
      access = [this.unitName(u.unitId)];
    }
    return { nome: u.name, email: u.email, role, access, cpf: u.cpf || undefined };
  }

  private async loadRefs() {
    const [un, ca] = await Promise.all([
      this.sb.from('Unit').select('*').order('name'),
      this.sb.from('Category').select('id,name,unitId'),
    ]);
    if (un.error) throw un.error;
    if (ca.error) throw ca.error;
    this.units = un.data || [];
    this.cats = ca.data || [];
  }

  private mapEquipment(r: any): Equipment {
    const status = toAppStatus(r.status);
    if (!this.rawStatusByApp.has(status)) this.rawStatusByApp.set(status, r.status);
    return {
      id: r.id,
      assetId: r.assetId,
      unidade: this.unitName(r.unitId),
      tipo: this.catName(r.categoryId),
      marca: r.brand || '',
      modelo: r.model || '',
      // campos em branco permanecem em branco — nada de valor substituto
      serial: r.serialNumber || '',
      patrimonio: r.assetTag || '',
      status,
      usuario: r.currentUserName || '—',
      local: r.location || '',
      compra: isoToBR(r.acquisitionDate),
      garantia: isoToBR(r.warrantyEndDate),
      obs: r.notes || undefined,
      cor: r.color || '',
      configuracao: r.configuration || '',
      condicao: r.condition || '',
      propriedade: r.ownership || '',
      fornecedor: r.supplier || '',
      emailUsuario: r.userEmail || '',
      cpfUsuario: r.userCpf || '',
      departamento: r.department || '',
      gestor: r.manager || '',
      entrega: isoToBR(r.deliveryDate),
      conferencia: isoToBR(r.lastCheckDate),
      valor: numToBR(r.value),
      acessorios: r.accessories || '',
      imei1: r.imei1 || '',
      imei2: r.imei2 || '',
      mac: r.macAddress || '',
      pelicula: r.pelicula || '',
      capa: r.capa || '',
      operadora: r.operadora || '',
      plano: r.plano || '',
      portabilidade: r.portabilidade || '',
      iccid: r.iccid || '',
      telefone: r.telefone || '',
      usuarioAntigo: r.previousUserName || '',
    };
  }

  private rawStatus(app: EquipStatus): string {
    return this.rawStatusByApp.get(app) || app;
  }

  private async categoryIdFor(tipo: string, unidade: string): Promise<string> {
    const uid = this.unitId(unidade);
    const alvo = tipo.trim().toLowerCase();
    const buscar = () =>
      this.cats.find((c) => c.name.trim().toLowerCase() === alvo && c.unitId === uid) ||
      this.cats.find((c) => c.name.trim().toLowerCase() === alvo);
    let match = buscar();
    // categoria recém-criada pode não estar na lista em memória ainda
    if (!match) {
      await this.loadRefs();
      match = buscar();
    }
    if (match) return match.id;
    const id = genId();
    const { error } = await this.sb
      .from('Category')
      .insert({ id, name: tipo, unitId: uid, createdAt: new Date().toISOString() });
    if (error) throw new Error(`Falha ao criar a categoria "${tipo}": ${error.message}`);
    this.cats.push({ id, name: tipo, unitId: uid });
    return id;
  }

  private async writeLogs(equipmentId: string, descricoes: string[]) {
    if (!descricoes.length || !this.hasLogTable) return;
    const rows = descricoes.map((d) => ({ id: genId(), equipmentId, description: d }));
    const { error } = await this.sb.from('EquipmentLog').insert(rows);
    if (error) this.hasLogTable = false; // tabela ainda não criada — segue sem log
  }

  async signIn(email: string, senha: string): Promise<AppUser> {
    const { error } = await this.sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) throw new Error('E-mail ou senha inválidos');
    if (!this.units.length) await this.loadRefs();
    return this.profileFor(email.trim());
  }

  async signInWithGoogle(): Promise<AppUser | null> {
    if (Platform.OS === 'web') {
      // web: redireciona a página inteira; a sessão é retomada na volta
      const { error } = await this.sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error('Não foi possível iniciar o login com o Google');
      return null;
    }
    // mobile: abre o navegador do sistema e volta pelo deep link do app
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await this.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw new Error('Não foi possível iniciar o login com o Google');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) throw new Error('Login com o Google cancelado');
    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (code) {
      const { error: e2 } = await this.sb.auth.exchangeCodeForSession(code);
      if (e2) throw new Error('Falha ao concluir o login: ' + e2.message);
    } else {
      const frag = new URLSearchParams(url.hash.replace(/^#/, ''));
      const access_token = frag.get('access_token');
      const refresh_token = frag.get('refresh_token');
      if (!access_token || !refresh_token) throw new Error('Resposta de login inválida do Google');
      const { error: e3 } = await this.sb.auth.setSession({ access_token, refresh_token });
      if (e3) throw new Error('Falha ao concluir o login: ' + e3.message);
    }
    const { data: u } = await this.sb.auth.getUser();
    const email = u.user?.email;
    if (!email) throw new Error('Não foi possível obter o e-mail da conta Google');
    if (!this.units.length) await this.loadRefs();
    return this.profileFor(email);
  }

  async createCategory(nome: string) {
    const n = nome.trim();
    if (!n) return;
    if (!this.cats.length) await this.loadRefs();
    if (this.cats.some((c) => c.name.trim().toLowerCase() === n.toLowerCase())) throw new Error('Categoria já existe');
    const id = genId();
    const { error } = await this.sb
      .from('Category')
      .insert({ id, name: n, unitId: null, createdAt: new Date().toISOString() });
    if (error) throw new Error('Falha ao criar a categoria: ' + error.message);
    this.cats.push({ id, name: n, unitId: null }); // já disponível para o próximo cadastro
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async restoreSession(): Promise<AppUser | null> {
    const { data } = await this.sb.auth.getSession();
    const email = data.session?.user?.email;
    if (!email) return null;
    try {
      if (!this.units.length) await this.loadRefs();
      return await this.profileFor(email);
    } catch {
      return null;
    }
  }

  async fetchAll(): Promise<DB> {
    await this.loadRefs();
    const [eq, us, hist, tpl] = await Promise.all([
      this.sb.from('Equipment').select('*').order('createdAt', { ascending: false }),
      this.sb.from('User').select('*').order('name'),
      this.sb.from('AssignmentHistory').select('*').order('startDate', { ascending: false }).limit(200),
      this.sb.from('DocumentTemplate').select('*').order('id'),
    ]);
    if (eq.error) throw eq.error;
    if (us.error) throw us.error;

    let logsRaw: any[] = [];
    let logs: EquipmentLogEntry[] = [];
    if (this.hasLogTable) {
      const lg = await this.sb.from('EquipmentLog').select('*').order('createdAt', { ascending: false }).limit(500);
      if (lg.error) this.hasLogTable = false;
      else {
        logsRaw = lg.data || [];
        logs = logsRaw.map((l: any) => ({
          id: l.id,
          equipmentId: l.equipmentId,
          descricao: l.description,
          data: isoToBR(l.createdAt),
        }));
      }
    }

    const rawEquip = (eq.data || []) as any[];
    if (rawEquip.length) {
      const counts = new Map<string, number>();
      rawEquip.forEach((r) => counts.set(r.condition, (counts.get(r.condition) || 0) + 1));
      this.conditionDefault = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    const equipments = rawEquip.map((r) => this.mapEquipment(r));
    const eqById = new Map(equipments.map((e) => [e.id, e]));

    const colabMap = new Map<string, Colaborador>();
    rawEquip.forEach((r) => {
      if (r.currentUserName) colabMap.set(r.currentUserName, { nome: r.currentUserName, setor: r.department || '—' });
    });
    ((hist.data || []) as any[]).forEach((h) => {
      if (h.userName && !colabMap.has(h.userName)) colabMap.set(h.userName, { nome: h.userName, setor: h.department || '—' });
    });

    // Movimentações = trocas de responsável (AssignmentHistory, também
    // geradas pelo web) + mudanças de status (auditoria do app)
    const nomeEq = (id: string) => {
      const e = eqById.get(id);
      return e ? `${e.marca} ${e.modelo}`.trim() || e.patrimonio : 'Equipamento';
    };
    const movsTs: { ts: number; mov: Movement }[] = [];
    ((hist.data || []) as any[]).forEach((h) => {
      const devolvido = !!h.endDate;
      const quando = devolvido ? h.endDate : h.startDate;
      movsTs.push({
        ts: new Date(quando).getTime() || 0,
        mov: {
          id: h.id,
          titulo: nomeEq(h.equipmentId),
          origem: devolvido ? h.userName : 'Estoque TI',
          destino: devolvido ? 'Estoque TI' : h.userName,
          data: isoToBR(quando).slice(0, 5),
          saida: !devolvido,
          equipmentId: h.equipmentId,
          dataFull: isoToBR(quando),
        },
      });
    });
    logsRaw.forEach((l: any) => {
      const m = /^Status alterado de "(.+?)" para "(.+?)"/.exec(l.description || '');
      if (!m) return;
      movsTs.push({
        ts: new Date(l.createdAt).getTime() || 0,
        mov: {
          id: 'st-' + l.id,
          titulo: nomeEq(l.equipmentId),
          origem: m[1],
          destino: m[2],
          data: isoToBR(l.createdAt).slice(0, 5),
          saida: m[2] === 'Em uso',
          equipmentId: l.equipmentId,
          dataFull: isoToBR(l.createdAt),
        },
      });
    });
    const movements: Movement[] = movsTs.sort((a, b) => b.ts - a.ts).map((x) => x.mov);

    let warnDays = 90;
    try {
      const st = await this.sb.from('Settings').select('*').limit(1);
      if (!st.error && st.data?.[0]?.warrantyWarningDays) warnDays = st.data[0].warrantyWarningDays;
    } catch {}
    const alertas: Alerta[] = [];
    const now = Date.now();
    rawEquip.forEach((r) => {
      const e = eqById.get(r.id)!;
      const nome = `${e.marca} ${e.modelo}`.trim() || e.patrimonio;
      if (r.warrantyEndDate && e.status !== 'Descartado') {
        const diff = Math.round((new Date(r.warrantyEndDate).getTime() - now) / 86400000);
        if (diff >= 0 && diff <= warnDays)
          alertas.push({ id: 'g-' + r.id, titulo: `Garantia vencendo — ${nome}`, sub: `${e.patrimonio} · vence em ${diff} dias`, quando: 'hoje', kind: 'aviso' });
        else if (diff < 0 && diff > -180)
          alertas.push({ id: 'gv-' + r.id, titulo: `Garantia vencida — ${nome}`, sub: `${e.patrimonio} · venceu em ${e.garantia}`, quando: relTime(r.warrantyEndDate), kind: 'critico' });
      }
      if (e.status === 'Manutenção')
        alertas.push({ id: 'm-' + r.id, titulo: `Em manutenção — ${nome}`, sub: `${e.patrimonio} · ${e.local}`, quando: relTime(r.statusChangedAt || new Date().toISOString()), kind: 'aviso' });
    });

    const categorias = [...new Set(this.cats.map((c) => c.name))].sort();
    const templates = mergeTemplates((tpl.data as any[]) || []);

    return {
      equipments,
      users: ((us.data || []) as any[]).map((u) => this.mapUser(u)),
      colaboradores: [...colabMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
      movements,
      alertas,
      imports: this.importsSession,
      inventories: this.units.map((u) => ({
        id: u.id,
        nome: u.name,
        sigla: sigla(u.name),
        cnpj: u.cnpj || undefined,
        endereco: u.address || undefined,
        apelido: u.nickname || undefined,
      })),
      categorias: categorias.length ? categorias : [...CATEGORIAS],
      templates: templates.length ? templates : TERMO_TEMPLATES_PADRAO,
      logs,
    };
  }

  private async toRow(e: Equipment): Promise<Record<string, any>> {
    // A unidade é resolvida primeiro: sem ID válido o equipamento seria
    // gravado "no vazio" e sumiria de todos os inventários.
    // ("—" ou vazio = sem unidade, situação legítima.)
    const semUnidade = !e.unidade || e.unidade === '—';
    let unitId = semUnidade ? null : this.unitId(e.unidade);
    if (!semUnidade && !unitId) {
      await this.loadRefs(); // pode ser uma unidade recém-criada
      unitId = this.unitId(e.unidade);
      if (!unitId) throw new Error(`A unidade "${e.unidade}" não foi encontrada no banco.`);
    }
    const categoryId = await this.categoryIdFor(e.tipo, e.unidade);
    return {
      unitId,
      categoryId,
      brand: e.marca || null,
      model: e.modelo || null,
      serialNumber: e.serial && e.serial !== '—' ? e.serial : null,
      assetTag: e.patrimonio || null,
      status: this.rawStatus(e.status),
      location: e.local && e.local !== '—' ? e.local : null,
      currentUserName: e.usuario === '—' ? null : e.usuario || null,
      acquisitionDate: brToISO(e.compra),
      warrantyEndDate: brToISO(e.garantia),
      notes: e.obs || null,
      color: e.cor || null,
      configuration: e.configuracao || null,
      condition: e.condicao || this.conditionDefault,
      ownership: e.propriedade || null,
      supplier: e.fornecedor || null,
      userEmail: e.emailUsuario || null,
      userCpf: e.cpfUsuario || null,
      department: e.departamento || null,
      manager: e.gestor || null,
      deliveryDate: brToISO(e.entrega),
      lastCheckDate: brToISO(e.conferencia),
      value: brToNum(e.valor),
      accessories: e.acessorios || null,
      imei1: e.imei1 || null,
      imei2: e.imei2 || null,
      macAddress: e.mac || null,
      pelicula: e.pelicula || null,
      capa: e.capa || null,
      operadora: e.operadora || null,
      plano: e.plano || null,
      portabilidade: e.portabilidade || null,
      iccid: e.iccid || null,
      telefone: e.telefone || null,
      previousUserName: e.usuarioAntigo || null,
      updatedAt: new Date().toISOString(),
    };
  }

  async saveEquipment(e: Equipment, old?: Equipment | null) {
    const row = await this.toRow(e);
    const { data: existing } = await this.sb.from('Equipment').select('id,status').eq('id', e.id).maybeSingle();
    if (existing) {
      if (existing.status !== row.status) row.statusChangedAt = new Date().toISOString();
      // Mudou de categoria → o ID do ativo acompanha a nova sigla
      // (ex.: MON-0004 vira FON-0002 ao virar "Fone")
      const mudouCategoria = !!old && old.tipo.toLowerCase() !== e.tipo.toLowerCase();
      if (mudouCategoria) row.assetId = await this.generateAssetId(e.tipo);
      const { error } = await this.sb.from('Equipment').update(row).eq('id', e.id);
      if (error) throw new Error('Falha ao salvar o equipamento: ' + error.message);
      const mudancas = diffEquipment(old, e);
      if (mudouCategoria && row.assetId) {
        mudancas.push(`ID do ativo alterado de "${old!.assetId || '—'}" para "${row.assetId}"`);
      }
      await this.writeLogs(e.id, mudancas);
    } else {
      const now = new Date().toISOString();
      const { error } = await this.sb.from('Equipment').insert({
        id: e.id.length >= 20 ? e.id : genId(),
        assetId: await this.generateAssetId(e.tipo),
        createdAt: now,
        statusChangedAt: now,
        ...row,
      });
      if (error) throw new Error('Falha ao cadastrar o equipamento: ' + error.message);
    }
  }

  async insertEquipments(list: Equipment[]) {
    const now = new Date().toISOString();
    // contador sequencial por categoria dentro do lote importado
    const counters = new Map<string, number>();
    const rows = [];
    for (const e of list) {
      const row = await this.toRow(e);
      const tag = tipoTag(e.tipo);
      if (!counters.has(tag)) counters.set(tag, await this.nextAssetNumber(tag));
      const n = counters.get(tag)!;
      counters.set(tag, n + 1);
      rows.push({
        id: genId(),
        assetId: `${tag}-${String(n).padStart(4, '0')}`,
        createdAt: now,
        statusChangedAt: now,
        ...row,
      });
    }
    const { error } = await this.sb.from('Equipment').insert(rows);
    if (error) throw error;
  }

  async movimentar(e: Equipment, novoResponsavel: string, departamento: string) {
    const now = new Date().toISOString();
    const novo = novoResponsavel.trim();
    // fecha o vínculo atual no histórico
    const closed = await this.sb
      .from('AssignmentHistory')
      .update({ endDate: now })
      .eq('equipmentId', e.id)
      .is('endDate', null);
    if (closed.error) throw new Error('Falha ao registrar a movimentação: ' + closed.error.message);
    // abre o novo vínculo
    if (novo) {
      const ins = await this.sb.from('AssignmentHistory').insert({
        id: genId(),
        equipmentId: e.id,
        userName: novo,
        department: departamento || null,
        startDate: now,
        createdAt: now,
      });
      if (ins.error) throw new Error('Falha ao registrar a movimentação: ' + ins.error.message);
    }
    const { error } = await this.sb
      .from('Equipment')
      .update({
        currentUserName: novo || null,
        department: departamento || null,
        status: this.rawStatus(novo ? 'Em uso' : 'Disponível'),
        statusChangedAt: now,
        updatedAt: now,
      })
      .eq('id', e.id);
    if (error) throw error;
    await this.writeLogs(e.id, [`Responsável alterado de "${e.usuario}" para "${novo || '—'}"`]);
  }

  async devolverEquipamentos(list: Equipment[], responsavel: string) {
    const now = new Date().toISOString();
    for (const e of list) {
      await this.sb.from('AssignmentHistory').update({ endDate: now }).eq('equipmentId', e.id).is('endDate', null);
      const { error } = await this.sb
        .from('Equipment')
        .update({
          currentUserName: null,
          userEmail: null,
          userCpf: null,
          department: null,
          manager: null,
          status: this.rawStatus('Disponível'),
          statusChangedAt: now,
          updatedAt: now,
        })
        .eq('id', e.id);
      if (error) throw error;
      await this.writeLogs(e.id, [`Devolvido por "${responsavel}" — transferido para o estoque (termo de devolução)`]);
    }
  }

  async saveTemplate(t: TermoTemplateDB) {
    const now = new Date().toISOString();
    if (t.id != null) {
      const { error } = await this.sb
        .from('DocumentTemplate')
        .update({ name: t.name, content: t.content, updatedAt: now })
        .eq('id', t.id);
      if (error) throw error;
    } else {
      let { error } = await this.sb.from('DocumentTemplate').insert({ name: t.name, content: t.content, updatedAt: now });
      if (error) {
        // tabela sem default de id (Prisma autoincrement ausente) — calcula manualmente
        const { data } = await this.sb.from('DocumentTemplate').select('id').order('id', { ascending: false }).limit(1);
        const nextId = ((data?.[0]?.id as number) || 0) + 1;
        const res = await this.sb.from('DocumentTemplate').insert({ id: nextId, name: t.name, content: t.content, updatedAt: now });
        if (res.error) throw res.error;
      }
    }
  }

  async createUser(
    nome: string,
    email: string,
    senha: string,
    role: 'Admin' | 'Técnico',
    access: string[],
    cpf?: string
  ): Promise<string | null> {
    const now = new Date().toISOString();
    const ids = access.map((n) => this.unitId(n)).filter(Boolean);
    const rawRole = this.rawRoleByApp.get(role) || (role === 'Admin' ? 'ADMIN' : 'USER');
    const perfil: Record<string, any> = {
      id: genId(),
      name: nome.trim(),
      email: email.trim(),
      passwordHash: 'supabase-auth', // senha real fica no Supabase Auth
      role: rawRole,
      active: true,
      allowedUnitIds: ids.length ? ids : null,
      cpf: cpf?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    // Caminho normal: a função Edge cria o login já confirmado E grava o
    // perfil com service_role — a tabela "User" não é escrita pelo app.
    const resp = await this.adminUsersFn({ action: 'create', email: email.trim(), novaSenha: senha, perfil });
    if (resp) return resp.aviso || null;

    // Fallback (função ainda não publicada): signUp comum + gravação
    // direta. Deixa de funcionar quando o RLS da tabela "User" for
    // fechado — por isso o erro abaixo aponta o que falta fazer.
    let confirmado = false;
    {
      const auxClient = getSupabaseAux();
      if (!auxClient) throw new Error('Supabase não configurado');
      const { data, error } = await auxClient.auth.signUp({ email: email.trim(), password: senha });
      if (error) {
        throw new Error(
          /already|registered|exists/i.test(error.message) ? 'E-mail já possui login cadastrado' : 'Falha ao criar login: ' + error.message
        );
      }
      // sem sessão = projeto exige confirmação por e-mail
      confirmado = !!data.session;
    }
    const row = { ...perfil };
    let cpfIgnorado = false;
    let { error: e2 } = await this.sb.from('User').insert(row);
    if (e2 && /cpf/i.test(e2.message)) {
      // o banco recusou a coluna cpf — grava sem ela, mas avisa depois
      delete row.cpf;
      e2 = (await this.sb.from('User').insert(row)).error;
      cpfIgnorado = !e2;
    }
    if (e2) {
      throw new Error(
        /policy|permission|denied/i.test(e2.message)
          ? 'Login criado, mas o perfil não pôde ser salvo. ' + SupabaseRepo.FALTA_FN
          : 'Login criado, mas falhou ao salvar o perfil: ' + e2.message
      );
    }
    // Aviso (não é erro): o usuário existe e aparece na lista, mas precisa
    // confirmar o e-mail antes de conseguir entrar
    if (!confirmado) {
      return 'Usuário criado, mas só entrará após confirmar o e-mail. Defina uma senha para ele em Usuários para liberá-lo na hora.';
    }
    return cpfIgnorado ? SupabaseRepo.AVISO_CPF : null;
  }

  async changePassword(senha: string) {
    const { error } = await this.sb.auth.updateUser({ password: senha });
    if (error) throw new Error('Falha ao alterar a senha: ' + error.message);
  }

  // Gera o próximo "ID do Ativo" legível, sequencial por categoria
  // (ex.: NTB-0001, CEL-0007) — igual ao comportamento do sistema web
  private async nextAssetNumber(tag: string): Promise<number> {
    const { data } = await this.sb.from('Equipment').select('assetId').ilike('assetId', `${tag}-%`);
    let max = 0;
    (data || []).forEach((r: any) => {
      const m = /-(\d+)$/.exec(r.assetId || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return max + 1;
  }

  private async generateAssetId(tipo: string): Promise<string> {
    const tag = tipoTag(tipo);
    const n = await this.nextAssetNumber(tag);
    return `${tag}-${String(n).padStart(4, '0')}`;
  }

  // Chama a função Edge "admin-users" (operações privilegiadas de Auth e
  // gravação da tabela "User", que o app não escreve mais diretamente).
  //
  // Devolve false SOMENTE quando a função não está publicada/acessível —
  // aí quem chamou decide o que fazer. Erro de verdade vindo da função
  // (e-mail duplicado, sem permissão, falha ao salvar) vira exceção com a
  // mensagem original, em vez de ser confundido com "indisponível".
  private async adminUsersFn(body: Record<string, unknown>): Promise<any | null> {
    try {
      const { data, error } = await this.sb.functions.invoke('admin-users', { body });
      if (error) {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          const corpo = await ctx.json().catch(() => null);
          if (corpo?.error) throw new Error(corpo.error);
        }
        if (ctx?.status && ctx.status !== 404) throw new Error(error.message);
        return null;
      }
      if (data?.error) throw new Error(data.error);
      return data || {};
    } catch (e: any) {
      if (e?.message && !/Failed to send|FunctionsFetchError|not found/i.test(e.message)) throw e;
      return null;
    }
  }

  // O banco recusou a coluna "cpf". Antes o CPF era descartado em
  // silêncio nos dois caminhos e a tela dizia "usuário atualizado".
  private static readonly AVISO_CPF =
    'Usuário salvo, mas o CPF não: a coluna "cpf" da tabela "User" não existe, ou o cache de schema do PostgREST está velho. Rode supabase/adicionar-coluna-cpf-usuario.sql no SQL Editor.';

  // Mensagem única para quando a função precisa existir e não existe
  private static readonly FALTA_FN =
    'Publique a função "admin-users" no Supabase (Edge Functions) — arquivo supabase/functions/admin-users/index.ts';

  async updateUser(
    originalEmail: string,
    d: { nome: string; email: string; senha?: string; role: 'Admin' | 'Técnico'; access: string[]; cpf?: string }
  ) {
    const emailMudou = d.email.trim().toLowerCase() !== originalEmail.toLowerCase();
    const ids = d.access.map((n) => this.unitId(n)).filter(Boolean);
    const rawRole = this.rawRoleByApp.get(d.role) || (d.role === 'Admin' ? 'ADMIN' : 'USER');
    const upd: Record<string, any> = {
      name: d.nome.trim(),
      email: d.email.trim(),
      role: rawRole,
      allowedUnitIds: ids.length ? ids : null,
      cpf: d.cpf?.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    // Caminho normal: login e perfil numa chamada só, com service_role.
    const resp = await this.adminUsersFn({
      action: 'update',
      email: originalEmail,
      novoEmail: emailMudou ? d.email.trim() : undefined,
      novaSenha: d.senha || undefined,
      perfil: upd,
    });
    if (resp) return resp.aviso || null;

    // Fallback: a função não está publicada. Alterar e-mail/senha de outro
    // usuário depende dela; o perfil ainda pode ser gravado direto.
    if (d.senha || emailMudou) {
      throw new Error('Para alterar e-mail/senha de outro usuário: ' + SupabaseRepo.FALTA_FN);
    }
    let cpfIgnorado = false;
    let { error } = await this.sb.from('User').update(upd).ilike('email', originalEmail);
    if (error && /cpf/i.test(error.message)) {
      delete upd.cpf;
      error = (await this.sb.from('User').update(upd).ilike('email', originalEmail)).error;
      cpfIgnorado = !error;
    }
    if (error) {
      throw new Error(
        /policy|permission|denied/i.test(error.message)
          ? 'Sem permissão para salvar o usuário. ' + SupabaseRepo.FALTA_FN
          : 'Falha ao salvar o usuário: ' + error.message
      );
    }
    return cpfIgnorado ? SupabaseRepo.AVISO_CPF : null;
  }

  async deleteUser(email: string) {
    // A função Edge remove o login (Auth) e a linha da tabela "User".
    if (await this.adminUsersFn({ action: 'delete', email })) return;
    // Fallback: sem a função, remove ao menos o cadastro — o que já
    // bloqueia o acesso, mesmo que o login continue existindo no Auth.
    const { error } = await this.sb.from('User').delete().ilike('email', email);
    if (error) {
      throw new Error(
        /policy|permission|denied/i.test(error.message)
          ? 'Sem permissão para excluir o usuário. ' + SupabaseRepo.FALTA_FN
          : 'Falha ao excluir o usuário: ' + error.message
      );
    }
  }

  async deleteEquipment(e: Equipment) {
    if (this.hasLogTable) await this.sb.from('EquipmentLog').delete().eq('equipmentId', e.id);
    await this.sb.from('AssignmentHistory').delete().eq('equipmentId', e.id);
    const { error } = await this.sb.from('Equipment').delete().eq('id', e.id);
    if (error) throw new Error('Falha ao excluir o equipamento: ' + error.message);
  }

  async saveUnit(u: { id: string | null; nome: string; cnpj?: string; endereco?: string; apelido?: string }) {
    const row: Record<string, any> = {
      name: u.nome.trim(),
      cnpj: u.cnpj?.trim() || null,
      address: u.endereco?.trim() || null,
      nickname: u.apelido?.trim() || null,
    };
    const exec = async () =>
      u.id
        ? (await this.sb.from('Unit').update(row).eq('id', u.id)).error
        : (await this.sb.from('Unit').insert({ id: genId(), createdAt: new Date().toISOString(), ...row })).error;

    // "name" existe sempre; as demais são colunas que só este app usa e podem
    // não existir no banco compartilhado. Antes, qualquer uma faltando
    // derrubava a gravação inteira — inclusive a troca do nome, que é a
    // coluna que sempre existe. Agora a coluna ausente é retirada e o resto
    // é salvo, e quem chamou recebe a lista para avisar na tela.
    const OPCIONAIS = ['nickname', 'cnpj', 'address'];
    const ausentes: string[] = [];
    let error = await exec();
    while (error) {
      const faltando = OPCIONAIS.find((c) => !ausentes.includes(c) && colunaAusente(error, c));
      if (!faltando) break;
      ausentes.push(faltando);
      delete row[faltando];
      error = await exec();
    }
    if (error) throw new Error('Falha ao salvar a unidade: ' + error.message);
    return ausentes;
  }

  async updateMyCpf(email: string, cpf: string) {
    const { error } = await this.sb
      .from('User')
      .update({ cpf: cpf.trim() || null, updatedAt: new Date().toISOString() })
      .ilike('email', email);
    if (error)
      throw new Error(
        /cpf/i.test(error.message) ? 'Rode o setup-app-v4.sql no Supabase para criar a coluna de CPF.' : 'Falha ao salvar o CPF: ' + error.message
      );
  }

  async deleteUnit(id: string) {
    const { count } = await this.sb.from('Equipment').select('id', { count: 'exact', head: true }).eq('unitId', id);
    if (count && count > 0) throw new Error('A unidade possui equipamentos — mova ou exclua-os antes.');
    const { error } = await this.sb.from('Unit').delete().eq('id', id);
    if (error) throw new Error('Não foi possível excluir: a unidade possui registros vinculados.');
  }

  async updateUserAccess(nome: string, access: string[]) {
    const ids = access.map((n) => this.unitId(n)).filter(Boolean);
    // Acesso por inventário é permissão: só muda via função Edge, que
    // confere se quem pediu é administrador.
    if (await this.adminUsersFn({ action: 'set-access', nome, allowedUnitIds: ids })) return;
    const { error } = await this.sb.from('User').update({ allowedUnitIds: ids }).eq('name', nome);
    if (error) {
      throw new Error(
        /policy|permission|denied/i.test(error.message)
          ? 'Sem permissão para alterar acessos. ' + SupabaseRepo.FALTA_FN
          : 'Falha ao salvar os acessos: ' + error.message
      );
    }
  }

  async addImport(rec: ImportRecord) {
    this.importsSession = [rec, ...this.importsSession];
  }

  async addTermo(_t: TermoRecord) {
    // O PDF é gerado e compartilhado pelo app; histórico de termos pode
    // ganhar tabela própria futuramente.
  }
}

export const repo: Repo = isSupabaseConfigured ? new SupabaseRepo() : new MockRepo();

export { iniciais };
