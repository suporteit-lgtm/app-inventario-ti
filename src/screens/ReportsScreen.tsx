import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SubHeader } from '../components/SubHeader';
import { Card } from '../components/ui';
import { shareCsv, sharePdf } from '../lib/export';
import { useApp } from '../state/AppContext';
import { equipNome, Equipment } from '../types';

const REPORTS = [
  { key: 'completo', titulo: 'Inventário completo', sub: 'Todos os equipamentos e status' },
  { key: 'movs', titulo: 'Movimentações do mês', sub: 'Empréstimos e devoluções' },
  { key: 'termos', titulo: 'Termos emitidos', sub: 'Assinados e pendentes' },
  { key: 'garantias', titulo: 'Garantias a vencer', sub: 'Próximos 90 dias' },
];

const BARS: [string, string][] = [
  ['Em uso', '#2563eb'],
  ['Disponível', '#16a34a'],
  ['Manutenção', '#d97706'],
  ['Descartado', '#dc2626'],
];

export const ReportsScreen: React.FC = () => {
  const app = useApp();
  const { theme, db, inv } = app;
  const invData = db.equipments.filter((e) => e.unidade === inv);
  const count = (st: string) => invData.filter((e) => e.status === st).length;

  const tableHtml = (rows: Equipment[]) => `
    <html><head><meta charset="utf-8"><style>
      body{font-family:Helvetica,Arial,sans-serif;padding:24px;color:#0f172a}
      h1{font-size:18px} .sub{color:#64748b;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #d7dce4;padding:6px 8px;text-align:left}
      th{background:#eff4fb}
    </style></head><body>
    <h1>Inventário de Equipamentos — ${inv}</h1>
    <div class="sub">Locagora — Grupo LOC · ${rows.length} equipamentos</div>
    <table><tr><th>Tipo</th><th>Equipamento</th><th>Serial</th><th>Patrimônio</th><th>Status</th><th>Responsável</th><th>Local</th><th>Garantia</th></tr>
    ${rows
      .map(
        (e) =>
          `<tr><td>${e.tipo}</td><td>${equipNome(e)}</td><td>${e.serial}</td><td>${e.patrimonio}</td><td>${e.status}</td><td>${e.usuario}</td><td>${e.local}</td><td>${e.garantia}</td></tr>`
      )
      .join('')}
    </table></body></html>`;

  const csvOf = (rows: Equipment[]) =>
    ['tipo,marca,modelo,serial,patrimonio,status,responsavel,local']
      .concat(rows.map((e) => [e.tipo, e.marca, e.modelo, e.serial, e.patrimonio, e.status, e.usuario, e.local].map((v) => `"${v}"`).join(',')))
      .join('\n');

  const exportar = async (key: string, fmt: 'PDF' | 'Excel') => {
    try {
      const parseBR = (d: string) => {
        const [dd, mm, yy] = d.split('/').map(Number);
        return new Date(yy, (mm || 1) - 1, dd || 1).getTime();
      };
      const limite = Date.now() + 90 * 24 * 3600 * 1000;
      const rows = key === 'garantias' ? invData.filter((e) => parseBR(e.garantia) <= limite) : invData;
      if (fmt === 'PDF') await sharePdf(tableHtml(rows), `relatorio-${key}.pdf`);
      else await shareCsv(csvOf(rows), `relatorio-${key}.csv`);
      app.showToast(`Relatório gerado em ${fmt}`);
    } catch {
      app.showToast('Falha ao gerar o relatório');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 132, gap: 12 }}>
        <Card radius={16} style={{ padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 12, color: theme.text }}>Equipamentos por status</Text>
          <View style={{ gap: 10 }}>
            {BARS.map(([label, cor]) => {
              const n = count(label);
              const w = Math.max(6, Math.round((n / Math.max(1, invData.length)) * 100));
              return (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ width: 92, fontSize: 12.5, color: theme.muted }}>{label}</Text>
                  <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: theme.hair, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 5, backgroundColor: cor, width: `${w}%` }} />
                  </View>
                  <Text style={{ width: 22, textAlign: 'right', fontWeight: '700', fontSize: 12.5, color: theme.text }}>{n}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {REPORTS.map((rp) => (
          <Card key={rp.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{rp.titulo}</Text>
              <Text style={{ fontSize: 12, color: theme.muted }}>{rp.sub}</Text>
            </View>
            <Pressable
              onPress={() => exportar(rp.key, 'PDF')}
              style={{ height: 34, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#cfd8e3', backgroundColor: theme.card, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text2 }}>PDF</Text>
            </Pressable>
            <Pressable
              onPress={() => exportar(rp.key, 'Excel')}
              style={{ height: 34, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#cfd8e3', backgroundColor: theme.card, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.green }}>XLS</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};
