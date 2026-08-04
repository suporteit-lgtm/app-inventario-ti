import { Bell, Download, FileText, Plus, QrCode } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvChip } from '../components/InvChip';
import { Avatar, Card } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { alertDot } from '../theme/tokens';
import { iniciais } from '../types';

const QuickAction: React.FC<{
  label: string;
  tile: string;
  iconColor: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, tile, iconColor, Icon, onPress, disabled }) => {
  const { theme } = useApp();
  return (
    <Card
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        paddingHorizontal: 14,
        flexBasis: '48%',
        flexGrow: 1,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: disabled ? theme.chip : tile,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color={disabled ? theme.muted2 : iconColor} strokeWidth={1.9} />
      </View>
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: disabled ? theme.muted : theme.text }}>{label}</Text>
    </Card>
  );
};

export const HomeScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db, inv, session } = app;
  const insets = useSafeAreaInsets();
  const isAdmin = session?.role === 'Admin';

  const invData = db.equipments.filter((e) => e.unidade === inv);
  const count = (st: string) => invData.filter((e) => e.status === st).length;

  const counterCard = (n: number, label: string, color?: string, primary?: boolean) => (
    <View
      style={{
        flexBasis: '48%',
        flexGrow: 1,
        backgroundColor: primary ? theme.primary : theme.card,
        borderRadius: 16,
        padding: 14,
        paddingHorizontal: 16,
        borderWidth: primary ? 0 : 1,
        borderColor: theme.line,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: primary ? '#fff' : color || theme.text }}>{n}</Text>
      <Text style={{ fontSize: 12.5, color: primary ? 'rgba(255,255,255,.85)' : theme.muted }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 132 }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: theme.muted }}>Bem-vindo,</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: theme.text }}>
            {session?.nome || ''}
          </Text>
        </View>
        <Pressable
          onPress={() => nav.go('alerts')}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            borderWidth: 1,
            borderColor: theme.line,
            backgroundColor: theme.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} color={theme.text2} strokeWidth={1.8} />
          {app.hasNewAlerts && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 9,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#dc2626',
                borderWidth: 1.5,
                borderColor: theme.card,
              }}
            />
          )}
        </Pressable>
        <Avatar text={iniciais(session?.nome || 'U')} />
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
        <InvChip />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 18, paddingTop: 14 }}>
        {counterCard(invData.length, 'Equipamentos', undefined, true)}
        {counterCard(count('Em uso'), 'Em uso', theme.dark ? theme.accent : '#1d4ed8')}
        {counterCard(count('Disponível'), 'Disponíveis', theme.green)}
        {counterCard(count('Manutenção'), 'Em manutenção', theme.dark ? '#fbbf24' : '#b45309')}
      </View>

      <Text style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6, fontSize: 15, fontWeight: '700', color: theme.text }}>
        Ações rápidas
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 18 }}>
        <QuickAction label="Cadastrar" tile={theme.dark ? 'rgba(59,130,246,.2)' : '#dbeafe'} iconColor={theme.dark ? '#93b4f8' : '#1d4ed8'} Icon={Plus} onPress={nav.openNew} />
        <QuickAction
          label="Escanear QR"
          tile={theme.chip}
          iconColor={theme.muted2}
          Icon={QrCode}
          disabled
          onPress={() => app.showToast('Leitura de QR indisponível no momento')}
        />
        <QuickAction label="Gerar termo" tile={theme.dark ? 'rgba(245,158,11,.16)' : '#fef3c7'} iconColor={theme.dark ? '#fbbf24' : '#b45309'} Icon={FileText} onPress={() => nav.go('termos')} />
        <QuickAction label="Importar CSV" tile={theme.dark ? 'rgba(126,34,206,.25)' : '#f3e8ff'} iconColor={theme.dark ? '#d8b4fe' : '#7e22ce'} Icon={Download} onPress={() => nav.go('import')} />
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.text }}>Alertas recentes</Text>
        <Pressable onPress={() => nav.go('alerts')}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.dark ? theme.accent : theme.primary }}>Ver todos</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8, paddingHorizontal: 18 }}>
        {db.alertas.slice(0, 3).map((al) => (
          <Card key={al.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: alertDot(al.kind, theme.dark) }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text }}>{al.titulo}</Text>
              <Text style={{ fontSize: 12, color: theme.muted }}>{al.sub}</Text>
            </View>
            <Text style={{ fontSize: 11.5, color: theme.muted2 }}>{al.quando}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};
