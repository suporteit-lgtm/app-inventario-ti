import { Check, Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import * as M from '../lib/mascaras';
import { useApp } from '../state/AppContext';
import { badgeColors } from '../theme/tokens';

export const Card: React.FC<{ style?: StyleProp<ViewStyle>; children: React.ReactNode; onPress?: () => void; radius?: number }> = ({
  style,
  children,
  onPress,
  radius = 14,
}) => {
  const { theme } = useApp();
  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius,
  };
  if (onPress)
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { backgroundColor: theme.press }, style]}
      >
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const { theme } = useApp();
  const [bg, fg] = badgeColors(status, theme.dark);
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: size === 'sm' ? 8 : 10,
        paddingVertical: size === 'sm' ? 3 : 4,
        borderRadius: size === 'sm' ? 8 : 9,
      }}
    >
      <Text style={{ fontSize: size === 'sm' ? 11 : 11.5, fontWeight: '700', color: fg }}>{status}</Text>
    </View>
  );
};

export const SelectChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 34,
        paddingHorizontal: 13,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.bd,
        backgroundColor: active ? theme.primary : theme.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text2 }}>{label}</Text>
    </Pressable>
  );
};

export const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, disabled, height = 48, style }) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: 12,
          backgroundColor: disabled ? theme.disabledBtn : theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
};

export const OutlineButton: React.FC<{
  label: string;
  onPress: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  danger?: boolean;
}> = ({ label, onPress, height = 48, style, danger }) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: danger ? theme.dangerbd : '#cfd8e3',
          backgroundColor: theme.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { backgroundColor: theme.press },
        style,
      ]}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: danger ? '#dc2626' : theme.text }}>{label}</Text>
    </Pressable>
  );
};

export const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useApp();
  return <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text2, marginBottom: 6 }}>{children}</Text>;
};

export type TipoMascara =
  | 'cpf'
  | 'cnpj'
  | 'telefone'
  | 'data'
  | 'moeda'
  | 'mac'
  | 'imei'
  | 'cep'
  | 'maiuscula'
  | 'email';

const MASCARAS: Record<TipoMascara, (v: string) => string> = {
  cpf: M.mascaraCpf,
  cnpj: M.mascaraCnpj,
  telefone: M.mascaraTelefone,
  data: M.mascaraData,
  moeda: M.mascaraMoeda,
  mac: M.mascaraMac,
  imei: M.mascaraImei,
  cep: M.mascaraCep,
  maiuscula: M.mascaraMaiuscula,
  email: M.mascaraEmail,
};

// Teclado adequado a cada máscara, para o usuário não precisar trocar
const TECLADOS: Partial<Record<TipoMascara, TextInputProps['keyboardType']>> = {
  cpf: 'number-pad',
  cnpj: 'number-pad',
  telefone: 'number-pad',
  data: 'number-pad',
  moeda: 'number-pad',
  imei: 'number-pad',
  cep: 'number-pad',
  email: 'email-address',
};

// No Android, a sugestão/autopreenchimento do teclado briga com o
// onChangeText de um campo controlado: o teclado reenvia o texto inteiro e
// ele sai duplicado ("DellDell"). Desligar autocompletar e autocorreção é o
// contorno conhecido — e vale para todo campo controlado do app, por isso
// fica aqui em vez de repetido campo a campo.
// Vem ANTES do {...props} em cada campo, então dá para sobrescrever caso
// algum campo específico precise de autocompletar.
export const SEM_AUTOCOMPLETAR = {
  autoComplete: 'off',
  autoCorrect: false,
  importantForAutofill: 'no',
  spellCheck: false,
} as const;

export const Input: React.FC<TextInputProps & { height?: number; mascara?: TipoMascara }> = ({
  height = 46,
  style,
  mascara,
  onChangeText,
  value,
  ...props
}) => {
  const { theme } = useApp();
  const fn = mascara ? MASCARAS[mascara] : null;
  return (
    <TextInput
      placeholderTextColor={theme.muted2}
      {...SEM_AUTOCOMPLETAR}
      keyboardType={props.keyboardType ?? (mascara ? TECLADOS[mascara] : undefined)}
      autoCapitalize={props.autoCapitalize ?? (mascara === 'email' ? 'none' : undefined)}
      {...props}
      value={fn && value != null ? fn(String(value)) : value}
      onChangeText={onChangeText ? (t) => onChangeText(fn ? fn(t) : t) : undefined}
      style={[
        {
          width: '100%',
          height,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.bd,
          backgroundColor: theme.card,
          paddingHorizontal: 12,
          fontSize: 14,
          color: theme.text,
        },
        style,
      ]}
    />
  );
};

// Campo de senha com botão de mostrar/ocultar (ícone de olho)
export const PasswordInput: React.FC<TextInputProps & { height?: number }> = ({ height = 46, style, ...props }) => {
  const { theme } = useApp();
  const [visivel, setVisivel] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        placeholderTextColor={theme.muted2}
        {...props}
        secureTextEntry={!visivel}
        style={[
          {
            width: '100%',
            height,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.bd,
            backgroundColor: theme.card,
            paddingLeft: 12,
            paddingRight: 46,
            fontSize: 14,
            color: theme.text,
          },
          style,
        ]}
      />
      <Pressable
        onPress={() => setVisivel((v) => !v)}
        hitSlop={8}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          height,
          width: 46,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {visivel ? (
          <EyeOff size={19} color={theme.muted} strokeWidth={1.9} />
        ) : (
          <Eye size={19} color={theme.muted} strokeWidth={1.9} />
        )}
      </Pressable>
    </View>
  );
};

export const Toggle: React.FC<{ on: boolean; onPress: () => void }> = ({ on, onPress }) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        backgroundColor: on ? theme.primary : theme.toggleOff,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: '#fbfdff',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
};

export const Avatar: React.FC<{ text: string; size?: number; bg?: string; fg?: string }> = ({ text, size = 42, bg, fg }) => {
  const { theme } = useApp();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg || theme.avbg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: size * 0.36, color: fg || theme.avfg }}>{text}</Text>
    </View>
  );
};

export const TypeTag: React.FC<{ tag: string }> = ({ tag }) => {
  const { theme } = useApp();
  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: theme.chip,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.chipFg }}>{tag}</Text>
    </View>
  );
};

export const Radio: React.FC<{ on: boolean; check?: boolean }> = ({ on, check }) => {
  const { theme } = useApp();
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: on ? theme.primary : theme.radioOff,
        backgroundColor: on ? theme.primary : theme.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on && check ? <Check size={11} color="#fff" strokeWidth={3.4} /> : null}
    </View>
  );
};

export const Checkbox: React.FC<{ on: boolean }> = ({ on }) => {
  const { theme } = useApp();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: on ? theme.primary : theme.radioOff,
        backgroundColor: on ? theme.primary : theme.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? <Check size={12} color="#fff" strokeWidth={3.4} /> : null}
    </View>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const { theme } = useApp();
  return <Text style={[{ fontSize: 15, fontWeight: '700', color: theme.text }, style as any]}>{children}</Text>;
};
