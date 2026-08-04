import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Radio } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { sigla } from '../types';

export const InvPickerSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db, inv, allowedInvs } = app;
  const accent = theme.dark ? theme.accent : '#1d4ed8';

  return (
    <Sheet visible={nav.invPickerOpen} onClose={() => nav.setInvPickerOpen(false)}>
      <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 10, color: theme.text }}>
        Trocar inventário
      </Text>
      {allowedInvs.map((nome, i) => {
        const atual = nome === inv;
        const qtd = db.equipments.filter((e) => e.unidade === nome).length;
        const invItem = db.inventories.find((x) => x.nome === nome);
        return (
          <Pressable
            key={nome}
            onPress={() => {
              app.setInv(nome);
              nav.setInvPickerOpen(false);
              app.showToast('Inventário: ' + nome);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 13,
              paddingHorizontal: 4,
              borderBottomWidth: i < allowedInvs.length - 1 ? 1 : 0,
              borderBottomColor: theme.hair,
            }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: accent }}>{sigla(nome)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '600', color: theme.text }}>
                {invItem?.apelido || nome}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
                {invItem?.apelido ? `${nome} · ` : ''}
                {qtd} equipamentos
              </Text>
            </View>
            <Radio on={atual} check />
          </Pressable>
        );
      })}
    </Sheet>
  );
};
