import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(url && anonKey);
export const SUPABASE_URL = url || '';
export const SUPABASE_ANON_KEY = anonKey || '';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // web: retoma a sessão ao voltar do redirect do Google;
        // pkce: fluxo seguro exigido para OAuth em apps mobile
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    });
  }
  return client;
}

// Cliente auxiliar SEM persistência de sessão — usado para criar novos
// logins (signUp) sem derrubar a sessão do administrador logado
let aux: SupabaseClient | null = null;

export function getSupabaseAux(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!aux) {
    aux = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return aux;
}
