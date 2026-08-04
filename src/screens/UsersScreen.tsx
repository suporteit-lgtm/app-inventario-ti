import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { SubHeader } from '../components/SubHeader';
import { Avatar, Card, FieldLabel, Input, PasswordInput, PrimaryButton, SelectChip } from '../components/ui';
import { cpfValido, emailValido } from '../lib/mascaras';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { roleBadgeColors } from '../theme/tokens';
import { iniciais, sigla } from '../types';

export const UsersScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invNome, setInvNome] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invSenha, setInvSenha] = useState('');
  const [invCpf, setInvCpf] = useState('');
  const [invRole, setInvRole] = useState<'Admin' | 'Técnico'>('Técnico');
  const [criando, setCriando] = useState(false);

  const abrirConvite = () => {
    setInvNome('');
    setInvEmail('');
    setInvSenha('');
    setInvCpf('');
    setInvRole('Técnico');
    setInviteOpen(true);
  };

  const criarUsuario = async () => {
    if (!invNome.trim() || !emailValido(invEmail)) return app.showToast('Preencha nome e e-mail válidos');
    if (invSenha.length < 6) return app.showToast('A senha precisa de ao menos 6 caracteres');
    if (invCpf.trim() && !cpfValido(invCpf)) return app.showToast('CPF inválido');
    setCriando(true);
    try {
      const aviso = await app.createUser(invNome, invEmail, invSenha, invRole, app.allowedInvs, invCpf);
      setInviteOpen(false);
      app.showToast(aviso || 'Usuário criado — já pode entrar no app');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao criar usuário');
    } finally {
      setCriando(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <FlatList
        data={db.users}
        keyExtractor={(u) => u.email}
        contentContainerStyle={{ gap: 8, padding: 18, paddingTop: 14, paddingBottom: 132 }}
        ListHeaderComponent={
          <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 2, paddingBottom: 4 }}>
            Toque em um usuário para definir a quais inventários ele tem acesso.
          </Text>
        }
        ListFooterComponent={
          <Pressable
            onPress={abrirConvite}
            style={{
              height: 46,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.dark ? theme.dash : '#9db4d8',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>+ Convidar usuário</Text>
          </Pressable>
        }
        renderItem={({ item: u }) => {
          const [rBg, rFg] = roleBadgeColors(u.role, theme.dark);
          return (
            <Card onPress={() => nav.setPermUser(u.nome)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14 }}>
              <Avatar text={iniciais(u.nome)} bg={theme.chip} fg={theme.chipFg} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{u.nome}</Text>
                <Text style={{ fontSize: 12, color: theme.muted }}>
                  {u.access.length ? 'Acesso: ' + u.access.map(sigla).join(', ') : 'Sem acesso a inventários'}
                </Text>
              </View>
              <View style={{ backgroundColor: rBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: rFg }}>{u.role}</Text>
              </View>
            </Card>
          );
        }}
      />

      <Sheet visible={inviteOpen} onClose={() => setInviteOpen(false)}>
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
          Convidar usuário
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 12 }}>
          Cria o login e o cadastro do usuário. Ele poderá trocar a senha depois em Configurações.
        </Text>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>Nome</FieldLabel>
            <Input placeholder="Nome completo" value={invNome} onChangeText={setInvNome} />
          </View>
          <View>
            <FieldLabel>E-mail</FieldLabel>
            <Input placeholder="usuario@locgrupo.com.br" mascara="email" value={invEmail} onChangeText={setInvEmail} />
          </View>
          <View>
            <FieldLabel>Senha</FieldLabel>
            <PasswordInput placeholder="Mínimo 6 caracteres" value={invSenha} onChangeText={setInvSenha} />
          </View>
          <View>
            <FieldLabel>CPF (sai na assinatura dos termos)</FieldLabel>
            <Input placeholder="000.000.000-00" mascara="cpf" value={invCpf} onChangeText={setInvCpf} />
          </View>
          <View>
            <FieldLabel>Permissão</FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['Admin', 'Técnico'] as const).map((r) => (
                <SelectChip key={r} label={r} active={invRole === r} onPress={() => setInvRole(r)} />
              ))}
            </View>
          </View>
          <PrimaryButton label={criando ? 'Criando…' : 'Criar usuário'} onPress={criarUsuario} style={{ marginTop: 4 }} />
        </View>
      </Sheet>
    </View>
  );
};
