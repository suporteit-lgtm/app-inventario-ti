// Versão NATIVA (Android/iOS) — usa a biblioteca de controle de teclado,
// que faz a tela rolar sozinha para manter o campo em foco visível.
import React from 'react';
import { ScrollViewProps, ViewProps } from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardProvider,
} from 'react-native-keyboard-controller';

export const AjustaTeclado: React.FC<ViewProps & { behavior?: string }> = ({ children, ...props }) => (
  <KeyboardAvoidingView {...(props as any)}>{children}</KeyboardAvoidingView>
);

export const RolagemComTeclado: React.FC<ScrollViewProps & { bottomOffset?: number }> = ({
  children,
  bottomOffset = 24,
  ...props
}) => (
  <KeyboardAwareScrollView
    bottomOffset={bottomOffset}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="interactive"
    showsVerticalScrollIndicator={false}
    {...props}
  >
    {children}
  </KeyboardAwareScrollView>
);

export const RaizTeclado: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <KeyboardProvider>{children}</KeyboardProvider>
);
