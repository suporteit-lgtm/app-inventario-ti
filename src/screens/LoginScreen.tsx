import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useNav } from '../nav/NavContext';
import { CREDS_KEY, useApp } from '../state/AppContext';
import { TelaScroll } from '../components/Tela';
import { Checkbox, FieldLabel, Input, PasswordInput, PrimaryButton } from '../components/ui';

export const LoginScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme } = app;
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [busy, setBusy] = useState(false);

  // pré-preenche com as credenciais salvas
  useEffect(() => {
    AsyncStorage.getItem(CREDS_KEY)
      .then((raw) => {
        if (!raw) return;
        const creds = JSON.parse(raw);
        if (creds?.email) {
          setEmail(creds.email);
          setSenha(creds.senha || '');
          setLembrar(true);
        }
      })
      .catch(() => {});
  }, []);

  const entrar = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await app.login(email || 'andre@locgrupo.com.br', senha);
      if (lembrar) await AsyncStorage.setItem(CREDS_KEY, JSON.stringify({ email: email.trim(), senha }));
      else await AsyncStorage.removeItem(CREDS_KEY);
      nav.go('home');
    } catch (e: any) {
      app.showToast(e?.message || 'Não foi possível entrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TelaScroll contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center', gap: 16, marginBottom: 34 }}>
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
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: theme.text }}>
              Inventário de Equipamentos
            </Text>
            <Text style={{ fontSize: 14, color: theme.muted, marginTop: 4 }}>Acesse com sua conta corporativa</Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>E-mail</FieldLabel>
            <Input height={48} placeholder="voce@locgrupo.com.br" mascara="email" value={email} onChangeText={setEmail} />
          </View>
          <View>
            <FieldLabel>Senha</FieldLabel>
            <PasswordInput
              height={48}
              placeholder="••••••••"
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={entrar}
            />
          </View>

          <Pressable
            onPress={() => setLembrar((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}
          >
            <Checkbox on={lembrar} />
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text2 }}>Lembrar usuário e senha</Text>
          </Pressable>

          <PrimaryButton label={busy ? 'Entrando…' : 'Entrar'} height={50} onPress={entrar} style={{ marginTop: 8 }} />
          <Pressable onPress={() => app.showToast('Fale com suporte.ti@locgrupo.com.br')} style={{ marginTop: 6 }}>
            <Text style={{ textAlign: 'center', fontSize: 13.5, color: theme.dark ? theme.accent : theme.primary }}>
              Esqueci minha senha
            </Text>
          </Pressable>
          {app.demoMode ? (
            <Text style={{ textAlign: 'center', fontSize: 12, color: theme.muted2, marginTop: 10 }}>
              Modo demonstração — use andre@locgrupo.com.br (Admin) ou diego@locgrupo.com.br (Técnico)
            </Text>
          ) : null}
        </View>
      </TelaScroll>
    </View>
  );
};
