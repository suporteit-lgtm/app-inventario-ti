import { ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { SubHeader } from '../components/SubHeader';
import { cpfValido } from '../lib/mascaras';
import { Avatar, Card, FieldLabel, Input, OutlineButton, PasswordInput, PrimaryButton, Toggle } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { roleBadgeColors } from '../theme/tokens';
import { iniciais } from '../types';

export const ConfigScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, session, cfg, darkMode } = app;
  const [rBg, rFg] = roleBadgeColors(session?.role || 'Técnico', theme.dark);

  const toggles: { k: 'notif' | 'sons' | 'dark'; label: string; desc: string; on: boolean }[] = [
    { k: 'notif', label: 'Notificações push', desc: 'Alertas de garantia e manutenção', on: cfg.notif },
    { k: 'sons', label: 'Sons', desc: 'Som ao escanear QR code', on: cfg.sons },
    { k: 'dark', label: 'Modo escuro', desc: 'Tema do aplicativo', on: darkMode },
  ];

  const [senhaOpen, setSenhaOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [cpfOpen, setCpfOpen] = useState(false);
  const [meuCpf, setMeuCpf] = useState('');
  const [salvandoCpf, setSalvandoCpf] = useState(false);

  const salvarCpf = async () => {
    if (meuCpf.trim() && !cpfValido(meuCpf)) return app.showToast('CPF inválido');
    setSalvandoCpf(true);
    try {
      await app.updateMyCpf(meuCpf);
      setCpfOpen(false);
      app.showToast('CPF salvo');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao salvar o CPF');
    } finally {
      setSalvandoCpf(false);
    }
  };

  const salvarSenha = async () => {
    if (novaSenha.length < 6) return app.showToast('A senha precisa de ao menos 6 caracteres');
    if (novaSenha !== confirmaSenha) return app.showToast('As senhas não conferem');
    setSalvandoSenha(true);
    try {
      await app.changePassword(novaSenha);
      setSenhaOpen(false);
      setNovaSenha('');
      setConfirmaSenha('');
      app.showToast('Senha alterada');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao alterar a senha');
    } finally {
      setSalvandoSenha(false);
    }
  };

  const links = [
    { k: 'senha', label: 'Alterar senha', detail: '••••••' },
    { k: 'cpf', label: 'Meu CPF', detail: session?.cpf || 'não informado' },
    { k: 'templates', label: 'Templates de termos', detail: String(app.db.templates.length || 3) },
    { k: 'categorias', label: 'Categorias de equipamento', detail: String(app.db.categorias.length) },
    { k: 'locais', label: 'Locais e unidades', detail: String(app.db.inventories.length) },
    {
      k: 'backup',
      label: 'Backup e exportação',
      detail: { off: 'manual', daily: 'diário', weekly: 'semanal', monthly: 'mensal' }[app.backupCfg.freq],
    },
    { k: 'sobre', label: 'Sobre o app', detail: 'v1.0' },
  ];

  const sair = async () => {
    await app.logout();
    nav.resetToLogin();
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 132, gap: 12 }}>
        <Card radius={16} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}>
          <Avatar text={iniciais(session?.nome || 'U')} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{session?.nome}</Text>
            <Text style={{ fontSize: 12.5, color: theme.muted }}>{session?.email}</Text>
          </View>
          <View style={{ backgroundColor: rBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: rFg }}>{session?.role}</Text>
          </View>
        </Card>

        <Card radius={16} style={{ overflow: 'hidden' }}>
          {toggles.map((t, i) => (
            <Pressable
              key={t.k}
              onPress={() => (t.k === 'dark' ? app.setDarkMode(!darkMode) : app.toggleCfg(t.k))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: i < toggles.length - 1 ? 1 : 0,
                borderBottomColor: theme.hair,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{t.label}</Text>
                <Text style={{ fontSize: 12, color: theme.muted }}>{t.desc}</Text>
              </View>
              <Toggle on={t.on} onPress={() => (t.k === 'dark' ? app.setDarkMode(!darkMode) : app.toggleCfg(t.k))} />
            </Pressable>
          ))}
        </Card>

        <Card radius={16} style={{ overflow: 'hidden' }}>
          {links.map((l, i) => (
            <Pressable
              key={l.k}
              onPress={() =>
                l.k === 'senha'
                  ? setSenhaOpen(true)
                  : l.k === 'cpf'
                  ? (setMeuCpf(session?.cpf || ''), setCpfOpen(true))
                  : nav.setCfgSheet(l.k)
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 15,
                borderBottomWidth: i < links.length - 1 ? 1 : 0,
                borderBottomColor: theme.hair,
                backgroundColor: pressed ? theme.press : 'transparent',
              })}
            >
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text }}>{l.label}</Text>
              <Text style={{ fontSize: 12.5, color: theme.muted2 }}>{l.detail}</Text>
              <ChevronRight size={16} color={theme.radioOff} strokeWidth={2} />
            </Pressable>
          ))}
        </Card>

        <OutlineButton label="Sair da conta" danger onPress={sair} />
      </ScrollView>

      <Sheet visible={senhaOpen} onClose={() => setSenhaOpen(false)}>
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 12, color: theme.text }}>
          Alterar senha
        </Text>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>Nova senha</FieldLabel>
            <PasswordInput placeholder="Mínimo 6 caracteres" value={novaSenha} onChangeText={setNovaSenha} />
          </View>
          <View>
            <FieldLabel>Confirmar nova senha</FieldLabel>
            <PasswordInput placeholder="Repita a senha" value={confirmaSenha} onChangeText={setConfirmaSenha} />
          </View>
          <PrimaryButton label={salvandoSenha ? 'Salvando…' : 'Salvar nova senha'} onPress={salvarSenha} style={{ marginTop: 4 }} />
        </View>
      </Sheet>

      <Sheet visible={cpfOpen} onClose={() => setCpfOpen(false)}>
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
          Meu CPF
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 12 }}>
          Usado na assinatura de Responsável T.I. dos termos que você gerar.
        </Text>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>CPF</FieldLabel>
            <Input placeholder="000.000.000-00" mascara="cpf" value={meuCpf} onChangeText={setMeuCpf} />
          </View>
          <PrimaryButton label={salvandoCpf ? 'Salvando…' : 'Salvar CPF'} onPress={salvarCpf} style={{ marginTop: 4 }} />
        </View>
      </Sheet>
    </View>
  );
};
