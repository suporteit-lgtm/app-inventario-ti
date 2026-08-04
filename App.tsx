import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfirmHost } from './src/components/ConfirmHost';
import { RaizTeclado } from './src/components/teclado';
import { LoadingScreen } from './src/components/LoadingScreen';
import { TabBar } from './src/components/TabBar';
import { ToastHost } from './src/components/Toast';
import { NavProvider, useNav } from './src/nav/NavContext';
import { BackupSheet } from './src/overlays/BackupSheet';
import { CategoriesSheet } from './src/overlays/CategoriesSheet';
import { CfgSheet } from './src/overlays/CfgSheet';
import { InvPickerSheet } from './src/overlays/InvPickerSheet';
import { MoreSheet } from './src/overlays/MoreSheet';
import { PermSheet } from './src/overlays/PermSheet';
import { ScannerOverlay } from './src/overlays/ScannerOverlay';
import { TemplatesSheet } from './src/overlays/TemplatesSheet';
import { UnitsSheet } from './src/overlays/UnitsSheet';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { ConfigScreen } from './src/screens/ConfigScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { FormScreen } from './src/screens/FormScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ImportScreen } from './src/screens/ImportScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MovScreen } from './src/screens/MovScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { TermsScreen } from './src/screens/TermsScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { AppProvider, useApp } from './src/state/AppContext';

const SCREENS: Record<string, React.ComponentType> = {
  login: LoginScreen,
  home: HomeScreen,
  inv: InventoryScreen,
  termos: TermsScreen,
  detail: DetailScreen,
  form: FormScreen,
  mov: MovScreen,
  rel: ReportsScreen,
  config: ConfigScreen,
  users: UsersScreen,
  alerts: AlertsScreen,
  import: ImportScreen,
};

const Root: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme } = app;

  if (app.booting) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingScreen />
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
      </View>
    );
  }

  const screen = app.session ? nav.screen : 'login';
  const ScreenComp = SCREENS[screen] || HomeScreen;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenComp key={screen === 'form' ? `form-${nav.editing}-${nav.selId}` : screen} />
      {screen !== 'login' && <TabBar />}
      {screen !== 'login' && (
        <>
          <MoreSheet />
          <InvPickerSheet />
          <PermSheet />
          <CfgSheet />
          <TemplatesSheet />
          <UnitsSheet />
          <BackupSheet />
          <CategoriesSheet />
          <ScannerOverlay />
        </>
      )}
      <ConfirmHost />
      <ToastHost />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </View>
  );
};

export default function App() {
  return (
    <RaizTeclado>
      <SafeAreaProvider>
        <AppProvider>
          <NavProvider>
            <Root />
          </NavProvider>
        </AppProvider>
      </SafeAreaProvider>
    </RaizTeclado>
  );
}
