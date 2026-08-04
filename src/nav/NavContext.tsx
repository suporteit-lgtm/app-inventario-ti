import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

export type Screen =
  | 'login'
  | 'home'
  | 'inv'
  | 'termos'
  | 'detail'
  | 'form'
  | 'mov'
  | 'rel'
  | 'config'
  | 'users'
  | 'alerts'
  | 'import';

export const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  detail: 'Equipamento',
  mov: 'Movimentações',
  rel: 'Relatórios',
  config: 'Configurações',
  users: 'Usuários',
  alerts: 'Alertas',
  import: 'Importar CSV',
  termos: 'Termo de responsabilidade',
};

export type ScanHandler = ((code: string) => void) | null;

interface NavCtx {
  screen: Screen;
  selId: string;
  editing: boolean;
  go: (s: Screen) => void;
  back: () => void;
  resetToLogin: () => void;
  openItem: (id: string) => void;
  openNew: () => void;
  openEdit: () => void;
  // overlays
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  invPickerOpen: boolean;
  setInvPickerOpen: (v: boolean) => void;
  permUser: string | null;
  setPermUser: (nome: string | null) => void;
  cfgSheet: string;
  setCfgSheet: (k: string) => void;
  scanOpen: boolean;
  scanHandler: React.MutableRefObject<ScanHandler>;
  openScan: (onResult?: (code: string) => void) => void;
  closeScan: () => void;
}

const Ctx = createContext<NavCtx>(null as any);
export const useNav = () => useContext(Ctx);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<Screen>('login');
  const [stack, setStack] = useState<Screen[]>([]);
  const [selId, setSelId] = useState('');
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [invPickerOpen, setInvPickerOpen] = useState(false);
  const [permUser, setPermUser] = useState<string | null>(null);
  const [cfgSheet, setCfgSheet] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const scanHandler = useRef<ScanHandler>(null);

  const go = (s: Screen) => {
    setStack((st) => [...st, screen]);
    setScreen(s);
    setMoreOpen(false);
    setScanOpen(false);
  };

  const back = () => {
    setStack((st) => {
      const next = [...st];
      const prev = next.pop() || 'home';
      setScreen(prev);
      return next;
    });
  };

  const resetToLogin = () => {
    setScreen('login');
    setStack([]);
    setMoreOpen(false);
    setInvPickerOpen(false);
    setPermUser(null);
    setCfgSheet('');
    setScanOpen(false);
  };

  const openItem = (id: string) => {
    setSelId(id);
    go('detail');
  };

  const openNew = () => {
    setEditing(false);
    go('form');
  };

  const openEdit = () => {
    setEditing(true);
    go('form');
  };

  const openScan = (onResult?: (code: string) => void) => {
    scanHandler.current = onResult || null;
    setScanOpen(true);
  };

  const closeScan = () => {
    setScanOpen(false);
    scanHandler.current = null;
  };

  // Botão físico de voltar do Android fecha overlays ou volta na pilha
  const overlayState = { scanOpen, moreOpen, invPickerOpen, permUser, cfgSheet, screen, stackLen: stack.length };
  const overlayRef = useRef(overlayState);
  overlayRef.current = overlayState;
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const o = overlayRef.current;
      if (o.scanOpen) {
        closeScan();
        return true;
      }
      if (o.moreOpen) {
        setMoreOpen(false);
        return true;
      }
      if (o.invPickerOpen) {
        setInvPickerOpen(false);
        return true;
      }
      if (o.permUser) {
        setPermUser(null);
        return true;
      }
      if (o.cfgSheet) {
        setCfgSheet('');
        return true;
      }
      if (o.screen !== 'login' && o.stackLen > 0) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<NavCtx>(
    () => ({
      screen,
      selId,
      editing,
      go,
      back,
      resetToLogin,
      openItem,
      openNew,
      openEdit,
      moreOpen,
      setMoreOpen,
      invPickerOpen,
      setInvPickerOpen,
      permUser,
      setPermUser,
      cfgSheet,
      setCfgSheet,
      scanOpen,
      scanHandler,
      openScan,
      closeScan,
    }),
    [screen, selId, editing, moreOpen, invPickerOpen, permUser, cfgSheet, scanOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
