import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Screen, useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

export const MoreSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme } = app;
  const isAdmin = app.session?.role === 'Admin';

  const items: { label: string; screen: Screen }[] = [
    { label: 'Status dos termos', screen: 'termos-status' },
    { label: 'Movimentações', screen: 'mov' },
    { label: 'Relatórios', screen: 'rel' },
    { label: 'Alertas', screen: 'alerts' },
    ...(isAdmin ? ([{ label: 'Usuários e permissões', screen: 'users' }] as { label: string; screen: Screen }[]) : []),
    { label: 'Importar CSV', screen: 'import' },
    { label: 'Configurações', screen: 'config' },
  ];

  return (
    <Sheet visible={nav.moreOpen} onClose={() => nav.setMoreOpen(false)}>
      <View>
        {items.map((mi, i) => (
          <Pressable
            key={mi.screen}
            onPress={() => nav.go(mi.screen)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 4,
              borderBottomWidth: i < items.length - 1 ? 1 : 0,
              borderBottomColor: theme.hair,
            }}
          >
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.text }}>{mi.label}</Text>
            <ChevronRight size={16} color={theme.radioOff} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
};
