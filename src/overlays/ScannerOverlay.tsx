import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';

const FRAME = 230;
const GREEN = '#4ade80';

const Corner: React.FC<{ pos: 'tl' | 'tr' | 'bl' | 'br' }> = ({ pos }) => {
  const base: any = { position: 'absolute', width: 34, height: 34, borderColor: GREEN };
  const map: Record<string, any> = {
    tl: { top: 0, left: 0, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderTopLeftRadius: 8 },
    tr: { top: 0, right: 0, borderTopWidth: 3.5, borderRightWidth: 3.5, borderTopRightRadius: 8 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3.5, borderLeftWidth: 3.5, borderBottomLeftRadius: 8 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3.5, borderRightWidth: 3.5, borderBottomRightRadius: 8 },
  };
  return <View style={[base, map[pos]]} />;
};

export const ScannerOverlay: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const locked = useRef(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  const useRealCamera = Platform.OS !== 'web';

  useEffect(() => {
    if (!nav.scanOpen) return;
    locked.current = false;
    if (useRealCamera && permission && !permission.granted && permission.canAskAgain) requestPermission();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [nav.scanOpen]);

  if (!nav.scanOpen) return null;

  const handleCode = (code: string) => {
    if (locked.current) return;
    locked.current = true;
    const handler = nav.scanHandler.current;
    nav.closeScan();
    if (handler) {
      handler(code);
      return;
    }
    const found = app.db.equipments.find(
      (e) => e.serial.toLowerCase() === code.toLowerCase() || e.patrimonio.toLowerCase() === code.toLowerCase()
    );
    if (found) {
      nav.openItem(found.id);
      app.showToast(`${found.patrimonio} encontrado`);
    } else {
      app.showToast('Equipamento não encontrado');
    }
  };

  const simulate = () => {
    const first = app.db.equipments.find((e) => e.unidade === app.inv) || app.db.equipments[0];
    handleCode(nav.scanHandler.current ? 'QR-' + Math.floor(1000 + Math.random() * 9000) : first?.serial || '');
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b1220', zIndex: 60 }}>
      {useRealCamera && permission?.granted ? (
        <CameraView
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
          onBarcodeScanned={({ data }) => data && handleCode(data)}
        />
      ) : null}

      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, alignItems: 'flex-end' }}>
        <Pressable
          onPress={nav.closeScan}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <View style={{ width: FRAME, height: FRAME }}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          <Animated.View
            style={{
              position: 'absolute',
              left: '8%',
              right: '8%',
              height: 2.5,
              backgroundColor: GREEN,
              shadowColor: GREEN,
              shadowOpacity: 1,
              shadowRadius: 14,
              transform: [
                {
                  translateY: scanAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [FRAME * 0.1, FRAME * 0.86],
                  }),
                },
              ],
            }}
          />
        </View>
        <Text style={{ color: 'rgba(255,255,255,.75)', fontSize: 14 }}>
          {useRealCamera && !permission?.granted ? 'Permita o acesso à câmera para escanear' : 'Aponte a câmera para o QR code'}
        </Text>
        {useRealCamera && permission && !permission.granted ? (
          <Pressable
            onPress={requestPermission}
            style={{ height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#0b1220', fontSize: 14, fontWeight: '700' }}>Permitir câmera</Text>
          </Pressable>
        ) : null}
        {!useRealCamera ? (
          <Pressable
            onPress={simulate}
            style={{ height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#0b1220', fontSize: 14, fontWeight: '700' }}>Simular leitura</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
