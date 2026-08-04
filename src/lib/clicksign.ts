import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { getSupabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

// E-mail que assina em nome da empresa em TODO termo enviado
export const EMAIL_EMPRESA = 'termos@locgrupo.com.br';
export { EMAIL_EMPRESA as EMAIL_EMPRESA_SIGNATARIO };
export const NOME_EMPRESA_SIGNATARIO = 'Locagora — Setor de Termos';

export interface Signatario {
  name: string;
  email: string;
  documentation?: string;
  sign_as?: string;
}

// Gera o PDF a partir do HTML e envia ao Clicksign pela função Edge.
// Só funciona no app instalado (Android/iOS): a geração de PDF em arquivo
// não existe no navegador.
export async function enviarParaAssinatura(opts: {
  html: string;
  filename: string;
  signatarios: Signatario[];
  mensagem?: string;
  /** Nome da pasta no Drive compartilhado (unidade) — ex.: "Belo Horizonte" */
  pasta?: string;
}): Promise<string[]> {
  if (Platform.OS === 'web') {
    throw new Error('O envio para assinatura está disponível no aplicativo instalado (Android/iOS).');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Envio para assinatura exige conexão com o servidor.');

  const { uri } = await Print.printToFileAsync({ html: opts.html });
  const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

  // a empresa sempre entra como signatária, sem duplicar se já estiver na lista
  const lista = [...opts.signatarios];
  if (!lista.some((s) => s.email.trim().toLowerCase() === EMAIL_EMPRESA)) {
    lista.push({ name: NOME_EMPRESA_SIGNATARIO, email: EMAIL_EMPRESA, sign_as: 'party' });
  }

  // Chamada direta (em vez de functions.invoke) para conseguir ler a
  // mensagem de erro real devolvida pela função, em vez de um erro genérico
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada — entre novamente no app.');

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/clicksign-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        filename: opts.filename,
        pdfBase64,
        signers: lista,
        message: opts.mensagem,
        pasta: opts.pasta,
        deadlineDays: 30,
      }),
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
  }

  const txt = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(txt);
  } catch {
    body = null;
  }

  if (res.status === 404) throw new Error('A função "clicksign-send" não foi encontrada no Supabase.');
  if (!res.ok || body?.error) {
    throw new Error(body?.error || `Erro ${res.status} do servidor: ${txt.slice(0, 200)}`);
  }
  return (body?.enviados as string[]) || [];
}
