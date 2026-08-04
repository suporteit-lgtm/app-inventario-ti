import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { FieldLabel, Input, PrimaryButton, SelectChip } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { EQUIP_TIPOS, tipoTag } from '../types';

export const CategoriesSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;
  const visible = nav.cfgSheet === 'categorias';

  const [nome, setNome] = useState('');
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (visible) setNome('');
  }, [visible]);

  // categorias padrão que ainda não existem no banco (perdidas no reset)
  const faltantes = EQUIP_TIPOS.filter(
    (c) => !db.categorias.some((x) => x.toLowerCase() === c.toLowerCase())
  );

  const criar = async (nomeCategoria: string) => {
    if (!nomeCategoria.trim()) return app.showToast('Informe o nome da categoria');
    setCriando(true);
    try {
      await app.createCategory(nomeCategoria);
      setNome('');
      app.showToast(`Categoria "${nomeCategoria.trim()}" criada`);
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao criar a categoria');
    } finally {
      setCriando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => nav.setCfgSheet('')}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 10, color: theme.text }}>
          Categorias de equipamento
        </Text>
        {db.categorias.map((c, i) => (
          <View
            key={c}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 4,
              borderBottomWidth: i < db.categorias.length - 1 ? 1 : 0,
              borderBottomColor: theme.hair,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.chip,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.chipFg }}>{tipoTag(c)}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: theme.text }}>{c}</Text>
            <Text style={{ fontSize: 12.5, color: theme.muted }}>
              {db.equipments.filter((e) => e.tipo === c).length} itens
            </Text>
          </View>
        ))}

        {faltantes.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <FieldLabel>Categorias padrão faltando — toque para adicionar</FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {faltantes.map((c) => (
                <SelectChip key={c} label={`+ ${c}`} active={false} onPress={() => criar(c)} />
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: 12, marginTop: 14, borderTopWidth: 1, borderTopColor: theme.hair, paddingTop: 14 }}>
          <View>
            <FieldLabel>Nova categoria</FieldLabel>
            <Input placeholder="Ex.: Tablet" value={nome} onChangeText={setNome} />
          </View>
          <PrimaryButton
            label={criando ? 'Criando…' : '+ Nova categoria'}
            height={46}
            onPress={() => criar(nome)}
          />
        </View>
      </ScrollView>
    </Sheet>
  );
};
