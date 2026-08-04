import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_TITLES, useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

export const SubHeader: React.FC<{ titleOverride?: string; right?: React.ReactNode }> = ({ titleOverride, right }) => {
  const { theme } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const title = titleOverride || SCREEN_TITLES[nav.screen] || '';

  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingHorizontal: 14,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.bg,
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      }}
    >
      <Pressable
        onPress={nav.back}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: theme.line,
          backgroundColor: theme.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ArrowLeft size={18} color={theme.text2} strokeWidth={2} />
      </Pressable>
      <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>{title}</Text>
      {right}
    </View>
  );
};
