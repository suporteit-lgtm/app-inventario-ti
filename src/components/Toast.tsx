import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { useApp } from '../state/AppContext';

export const ToastHost: React.FC = () => {
  const { toast } = useApp();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 136,
        alignSelf: 'center',
        backgroundColor: '#0f172a',
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 12,
        zIndex: 70,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{toast}</Text>
    </Animated.View>
  );
};
