// Versão WEB — o navegador não tem teclado virtual e a biblioteca nativa
// de teclado não é suportada aqui. O Metro escolhe automaticamente entre
// este arquivo e o teclado.native.tsx conforme a plataforma.
import React from 'react';
import { KeyboardAvoidingView, ScrollView, ScrollViewProps, ViewProps } from 'react-native';

export const AjustaTeclado: React.FC<ViewProps & { behavior?: string }> = ({ children, ...props }) => (
  <KeyboardAvoidingView {...(props as any)}>{children}</KeyboardAvoidingView>
);

export const RolagemComTeclado: React.FC<ScrollViewProps & { bottomOffset?: number }> = ({
  children,
  bottomOffset: _bottomOffset,
  ...props
}) => (
  <ScrollView keyboardShouldPersistTaps="handled" {...props}>
    {children}
  </ScrollView>
);

export const RaizTeclado: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
