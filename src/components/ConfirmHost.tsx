import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { ConfirmRequest, registerConfirmHost } from '../lib/confirm';
import { useApp } from '../state/AppContext';

export const ConfirmHost: React.FC = () => {
  const { theme } = useApp();
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerConfirmHost((r) => {
      setReq(r);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
    return () => registerConfirmHost(null);
  }, []);

  if (!req) return null;

  const responder = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => responder(false)} statusBarTranslucent>
      <Animated.View
        style={{ flex: 1, backgroundColor: theme.scrim, alignItems: 'center', justifyContent: 'center', padding: 32, opacity: anim }}
      >
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => responder(false)} />
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: theme.card,
            borderRadius: 18,
            padding: 20,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 10 },
            elevation: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{req.titulo}</Text>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: theme.muted, marginTop: 8 }}>{req.mensagem}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable
              onPress={() => responder(false)}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.bd,
                backgroundColor: pressed ? theme.press : theme.card,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => responder(true)}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: 12,
                // vermelho apenas para ações destrutivas; confirmações normais
                // usam a cor primária
                backgroundColor: /excluir|remover|apagar/i.test(req.confirmarLabel) ? '#dc2626' : theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{req.confirmarLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
