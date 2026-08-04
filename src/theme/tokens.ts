import { EquipStatus, Role } from '../types';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  line: string;
  hair: string;
  bd: string;
  text: string;
  text2: string;
  muted: string;
  muted2: string;
  chip: string;
  chipFg: string;
  tint: string;
  tintbd: string;
  press: string;
  dash: string;
  dangerbd: string;
  accent: string;
  green: string;
  avbg: string;
  avfg: string;
  tabbg: string;
  disabledBtn: string;
  toggleOff: string;
  radioOff: string;
  primary: string;
  tabInactive: string;
  ph: string;
  code: string;
  scrim: string;
}

export const lightTheme: Theme = {
  dark: false,
  bg: '#f2f4f8',
  card: '#ffffff',
  line: '#e6e9ef',
  hair: '#f1f4f8',
  bd: '#d7dce4',
  text: '#0f172a',
  text2: '#334155',
  muted: '#64748b',
  muted2: '#94a3b8',
  chip: '#eef2f7',
  chipFg: '#475569',
  tint: '#eff4fb',
  tintbd: '#cddbf5',
  press: '#f1f5f9',
  dash: '#c9d2de',
  dangerbd: '#fecaca',
  accent: '#1d4ed8',
  green: '#15803d',
  avbg: '#dbeafe',
  avfg: '#1d4ed8',
  tabbg: 'rgba(255,255,255,.96)',
  disabledBtn: '#a9bdd9',
  toggleOff: '#d1d8e0',
  radioOff: '#c3cbd6',
  primary: '#2563eb',
  tabInactive: '#8a94a6',
  ph: '#e8ecf2',
  code: '#f6f8fb',
  scrim: 'rgba(15,23,42,.45)',
};

export const darkTheme: Theme = {
  dark: true,
  bg: '#0b1220',
  card: '#151f33',
  line: '#243453',
  hair: '#1e2b48',
  bd: '#2c3b5c',
  text: '#e8edf6',
  text2: '#c6d1e2',
  muted: '#8fa0b8',
  muted2: '#6e809b',
  chip: '#22304d',
  chipFg: '#c6d1e2',
  tint: '#1a2c50',
  tintbd: '#2b4370',
  press: '#1d2a45',
  dash: '#3a4a6b',
  dangerbd: '#7f1d1d',
  accent: '#8fb0f9',
  green: '#4ade80',
  avbg: '#1a2c50',
  avfg: '#8fb0f9',
  tabbg: 'rgba(13,20,36,.96)',
  disabledBtn: '#33456b',
  toggleOff: '#334155',
  radioOff: '#4a5b7d',
  primary: '#2563eb',
  tabInactive: '#8a94a6',
  ph: '#18233c',
  code: '#0f1a2e',
  scrim: 'rgba(15,23,42,.45)',
};

export const badgeColors = (st: EquipStatus | string, dark: boolean): [string, string] => {
  const m: Record<string, [string, string]> = dark
    ? {
        Disponível: ['rgba(34,197,94,.16)', '#4ade80'],
        'Em uso': ['rgba(59,130,246,.2)', '#93b4f8'],
        Manutenção: ['rgba(245,158,11,.16)', '#fbbf24'],
        Baixado: ['rgba(239,68,68,.16)', '#f87171'],
        Descartado: ['rgba(239,68,68,.16)', '#f87171'],
        Perdido: ['rgba(148,163,184,.2)', '#cbd5e1'],
        Concluída: ['rgba(34,197,94,.16)', '#4ade80'],
      }
    : {
        Disponível: ['#dcfce7', '#15803d'],
        'Em uso': ['#dbeafe', '#1d4ed8'],
        Manutenção: ['#fef3c7', '#b45309'],
        Baixado: ['#fee2e2', '#b91c1c'],
        Descartado: ['#fee2e2', '#b91c1c'],
        Perdido: ['#e2e8f0', '#475569'],
        Concluída: ['#dcfce7', '#15803d'],
      };
  return m[st] || (dark ? ['rgba(148,163,184,.16)', '#b6c2d4'] : ['#e2e8f0', '#475569']);
};

export const roleBadgeColors = (r: Role, dark: boolean): [string, string] =>
  r === 'Admin'
    ? dark
      ? ['rgba(59,130,246,.2)', '#93b4f8']
      : ['#dbeafe', '#1d4ed8']
    : dark
    ? ['rgba(148,163,184,.16)', '#b6c2d4']
    : ['#e2e8f0', '#475569'];

export const alertDot = (kind: string, _dark: boolean) =>
  ({ aviso: '#f59e0b', critico: '#dc2626', info: '#2563eb', ok: '#16a34a' } as Record<string, string>)[kind] ||
  '#2563eb';
