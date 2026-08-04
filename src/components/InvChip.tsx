import { ChevronDown, MapPin } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { invSiglaDisplay } from '../types';

export const InvChip: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { theme, inv, db } = useApp();
  const nav = useNav();
  const accent = theme.dark ? theme.accent : '#1d4ed8';
  const display = invSiglaDisplay(db.inventories, inv);
  return (
    <Pressable
      onPress={() => nav.setInvPickerOpen(true)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        height: compact ? 34 : 38,
        paddingHorizontal: compact ? 12 : 14,
        borderRadius: compact ? 17 : 19,
        borderWidth: 1,
        borderColor: theme.tintbd,
        backgroundColor: theme.tint,
        alignSelf: 'flex-start',
        maxWidth: 220,
      }}
    >
      {!compact && <MapPin size={15} color={accent} strokeWidth={2} />}
      <Text numberOfLines={1} style={{ fontSize: compact ? 12.5 : 13, fontWeight: '700', color: accent, flexShrink: 1 }}>
        {compact ? display : `Inventário: ${display}`}
      </Text>
      <ChevronDown size={compact ? 10 : 11} color={accent} strokeWidth={2.6} />
    </Pressable>
  );
};
