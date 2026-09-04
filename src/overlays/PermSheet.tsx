import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Checkbox, FieldLabel, Input, OutlineButton, PasswordInput, PrimaryButton, SelectChip } from '../components/ui';
import { confirmAsync } from '../lib/confirm';
import { cpfValido, emailValido } from '../lib/mascaras';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { Role } from '../types';

export const PermSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;
  const user = db.users.find((u) => u.nome === nav.permUser);
  const visible = !!user;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cpf, setCpf] = useState('');
  const [role, setRole] = useState<Role>('Técnico');
  const [access, setAccess] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNome(user.nome);
    setEmail(user.email);
    setSenha('');
    setCpf(user.cpf || '');
    setRole(user.role);
    setAccess([...user.access]);
  }, [nav.permUser]);

  if (!user) return null;

  const souEu = app.session?.email.toLowerCase() === user.email.toLowerCase();

  const salvar = async () => {
    if (!nome.trim() || !emailValido(email)) return app.showToast('Preencha nome e e-mail válidos');
    if (senha && senha.length < 6) return app.showToast('A senha precisa de ao menos 6 caracteres');
    if (cpf.trim() && !cpfValido(cpf)) return app.showToast('CPF inválido');
    setSalvando(true);
    try {
      const aviso = await app.updateUser(user.email, { nome, email, senha: senha || undefined, role, access, cpf: cpf || undefined });
      nav.setPermUser(null);
      app.showToast(aviso || 'Usuário atualizado');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (souEu) return app.showToast('Você não pode excluir o próprio usuário');
    const ok = await confirmAsync('Excluir usuário', `Excluir "${user.nome}"? O acesso ao app será removido.`);
    if (!ok) return app.showToast('Exclusão cancelada');
    try {
      await app.deleteUser(user.email);
      nav.setPermUser(null);
      app.showToast('Usuário excluído');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao excluir');
    }
  };

  return (
    <Sheet visible={visible} onClose={() => nav.setPermUser(null)}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 12, color: theme.text }}>
          Editar usuário
        </Text>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>Nome</FieldLabel>
            <Input value={nome} onChangeText={setNome} />
          </View>
          <View>
            <FieldLabel>E-mail</FieldLabel>
            <Input mascara="email" value={email} onChangeText={setEmail} />
          </View>
          <View>
            <FieldLabel>Nova senha (deixe vazio para manter)</FieldLabel>
            <PasswordInput placeholder="Mínimo 6 caracteres" value={senha} onChangeText={setSenha} />
          </View>
          <View>
            <FieldLabel>CPF (sai na assinatura dos termos)</FieldLabel>
            <Input placeholder="000.000.000-00" mascara="cpf" value={cpf} onChangeText={setCpf} />
          </View>
          <View>
            <FieldLabel>Permissão</FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['Admin', 'Técnico'] as Role[]).map((r) => (
                <SelectChip key={r} label={r} active={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
          </View>
          <View>
            <FieldLabel>Acesso a inventários</FieldLabel>
            {db.inventories.map((invItem, i) => {
              const on = access.includes(invItem.nome);
              return (
                <Pressable
                  key={invItem.nome}
                  onPress={() =>
                    setAccess((a) => (on ? a.filter((x) => x !== invItem.nome) : [...a, invItem.nome]))
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    borderBottomWidth: i < db.inventories.length - 1 ? 1 : 0,
                    borderBottomColor: theme.hair,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: theme.text }}>{invItem.nome}</Text>
                  <Checkbox on={on} />
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label={salvando ? 'Salvando…' : 'Salvar'} height={46} onPress={salvar} style={{ marginTop: 4 }} />
          {!souEu && <OutlineButton label="Excluir usuário" danger height={46} onPress={excluir} />}
        </View>
      </ScrollView>
    </Sheet>
  );
};
