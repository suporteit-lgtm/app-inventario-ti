import * as DocumentPicker from 'expo-document-picker';
import { Upload } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SubHeader } from '../components/SubHeader';
import { Card, StatusBadge } from '../components/ui';
import { csvRowToEquipment, parseCsv, readTextFile, shareCsv } from '../lib/export';
import { useApp } from '../state/AppContext';

// Mesmo formato exportado pelo sistema web
const MODELO_CSV =
  'ID do Ativo;Tipo;Marca;Modelo;Cor;Configuração;Número de Série;Número de Patrimônio;Status do Ativo;Condição;Propriedade;Película;Capa;IMEI 1;IMEI 2;Endereço MAC;Fornecedor;Localização;Usuário Atual;Departamento;Gestor;E-mail do Usuário;CPF do Usuário;Data de Aquisição;Data de Entrega ao Usuário;Garantia (Data Final);Última Conferência;Valor (R$);Observações;Acessórios\n' +
  ';Notebook;Dell;Latitude 5440;Preto;i5 · 16GB · 256GB;BRJ0K33;PAT-0142;Em uso;Bom;Próprio;;;;;;Dell Brasil;Matriz — 2º andar;Carla Nunes;Financeiro;João Silva;carla@locgrupo.com.br;000.000.000-00;12/03/2024;14/03/2024;12/03/2027;01/07/2026;4500,00;;Carregador\n';

export const ImportScreen: React.FC = () => {
  const app = useApp();
  const { theme, db } = app;
  const accent = theme.dark ? theme.accent : '#1d4ed8';

  const selecionar = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return app.showToast('Importação cancelada');
      const asset = res.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) return app.showToast('Arquivo maior que 10 MB');
      const text = await readTextFile(asset.uri, (asset as any).file);
      const rows = parseCsv(text);
      if (!rows.length) return app.showToast('CSV vazio ou sem cabeçalho válido');
      const mapped = rows.map(csvRowToEquipment).filter((r) => Object.keys(r).length > 0);
      if (!mapped.length) return app.showToast('Nenhuma coluna reconhecida no CSV');
      const n = await app.importRows(mapped, asset.name || 'importacao.csv');
      app.showToast(`${n} equipamentos importados`);
    } catch {
      app.showToast('Falha ao importar o arquivo');
    }
  };

  const baixarModelo = async () => {
    try {
      await shareCsv(MODELO_CSV, 'planilha-modelo.csv');
      if (Platform.OS !== 'web') app.showToast('Planilha modelo gerada');
    } catch {
      app.showToast('Falha ao gerar planilha modelo');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 132, gap: 14 }}>
        <Pressable
          onPress={selecionar}
          style={{
            height: 150,
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: theme.dark ? theme.tintbd : '#9db4d8',
            backgroundColor: theme.tint,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Upload size={28} color={theme.primary} strokeWidth={1.8} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: accent }}>Toque para selecionar o arquivo</Text>
          <Text style={{ fontSize: 12, color: theme.muted }}>.csv até 10 MB</Text>
        </Pressable>

        <Card style={{ padding: 14, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 13, color: theme.chipFg, lineHeight: 20 }}>
            Colunas esperadas:{' '}
            <Text style={{ fontWeight: '700' }}>tipo, marca, modelo, serial, patrimonio, status, responsavel, local</Text>.
          </Text>
          <Pressable onPress={baixarModelo} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 13, color: theme.dark ? theme.accent : theme.primary }}>Baixar planilha modelo</Text>
          </Pressable>
        </Card>

        <Text style={{ fontSize: 14, fontWeight: '700', marginTop: 2, color: theme.text }}>Importações recentes</Text>
        {db.imports.map((im) => (
          <Card key={im.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text }}>{im.arquivo}</Text>
              <Text style={{ fontSize: 12, color: theme.muted }}>{im.info}</Text>
            </View>
            <StatusBadge status={im.st} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};
