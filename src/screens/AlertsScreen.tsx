import React, { useEffect } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SubHeader } from '../components/SubHeader';
import { Card } from '../components/ui';
import { useApp } from '../state/AppContext';
import { alertDot } from '../theme/tokens';

export const AlertsScreen: React.FC = () => {
  const app = useApp();
  const { theme, db } = app;

  // Ao abrir a tela, os alertas atuais deixam de contar como "novos"
  useEffect(() => {
    app.markAlertsSeen();
  }, [db.alertas]);

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <FlatList
        data={db.alertas}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ gap: 8, padding: 18, paddingTop: 14, paddingBottom: 132 }}
        renderItem={({ item: a }) => (
          <Card style={{ flexDirection: 'row', gap: 12, padding: 13, paddingHorizontal: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: alertDot(a.kind, theme.dark), marginTop: 5 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text }}>{a.titulo}</Text>
              <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 2 }}>{a.sub}</Text>
            </View>
            <Text style={{ fontSize: 11.5, color: theme.muted2 }}>{a.quando}</Text>
          </Card>
        )}
      />
    </View>
  );
};
