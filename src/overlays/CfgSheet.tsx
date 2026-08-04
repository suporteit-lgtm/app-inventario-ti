import React from 'react';
import { Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { PrimaryButton } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

export const CfgSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;

  const defs: Record<string, { title: string; rows: { label: string; detail: string }[]; btn: string; msg?: string }> = {
    // 'categorias' é tratado pelo CategoriesSheet (gestão real de categorias)
    // 'locais' é tratado pelo UnitsSheet (gestão completa de unidades)
    // 'backup' é tratado pelo BackupSheet (exportação real + agendamento)
    sobre: {
      title: 'Sobre o app',
      rows: [
        { label: 'Aplicativo', detail: 'Inventário de Equipamentos' },
        { label: 'Versão', detail: '1.0.0' },
        { label: 'Empresa', detail: 'Locagora — Grupo LOC' },
        { label: 'Suporte', detail: 'suporte.ti@locgrupo.com.br' },
      ],
      btn: '',
    },
  };

  const def = defs[nav.cfgSheet];

  return (
    <Sheet visible={!!def} onClose={() => nav.setCfgSheet('')}>
      <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 10, color: theme.text }}>
        {def?.title || ''}
      </Text>
      {(def?.rows || []).map((r, i) => (
        <View
          key={r.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 13,
            paddingHorizontal: 4,
            borderBottomWidth: i < (def?.rows.length || 0) - 1 ? 1 : 0,
            borderBottomColor: theme.hair,
          }}
        >
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text }}>{r.label}</Text>
          <Text style={{ fontSize: 12.5, color: theme.muted }}>{r.detail}</Text>
        </View>
      ))}
      {def?.btn ? (
        <PrimaryButton label={def.btn} height={46} onPress={() => app.showToast(def.msg || 'OK')} style={{ marginTop: 14 }} />
      ) : null}
    </Sheet>
  );
};
