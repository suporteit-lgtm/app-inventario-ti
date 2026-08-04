import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DB, genId, repo, TermoRecord } from '../data/repo';
import { buildXls, equipmentsMatrix, matrixToCsv, shareCsv, shareXls } from '../lib/export';
import { darkTheme, lightTheme, Theme } from '../theme/tokens';
import { AppUser, EquipForm, Equipment, TermoTemplateDB } from '../types';

const THEME_KEY = '@inventario/theme';
const CFG_KEY = '@inventario/cfg';
const INV_KEY = '@inventario/inv';
const ALERTS_SEEN_KEY = '@inventario/alerts-seen';
const BACKUP_KEY = '@inventario/backup-v1';
export const CREDS_KEY = '@inventario/creds-v1';

export interface BackupCfg {
  freq: 'off' | 'daily' | 'weekly' | 'monthly';
  formato: 'csv' | 'xls';
  last: string | null;
}

const BACKUP_INTERVALS: Record<string, number> = {
  daily: 1 * 86400000,
  weekly: 7 * 86400000,
  monthly: 30 * 86400000,
};

export interface CfgToggles {
  notif: boolean;
  sons: boolean;
  bio: boolean;
}

export const todayBR = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const plusYearsBR = (years: number) => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear() + years}`;
};

const emptyDb: DB = {
  equipments: [],
  users: [],
  colaboradores: [],
  movements: [],
  alertas: [],
  imports: [],
  inventories: [],
  categorias: [],
  templates: [],
  logs: [],
};

interface AppCtx {
  booting: boolean;
  demoMode: boolean;
  session: AppUser | null;
  db: DB;
  dataError: string | null;
  reload: () => Promise<void>;
  allowedInvs: string[];
  inv: string;
  setInv: (n: string) => void;
  theme: Theme;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  cfg: CfgToggles;
  toggleCfg: (k: keyof CfgToggles) => void;
  toast: string;
  showToast: (msg: string) => void;
  login: (email: string, senha: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  createCategory: (nome: string) => Promise<void>;
  saveEquipment: (form: EquipForm, editingId: string | null) => Promise<Equipment>;
  setUserAccess: (nome: string, access: string[]) => Promise<void>;
  importRows: (rows: Partial<Equipment>[], fileName: string) => Promise<number>;
  registerTermo: (t: TermoRecord) => Promise<void>;
  movimentar: (e: Equipment, novoResponsavel: string, departamento: string) => Promise<void>;
  devolverEquipamentos: (list: Equipment[], responsavel: string) => Promise<void>;
  saveTemplate: (t: TermoTemplateDB) => Promise<void>;
  createUser: (
    nome: string,
    email: string,
    senha: string,
    role: 'Admin' | 'Técnico',
    access: string[],
    cpf?: string
  ) => Promise<string | null>;
  changePassword: (senha: string) => Promise<void>;
  updateUser: (
    originalEmail: string,
    d: { nome: string; email: string; senha?: string; role: 'Admin' | 'Técnico'; access: string[]; cpf?: string }
  ) => Promise<void>;
  deleteUser: (email: string) => Promise<void>;
  deleteEquipment: (e: Equipment) => Promise<void>;
  saveUnit: (u: { id: string | null; nome: string; cnpj?: string; endereco?: string; apelido?: string }) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  updateMyCpf: (cpf: string) => Promise<void>;
  backupCfg: BackupCfg;
  setBackupCfg: (patch: Partial<BackupCfg>) => void;
  runBackup: () => Promise<void>;
  hasNewAlerts: boolean;
  markAlertsSeen: () => void;
}

const Ctx = createContext<AppCtx>(null as any);

export const useApp = () => useContext(Ctx);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<AppUser | null>(null);
  const [db, setDb] = useState<DB>(emptyDb);
  const [dataError, setDataError] = useState<string | null>(null);
  const [inv, setInvState] = useState('Belo Horizonte');
  const [darkMode, setDarkModeState] = useState(false);
  const [cfg, setCfg] = useState<CfgToggles>({ notif: true, sons: false, bio: true });
  const [toast, setToast] = useState('');
  const [alertsSeen, setAlertsSeen] = useState<string[]>([]);
  const [backupCfg, setBackupCfgState] = useState<BackupCfg>({ freq: 'off', formato: 'csv', last: null });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupRunning = useRef(false);

  const reload = async () => {
    try {
      const data = await repo.fetchAll();
      setDb(data);
      setDataError(null);
    } catch (e: any) {
      setDataError(e?.message || 'Falha ao carregar dados');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [t, c, i, seen, bkp] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(CFG_KEY),
          AsyncStorage.getItem(INV_KEY),
          AsyncStorage.getItem(ALERTS_SEEN_KEY),
          AsyncStorage.getItem(BACKUP_KEY),
        ]);
        if (t) setDarkModeState(t === 'dark');
        if (c) setCfg(JSON.parse(c));
        if (i) setInvState(i);
        if (seen) setAlertsSeen(JSON.parse(seen));
        if (bkp) setBackupCfgState(JSON.parse(bkp));
        let user = await repo.restoreSession();
        // "Lembrar usuário e senha": entra sozinho com as credenciais salvas
        if (!user) {
          try {
            const raw = await AsyncStorage.getItem(CREDS_KEY);
            if (raw) {
              const creds = JSON.parse(raw);
              if (creds?.email && creds?.senha) user = await repo.signIn(creds.email, creds.senha);
            }
          } catch {}
        }
        if (user) {
          setSession(user);
          await reload();
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const allInvs = db.inventories.map((i) => i.nome);
  const allowedInvs = !session ? [] : session.role === 'Admin' ? allInvs : session.access.filter((a) => allInvs.includes(a));

  const setInv = (n: string) => {
    setInvState(n);
    AsyncStorage.setItem(INV_KEY, n).catch(() => {});
  };

  const setDarkMode = (v: boolean) => {
    setDarkModeState(v);
    AsyncStorage.setItem(THEME_KEY, v ? 'dark' : 'light').catch(() => {});
  };

  const toggleCfg = (k: keyof CfgToggles) => {
    setCfg((c) => {
      const next = { ...c, [k]: !c[k] };
      AsyncStorage.setItem(CFG_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const login = async (email: string, senha: string) => {
    const user = await repo.signIn(email, senha);
    setSession(user);
    await reload();
    const allowed = user.role === 'Admin' ? null : user.access;
    if (allowed && allowed.length && !allowed.includes(inv)) setInv(allowed[0]);
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    const user = await repo.signInWithGoogle();
    if (!user) return false; // web: a página está redirecionando para o Google
    setSession(user);
    await reload();
    const allowed = user.role === 'Admin' ? null : user.access;
    if (allowed && allowed.length && !allowed.includes(inv)) setInv(allowed[0]);
    return true;
  };

  const createCategory = async (nome: string) => {
    await repo.createCategory(nome);
    await reload();
  };

  const logout = async () => {
    await repo.signOut();
    // sair da conta também esquece as credenciais salvas
    AsyncStorage.removeItem(CREDS_KEY).catch(() => {});
    setSession(null);
  };

  const saveEquipment = async (form: EquipForm, editingId: string | null): Promise<Equipment> => {
    let saved: Equipment;
    if (editingId != null) {
      const cur = db.equipments.find((e) => e.id === editingId);
      saved = { ...(cur as Equipment), ...form, usuario: form.usuario || '—' };
    } else {
      // Nada de inventar dado: campo em branco fica em branco.
      // Só data de aquisição e local têm padrão, por decisão do cliente.
      saved = {
        id: genId(),
        unidade: inv,
        ...form,
        compra: form.compra || todayBR(),
        local: form.local || 'Estoque TI',
        usuario: form.usuario || '—',
      };
    }
    const old = editingId != null ? db.equipments.find((e) => e.id === editingId) : null;
    // Espera a gravação no banco antes de dar como salvo: se o servidor
    // recusar, o erro sobe para a tela em vez de sumir num toast genérico
    try {
      await repo.saveEquipment(saved, old);
    } catch (e: any) {
      await reload(); // desfaz qualquer estado local divergente
      throw new Error(e?.message || 'Não foi possível salvar no servidor');
    }
    await reload();
    return saved;
  };

  const movimentar = async (e: Equipment, novoResponsavel: string, departamento: string) => {
    const novo = novoResponsavel.trim() || '—';
    setDb((d) => ({
      ...d,
      equipments: d.equipments.map((x) =>
        x.id === e.id ? { ...x, usuario: novo, departamento, status: novo === '—' ? 'Disponível' : 'Em uso' } : x
      ),
    }));
    try {
      await repo.movimentar(e, novoResponsavel.trim(), departamento.trim());
      await reload();
    } catch {
      showToast('Falha ao sincronizar com o servidor');
    }
  };

  const devolverEquipamentos = async (list: Equipment[], responsavel: string) => {
    const ids = new Set(list.map((e) => e.id));
    setDb((d) => ({
      ...d,
      equipments: d.equipments.map((x) => (ids.has(x.id) ? { ...x, usuario: '—', status: 'Disponível' } : x)),
    }));
    try {
      await repo.devolverEquipamentos(list, responsavel);
      await reload();
    } catch {
      showToast('Falha ao sincronizar com o servidor');
    }
  };

  const saveTemplate = async (t: TermoTemplateDB) => {
    await repo.saveTemplate(t);
    await reload();
  };

  const createUser = async (
    nome: string,
    email: string,
    senha: string,
    role: 'Admin' | 'Técnico',
    access: string[],
    cpf?: string
  ): Promise<string | null> => {
    try {
      return await repo.createUser(nome, email, senha, role, access, cpf);
    } finally {
      // recarrega mesmo se algo falhar no meio: se o usuário chegou a ser
      // gravado, ele já aparece na lista sem precisar reabrir o app
      await reload();
    }
  };

  const changePassword = async (senha: string) => {
    await repo.changePassword(senha);
  };

  const updateUser = async (
    originalEmail: string,
    d: { nome: string; email: string; senha?: string; role: 'Admin' | 'Técnico'; access: string[]; cpf?: string }
  ) => {
    await repo.updateUser(originalEmail, d);
    // se o próprio usuário logado foi editado, atualiza a sessão (nome/CPF no termo)
    if (session && originalEmail.toLowerCase() === session.email.toLowerCase()) {
      setSession({ ...session, nome: d.nome, email: d.email, role: d.role, access: d.access, cpf: d.cpf });
    }
    await reload();
  };

  const deleteUser = async (email: string) => {
    await repo.deleteUser(email);
    await reload();
  };

  const deleteEquipment = async (e: Equipment) => {
    setDb((d) => ({ ...d, equipments: d.equipments.filter((x) => x.id !== e.id) }));
    await repo.deleteEquipment(e);
    await reload();
  };

  const saveUnit = async (u: { id: string | null; nome: string; cnpj?: string; endereco?: string; apelido?: string }) => {
    await repo.saveUnit(u);
    await reload();
  };

  const updateMyCpf = async (cpf: string) => {
    if (!session) return;
    await repo.updateMyCpf(session.email, cpf);
    setSession({ ...session, cpf: cpf || undefined });
    await reload();
  };

  const setBackupCfg = (patch: Partial<BackupCfg>) => {
    setBackupCfgState((c) => {
      const next = { ...c, ...patch };
      AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const runBackup = async () => {
    if (backupRunning.current) return;
    backupRunning.current = true;
    try {
      const lista = db.equipments.filter((e) => allowedInvs.includes(e.unidade));
      const { headers, rows } = equipmentsMatrix(lista);
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (backupCfg.formato === 'xls') {
        await shareXls(buildXls('Inventário', headers, rows), `backup-inventario-${stamp}.xls`);
      } else {
        await shareCsv(matrixToCsv(headers, rows), `backup-inventario-${stamp}.csv`);
      }
      setBackupCfg({ last: new Date().toISOString() });
    } finally {
      backupRunning.current = false;
    }
  };

  // Backup automático: ao abrir o app, se o período programado venceu,
  // gera o arquivo e abre o compartilhamento
  useEffect(() => {
    if (!session || !db.equipments.length || backupCfg.freq === 'off') return;
    const intervalo = BACKUP_INTERVALS[backupCfg.freq];
    const vencido = !backupCfg.last || Date.now() - new Date(backupCfg.last).getTime() >= intervalo;
    if (!vencido) return;
    runBackup()
      .then(() => showToast('Backup automático do inventário gerado'))
      .catch(() => {});
  }, [session, db.equipments.length, backupCfg.freq]);

  const deleteUnit = async (id: string) => {
    await repo.deleteUnit(id);
    await reload();
  };

  const setUserAccess = async (nome: string, access: string[]) => {
    setDb((d) => ({ ...d, users: d.users.map((u) => (u.nome === nome ? { ...u, access } : u)) }));
    repo.updateUserAccess(nome, access).catch(() => showToast('Falha ao sincronizar com o servidor'));
  };

  const importRows = async (rows: Partial<Equipment>[], fileName: string): Promise<number> => {
    // Todos os campos reconhecidos do CSV entram no equipamento;
    // os obrigatórios ganham um valor padrão quando ausentes
    // Importação também não inventa valores — o que vier em branco no CSV
    // fica em branco no cadastro
    const list: Equipment[] = rows.map((r) => ({
      ...r,
      id: genId(),
      unidade: r.unidade && allowedInvs.includes(r.unidade) ? r.unidade : inv,
      tipo: r.tipo || 'Notebook',
      marca: r.marca || '',
      modelo: r.modelo || '',
      serial: r.serial || '',
      patrimonio: r.patrimonio || '',
      status: (r.status as Equipment['status']) || 'Disponível',
      usuario: r.usuario || '—',
      local: r.local || 'Estoque TI',
      compra: r.compra || todayBR(),
      garantia: r.garantia || '',
    }));
    const rec = { id: genId(), arquivo: fileName, info: `${list.length} linhas · ${todayBR()}`, st: 'Concluída' as const };
    setDb((d) => ({ ...d, equipments: [...list, ...d.equipments], imports: [rec, ...d.imports] }));
    repo.insertEquipments(list).catch(() => showToast('Falha ao sincronizar com o servidor'));
    repo.addImport(rec).catch(() => {});
    return list.length;
  };

  const registerTermo = async (t: TermoRecord) => {
    repo.addTermo(t).catch(() => {});
  };

  const hasNewAlerts = db.alertas.some((a) => !alertsSeen.includes(a.id));

  const markAlertsSeen = () => {
    const ids = db.alertas.map((a) => a.id);
    setAlertsSeen(ids);
    AsyncStorage.setItem(ALERTS_SEEN_KEY, JSON.stringify(ids)).catch(() => {});
  };

  const theme = darkMode ? darkTheme : lightTheme;

  const value = useMemo<AppCtx>(
    () => ({
      booting,
      demoMode: repo.mode === 'mock',
      session,
      db,
      dataError,
      reload,
      allowedInvs,
      inv,
      setInv,
      theme,
      darkMode,
      setDarkMode,
      cfg,
      toggleCfg,
      toast,
      showToast,
      login,
      loginWithGoogle,
      logout,
      createCategory,
      saveEquipment,
      setUserAccess,
      importRows,
      registerTermo,
      movimentar,
      devolverEquipamentos,
      saveTemplate,
      createUser,
      changePassword,
      updateUser,
      deleteUser,
      deleteEquipment,
      saveUnit,
      deleteUnit,
      updateMyCpf,
      backupCfg,
      setBackupCfg,
      runBackup,
      hasNewAlerts,
      markAlertsSeen,
    }),
    [booting, session, db, dataError, inv, darkMode, cfg, toast, alertsSeen, backupCfg]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
