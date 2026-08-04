import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';

const TRACK_W = 230;

// Tela de carregamento: logo Locagora + moto percorrendo a pista
export const LoadingScreen: React.FC = () => {
  const { theme } = useApp();
  const ride = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ride, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = ride.interpolate({
    inputRange: [0, 1],
    outputRange: [-TRACK_W / 2 + 16, TRACK_W / 2 - 16],
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: 34 }}>
      <View
        style={
          theme.dark
            ? { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }
            : undefined
        }
      >
        <Image
          source={require('../../assets/locagora-logo-c.png')}
          style={{ width: 230, height: 64 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ width: TRACK_W, height: 44, justifyContent: 'flex-end', alignItems: 'center' }}>
        {/* moto */}
        <Animated.Text
          style={{
            position: 'absolute',
            bottom: 10,
            fontSize: 26,
            transform: [{ translateX }, { scaleX: -1 }],
          }}
        >
          🏍️
        </Animated.Text>
        {/* pista */}
        <View style={{ width: TRACK_W, height: 5, borderRadius: 3, backgroundColor: theme.dark ? '#2a3a5c' : '#dbe2ec', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 1.5, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: theme.dark ? '#4a5b7d' : '#ffffff' }} />
            ))}
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 12.5, color: theme.muted }}>Carregando…</Text>
    </View>
  );
};
