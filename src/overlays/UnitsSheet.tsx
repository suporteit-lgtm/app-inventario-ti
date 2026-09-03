import { Pencil, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { FieldLabel, Input, PrimaryButton } from '../components/ui';
import { confirmAsync } from '../lib/confirm';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

export const UnitsSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;
  const visible = nav.cfgSheet === 'locais';
  const isAdmin = app.session?.role === 'Admin';

  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEditId(null);
    setNome('');
    setApelido('');
    setCnpj('');
    setEndereco('');
  }, [visible]);

  const editar = (id: string) => {
    const u = db.inventories.find((i) => i.id === id);
    if (!u) return;
    setEditId(id);
    setNome(u.nome);
    setApelido(u.apelido || '');
    setCnpj(u.cnpj || '');
    setEndereco(u.endereco || '');
  };

  const salvar = async () => {
    if (!nome.trim()) return app.showToast('Informe o nome da unidade');
    setSalvando(true);
    try {
      const ausentes = await app.saveUnit({ id: editId, nome, cnpj, endereco, apelido });
      const rotulos: Record<string, string> = { nickname: 'nome curto', cnpj: 'CNPJ', address: 'endereço' };
      app.showToast(
        ausentes.length
          ? `Nome salvo, mas o banco não tem a coluna de ${ausentes.map((c) => rotulos[c] || c).join(', ')}. Rode supabase/adicionar-colunas-unidade.sql no SQL Editor.`
          : editId
          ? 'Unidade atualizada'
          : 'Unidade criada'
      );
      setEditId(null);
      setNome('');
      setApelido('');
      setCnpj('');
      setEndereco('');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao salvar a unidade');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    const u = db.inventories.find((i) => i.id === id);
    if (!u) return;
    const ok = await confirmAsync('Excluir unidade', `Excluir a unidade "${u.nome}"?`);
    if (!ok) return app.showToast('Exclusão cancelada');
    try {
      await app.deleteUnit(id);
      app.showToast('Unidade excluída');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao excluir');
    }
  };

  return (
    <Sheet visible={visible} onClose={() => nav.setCfgSheet('')}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
          Locais e unidades
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 10 }}>
          As unidades são compartilhadas com o sistema web — criar/editar aqui aparece lá e vice-versa.
        </Text>
        {db.inventories.map((u, i) => (
          <View
            key={u.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
              paddingHorizontal: 4,
              borderBottomWidth: i < db.inventories.length - 1 ? 1 : 0,
              borderBottomColor: theme.hair,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '600', color: theme.text }}>
                {u.apelido ? `${u.apelido} · ${u.nome}` : u.nome}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
                {(u.cnpj || 'sem CNPJ') + ' · ' + (u.endereco || 'sem endereço')} ·{' '}
                {db.equipments.filter((e) => e.unidade === u.nome).length} equip.
              </Text>
            </View>
            {isAdmin && (
              <>
                <Pressable
                  onPress={() => editar(u.id)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.bd,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={15} color={theme.text2} strokeWidth={1.9} />
                </Pressable>
                <Pressable
                  onPress={() => excluir(u.id)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.dangerbd,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={15} color="#dc2626" strokeWidth={1.9} />
                </Pressable>
              </>
            )}
          </View>
        ))}
        {isAdmin && (
          <View style={{ gap: 12, marginTop: 14, borderTopWidth: 1, borderTopColor: theme.hair, paddingTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
              {editId ? 'Editar unidade' : 'Nova unidade'}
            </Text>
            <View>
              <FieldLabel>Nome da unidade * (sai completo nos termos)</FieldLabel>
              <Input placeholder="Ex.: LOCAGORA LOCADORA DE VEICULOS - Belo Horizonte" value={nome} onChangeText={setNome} />
            </View>
            <View>
              <FieldLabel>Nome curto / máscara (exibição no app)</FieldLabel>
              <Input placeholder="Ex.: BH Centro" value={apelido} onChangeText={setApelido} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <FieldLabel>CNPJ</FieldLabel>
                <Input placeholder="00.000.000/0000-00" mascara="cnpj" value={cnpj} onChangeText={setCnpj} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <FieldLabel>Endereço</FieldLabel>
                <Input placeholder="Rua, nº, cidade/UF" value={endereco} onChangeText={setEndereco} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {editId ? (
                <Pressable
                  onPress={() => {
                    setEditId(null);
                    setNome('');
                    setApelido('');
                    setCnpj('');
                    setEndereco('');
                  }}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.bd,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Cancelar</Text>
                </Pressable>
              ) : null}
              <PrimaryButton
                label={salvando ? 'Salvando…' : editId ? 'Salvar unidade' : '+ Adicionar unidade'}
                height={46}
                onPress={salvar}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
};
