import { Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { SubHeader } from '../components/SubHeader';
import { Card, FieldLabel, Input, OutlineButton, PrimaryButton, StatusBadge } from '../components/ui';
import { confirmAsync } from '../lib/confirm';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { equipNome } from '../types';

export const DetailScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;
  const sel = db.equipments.find((e) => e.id === nav.selId) || db.equipments[0];

  const [movOpen, setMovOpen] = useState(false);
  const [movNome, setMovNome] = useState('');
  const [movDep, setMovDep] = useState('');

  if (!sel) {
    return (
      <View style={{ flex: 1 }}>
        <SubHeader />
        <Text style={{ padding: 24, color: theme.muted, fontSize: 13.5 }}>Equipamento não encontrado.</Text>
      </View>
    );
  }

  const rows: [string, string | undefined][] = [
    ['ID do ativo', sel.assetId],
    ['Tipo', sel.tipo],
    ['Operadora', sel.operadora],
    ['Plano', sel.plano],
    ['Portabilidade', sel.portabilidade],
    ['ICCID', sel.iccid],
    ['Número de telefone', sel.telefone],
    ['Usuário antigo', sel.usuarioAntigo],
    ['Marca', sel.marca],
    ['Modelo', sel.modelo],
    ['Cor', sel.cor],
    ['Configuração', sel.configuracao],
    ['Nº de série', sel.serial],
    ['Patrimônio', sel.patrimonio],
    ['IMEI 1', sel.imei1],
    ['IMEI 2', sel.imei2],
    ['Endereço MAC', sel.mac],
    ['Película', sel.pelicula],
    ['Capa', sel.capa],
    ['Condição', sel.condicao],
    ['Propriedade', sel.propriedade],
    ['Fornecedor', sel.fornecedor],
    ['Inventário', sel.unidade],
    ['Responsável', sel.usuario],
    ['E-mail do usuário', sel.emailUsuario],
    ['CPF do usuário', sel.cpfUsuario],
    ['Departamento', sel.departamento],
    ['Gestor', sel.gestor],
    ['Local', sel.local],
    ['Data de aquisição', sel.compra],
    ['Entrega ao usuário', sel.entrega],
    ['Garantia até', sel.garantia],
    ['Última conferência', sel.conferencia],
    ['Valor (R$)', sel.valor],
    ['Acessórios', sel.acessorios],
    ['Observações', sel.obs],
  ];
  const visibleRows = rows.filter(([, v]) => v && v.trim() && v !== '—') as [string, string][];
  // mantém linhas essenciais mesmo vazias
  const essential: [string, string][] = [
    ['Responsável', sel.usuario],
    ['Local', sel.local],
  ];
  essential.forEach(([k, v]) => {
    if (!visibleRows.some(([kk]) => kk === k)) visibleRows.splice(visibleRows.length, 0, [k, v]);
  });

  // Histórico real: auditoria de alterações + movimentações + cadastro
  const hist = [
    ...db.logs
      .filter((l) => l.equipmentId === sel.id)
      .map((l) => ({ evento: l.descricao, data: l.data })),
    ...db.movements
      .filter((m) => m.equipmentId === sel.id)
      .map((m) => ({
        evento: m.saida ? `Entregue a ${m.destino}` : `Devolvido por ${m.origem}`,
        data: m.dataFull || m.data,
      })),
    { evento: 'Cadastrado no inventário', data: sel.compra },
  ];

  const abrirMovimentar = () => {
    setMovNome(sel.usuario === '—' ? '' : sel.usuario);
    setMovDep(sel.departamento || '');
    setMovOpen(true);
  };

  const salvarMov = async () => {
    setMovOpen(false);
    await app.movimentar(sel, movNome, movDep);
    app.showToast(movNome.trim() ? `Movimentado para ${movNome.trim()}` : 'Devolvido ao estoque');
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader
        right={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable
              onPress={nav.openEdit}
              style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Editar</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                const ok = await confirmAsync(
                  'Excluir equipamento',
                  `Excluir "${equipNome(sel)}" (${sel.patrimonio})? O histórico dele também será removido. Esta ação não pode ser desfeita.`
                );
                if (!ok) return app.showToast('Exclusão cancelada');
                try {
                  await app.deleteEquipment(sel);
                  nav.back();
                  app.showToast('Equipamento excluído');
                } catch (e: any) {
                  app.showToast(e?.message || 'Falha ao excluir');
                }
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                borderWidth: 1,
                borderColor: theme.dangerbd,
                backgroundColor: theme.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={17} color="#dc2626" strokeWidth={1.9} />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 132, gap: 12 }}>
        {sel.foto ? <Image source={{ uri: sel.foto }} style={{ height: 150, borderRadius: 16 }} resizeMode="cover" /> : null}

        <Card radius={16} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text }}>
              {equipNome(sel) || sel.telefone || sel.assetId || sel.tipo}
            </Text>
            <StatusBadge status={sel.status} size="md" />
          </View>
          <View style={{ marginTop: 10 }}>
            {visibleRows.map(([k, v], i) => (
              <View
                key={k}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingVertical: 9,
                  borderBottomWidth: i < visibleRows.length - 1 ? 1 : 0,
                  borderBottomColor: theme.hair,
                }}
              >
                <Text style={{ fontSize: 13.5, color: theme.muted }}>{k}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', textAlign: 'right', flexShrink: 1, color: theme.text }}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card radius={16} style={{ padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 10, color: theme.text }}>Histórico</Text>
          <View style={{ gap: 14 }}>
            {hist.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.primary, marginTop: 4 }} />
                  {i < hist.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: theme.line, marginTop: 4 }} />}
                </View>
                <View style={{ paddingBottom: 2, flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>{h.evento}</Text>
                  <Text style={{ fontSize: 12, color: theme.muted }}>{h.data}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <OutlineButton label="Movimentar" height={46} onPress={abrirMovimentar} style={{ flex: 1 }} />
          <PrimaryButton label="Gerar termo" height={46} onPress={() => nav.go('termos')} style={{ flex: 1 }} />
        </View>
      </ScrollView>

      <Sheet visible={movOpen} onClose={() => setMovOpen(false)}>
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
          Movimentar equipamento
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 12 }}>
          Altere o responsável — a troca fica registrada no histórico. Deixe vazio para devolver ao estoque.
        </Text>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>Responsável</FieldLabel>
            <Input placeholder="Nome do colaborador" value={movNome} onChangeText={setMovNome} />
          </View>
          <View>
            <FieldLabel>Departamento</FieldLabel>
            <Input placeholder="Ex.: Financeiro" value={movDep} onChangeText={setMovDep} />
          </View>
          <PrimaryButton label="Salvar movimentação" onPress={salvarMov} style={{ marginTop: 4 }} />
        </View>
      </Sheet>
    </View>
  );
};
