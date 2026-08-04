import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/AppContext';
import { AjustaTeclado } from './teclado';

export const Sheet: React.FC<{ visible: boolean; onClose: () => void; children: React.ReactNode }> = ({
  visible,
  onClose,
  children,
}) => {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slide.setValue(40);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim, opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      {/* acompanha a altura do teclado, mantendo o conteúdo sempre visível */}
      <AjustaTeclado behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={{
            maxHeight: height * 0.85,
            backgroundColor: theme.card,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 10,
            paddingHorizontal: 18,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            transform: [{ translateY: slide }],
            opacity: fade,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.bd,
              alignSelf: 'center',
              marginTop: 4,
              marginBottom: 12,
            }}
          />
          {children}
        </Animated.View>
      </AjustaTeclado>
    </Modal>
  );
};
