import { Boxes, FileText, Home, MoreHorizontal, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav, Screen } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}> = ({ label, active, onPress, Icon }) => {
  const { theme } = useApp();
  const color = active ? theme.primary : theme.tabInactive;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }}>
      <Icon size={22} color={color} strokeWidth={1.9} />
      <Text style={{ fontSize: 10.5, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
  );
};

export const TabBar: React.FC = () => {
  const { theme } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const isTab = (s: Screen) => nav.screen === s;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.tabbg,
        borderTopWidth: 1,
        borderTopColor: theme.line,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 8,
        paddingHorizontal: 10,
        paddingBottom: Math.max(insets.bottom, 12),
        zIndex: 40,
      }}
    >
      <TabButton label="Início" Icon={Home} active={isTab('home')} onPress={() => nav.go('home')} />
      <TabButton label="Inventário" Icon={Boxes} active={isTab('inv')} onPress={() => nav.go('inv')} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable
          onPress={nav.openNew}
          style={({ pressed }) => ({
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -26,
            shadowColor: theme.primary,
            shadowOpacity: 0.4,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Plus size={26} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>
      <TabButton label="Termos" Icon={FileText} active={isTab('termos')} onPress={() => nav.go('termos')} />
      <TabButton label="Mais" Icon={MoreHorizontal} active={nav.moreOpen} onPress={() => nav.setMoreOpen(true)} />
    </View>
  );
};
