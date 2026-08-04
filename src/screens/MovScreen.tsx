import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { SubHeader } from '../components/SubHeader';
import { Card } from '../components/ui';
import { useApp } from '../state/AppContext';

export const MovScreen: React.FC = () => {
  const { theme, db } = useApp();

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <FlatList
        data={db.movements}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ gap: 8, padding: 18, paddingTop: 14, paddingBottom: 132 }}
        renderItem={({ item: m }) => {
          const bg = m.saida ? (theme.dark ? 'rgba(59,130,246,.2)' : '#dbeafe') : theme.dark ? 'rgba(34,197,94,.16)' : '#dcfce7';
          const fg = m.saida ? (theme.dark ? '#93b4f8' : '#1d4ed8') : theme.dark ? '#4ade80' : '#15803d';
          const Icon = m.saida ? ArrowUpRight : ArrowDownLeft;
          return (
            <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} color={fg} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text }}>{m.titulo}</Text>
                <Text style={{ fontSize: 12, color: theme.muted }}>
                  {m.origem} → {m.destino}
                </Text>
              </View>
              <Text style={{ fontSize: 11.5, color: theme.muted2 }}>{m.data}</Text>
            </Card>
          );
        }}
      />
    </View>
  );
};
