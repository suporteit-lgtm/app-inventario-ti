import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { RolagemComTeclado } from './teclado';

// Container simples de tela (sem rolagem).
export const Tela: React.FC<ViewProps & { children: React.ReactNode }> = ({ children, style, ...props }) => (
  <View style={[{ flex: 1 }, style]} {...props}>
    {children}
  </View>
);

/**
 * Tela com rolagem que acompanha o teclado: ao focar um campo, o conteúdo
 * rola sozinho para deixá-lo visível acima do teclado (Android/iOS).
 */
export const TelaScroll: React.FC<{
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** espaço extra entre o campo em foco e o topo do teclado */
  extraSpace?: number;
}> = ({ children, contentContainerStyle, extraSpace = 24 }) => (
  <RolagemComTeclado bottomOffset={extraSpace} contentContainerStyle={contentContainerStyle}>
    {children}
  </RolagemComTeclado>
);
