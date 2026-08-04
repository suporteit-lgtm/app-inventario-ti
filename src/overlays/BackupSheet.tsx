import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { FieldLabel, PrimaryButton, SelectChip } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

const FREQS: { k: 'off' | 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { k: 'off', label: 'Desativado' },
  { k: 'daily', label: 'Diário' },
  { k: 'weekly', label: 'Semanal' },
  { k: 'monthly', label: 'Mensal' },
];

const fmtData = (iso: string | null) => {
  if (!iso) return 'nunca';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const BackupSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, backupCfg } = app;
  const visible = nav.cfgSheet === 'backup';
  const [exportando, setExportando] = useState(false);

  const exportar = async () => {
    setExportando(true);
    try {
      await app.runBackup();
      app.showToast('Backup do inventário gerado');
    } catch {
      app.showToast('Falha ao gerar o backup');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => nav.setCfgSheet('')}>
      <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
        Backup e exportação
      </Text>
      <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 12 }}>
        Exporta todos os equipamentos dos seus inventários. Com a frequência programada, o backup é gerado
        automaticamente ao abrir o app quando o período vence.
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 4,
          borderBottomWidth: 1,
          borderBottomColor: theme.hair,
        }}
      >
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text }}>Último backup</Text>
        <Text style={{ fontSize: 12.5, color: theme.muted }}>{fmtData(backupCfg.last)}</Text>
      </View>

      <View style={{ gap: 12, marginTop: 14 }}>
        <View>
          <FieldLabel>Frequência do backup automático</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {FREQS.map((f) => (
              <SelectChip key={f.k} label={f.label} active={backupCfg.freq === f.k} onPress={() => app.setBackupCfg({ freq: f.k })} />
            ))}
          </View>
        </View>

        <View>
          <FieldLabel>Formato do arquivo</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SelectChip label="CSV" active={backupCfg.formato === 'csv'} onPress={() => app.setBackupCfg({ formato: 'csv' })} />
            <SelectChip label="Excel (.xls)" active={backupCfg.formato === 'xls'} onPress={() => app.setBackupCfg({ formato: 'xls' })} />
          </View>
        </View>

        <PrimaryButton label={exportando ? 'Gerando…' : 'Exportar agora'} height={46} onPress={exportar} style={{ marginTop: 4 }} />
      </View>
    </Sheet>
  );
};
