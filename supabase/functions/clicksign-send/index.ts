// Função Edge "clicksign-send" — envia o termo em PDF para assinatura
// eletrônica no Clicksign e notifica todos os signatários por e-mail.
//
// O token do Clicksign fica AQUI (no servidor), nunca dentro do app —
// um token dentro do APK poderia ser extraído e usado por terceiros.
//
// Como publicar (uma vez):
//   1. Painel do Supabase → Edge Functions → Deploy a new function
//      → nome: clicksign-send → cole este arquivo → Deploy.
//   2. Edge Functions → clicksign-send → Secrets, adicione:
//        CLICKSIGN_TOKEN  = <access token gerado no Clicksign>
//        CLICKSIGN_ENV    = production   (ou "sandbox" para testes)

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => {
  if (status >= 400) console.error('[clicksign-send] ERRO', status, JSON.stringify(body));
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
};

interface Signer {
  name: string;
  email: string;
  documentation?: string; // CPF
  sign_as?: string; // papel: party, sign, witness…
}

const soDigitos = (s: string) => (s || '').replace(/\D/g, '');

// O Clicksign recusa CPF com dígito verificador errado (HTTP 422).
// Validamos antes: se for inválido, o signatário entra sem CPF em vez de
// derrubar o envio inteiro.
const cpfValido = (raw?: string): boolean => {
  const c = soDigitos(raw || '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(c[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(c[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(c[10]);
};

// O Clicksign espera o CPF no formato 000.000.000-00
const formatarCpf = (raw: string) => {
  const c = soDigitos(raw);
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // 1) Só usuários autenticados e cadastrados podem enviar termos
    const authHeader = req.headers.get('Authorization') || '';
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user?.email) return json({ error: 'Não autenticado' }, 401);

    console.log('[clicksign-send] chamada por', user.email);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: caller, error: errUser } = await admin
      .from('User')
      .select('id')
      .ilike('email', user.email)
      .maybeSingle();
    if (errUser) return json({ error: 'Falha ao consultar o usuário: ' + errUser.message }, 500);
    if (!caller) return json({ error: `Usuário ${user.email} não encontrado na tabela User` }, 403);

    const token = Deno.env.get('CLICKSIGN_TOKEN');
    if (!token) return json({ error: 'CLICKSIGN_TOKEN não configurado nos Secrets da função' }, 500);
    const host =
      (Deno.env.get('CLICKSIGN_ENV') || 'production') === 'sandbox'
        ? 'https://sandbox.clicksign.com'
        : 'https://app.clicksign.com';

    const body = await req.json();
    const { filename, pdfBase64, signers, message, deadlineDays, pasta, colaborador, unidade, template, equipamentos } =
      body as {
        filename: string;
        pdfBase64: string;
        signers: Signer[];
        message?: string;
        deadlineDays?: number;
        pasta?: string;
        // usados só para o histórico da tela de termos; versões antigas do
        // app não mandam, e aí caímos no que dá para deduzir dos signatários
        colaborador?: string;
        unidade?: string;
        template?: string;
        equipamentos?: string[];
      };
    if (!filename || !pdfBase64 || !Array.isArray(signers) || !signers.length) {
      return json({ error: 'Parâmetros inválidos' }, 400);
    }

    const cs = async (path: string, payload: unknown) => {
      const res = await fetch(`${host}/api/v1/${path}?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(txt);
      } catch {
        data = { raw: txt };
      }
      console.log(`[clicksign-send] ${path} -> HTTP ${res.status}`);
      if (!res.ok) {
        const detalhe = data?.errors ? JSON.stringify(data.errors) : txt.slice(0, 300);
        console.error(`[clicksign-send] ${path} FALHOU (${res.status}):`, detalhe);
        throw new Error(`Clicksign ${path} (HTTP ${res.status}): ${detalhe}`);
      }
      return data;
    };

    // 2) Cria o documento
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + (deadlineDays && deadlineDays > 0 ? deadlineDays : 30));
    // O caminho identifica os documentos DESTE app dentro da conta do
    // Clicksign (que é compartilhada com outros setores) e carrega a
    // unidade, usada depois pelo webhook para escolher a pasta no Drive.
    const prefixo = (Deno.env.get('CLICKSIGN_PATH_PREFIX') || 'inventario-ti').replace(/[^\w-]/g, '');
    const pastaSegura = (pasta || 'Geral').replace(/[\/\\]/g, '-').trim() || 'Geral';
    const doc = await cs('documents', {
      document: {
        path: `/${prefixo}/${pastaSegura}/${filename}`,
        content_base64: `data:application/pdf;base64,${pdfBase64}`,
        deadline_at: prazo.toISOString(),
        auto_close: true,
        locale: 'pt-BR',
      },
    });
    const documentKey = doc?.document?.key;
    if (!documentKey) return json({ error: 'Clicksign não retornou a chave do documento' }, 502);

    // 3) Cria cada signatário, vincula ao documento e dispara o e-mail
    const enviados: string[] = [];
    for (const s of signers) {
      if (!s?.email || !s?.name) continue;
      const temDoc = cpfValido(s.documentation);
      if (s.documentation && !temDoc) {
        console.warn(`[clicksign-send] CPF inválido de "${s.name}" — signatário enviado sem CPF`);
      }
      const signer = await cs('signers', {
        signer: {
          email: s.email.trim(),
          name: s.name.trim(),
          documentation: temDoc ? formatarCpf(s.documentation!) : undefined,
          has_documentation: temDoc,
          auths: ['email'],
          delivery: 'email',
        },
      });
      const signerKey = signer?.signer?.key;
      if (!signerKey) continue;

      const list = await cs('lists', {
        list: {
          document_key: documentKey,
          signer_key: signerKey,
          sign_as: s.sign_as || 'sign',
          message: message || 'Segue o termo para assinatura eletrônica.',
        },
      });
      const requestSignatureKey = list?.list?.request_signature_key;
      if (requestSignatureKey) {
        await cs('notifications', {
          request_signature_key: requestSignatureKey,
          message: message || 'Segue o termo para assinatura eletrônica.',
        });
        enviados.push(s.email.trim());
      }
    }

    // Histórico do termo. Falhar aqui NÃO invalida o envio: o documento já
    // está na Clicksign e os e-mails já saíram — derrubar a resposta faria a
    // tela dizer "falhou" para algo que aconteceu.
    try {
      // O app põe o colaborador em primeiro e anexa a empresa por último
      const primeiro = signers[0];
      const { error: erroHist } = await admin.from('TermoEnvio').insert({
        id: crypto.randomUUID(),
        documentKey,
        colaborador: (colaborador || primeiro?.name || '—').trim(),
        emailColaborador: primeiro?.email?.trim() || null,
        unidade: (unidade || pasta || '').trim() || null,
        template: template || null,
        equipamentos: Array.isArray(equipamentos) && equipamentos.length ? equipamentos : null,
        status: 'enviado',
        enviadoPor: user.email,
      });
      if (erroHist) console.error('[clicksign-send] histórico não gravado:', erroHist.message);
    } catch (e) {
      console.error('[clicksign-send] histórico não gravado:', e);
    }

    console.log('[clicksign-send] concluído. Enviados:', enviados.join(', '));
    return json({ ok: true, documentKey, enviados });
  } catch (e) {
    console.error('[clicksign-send] EXCEÇÃO:', e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
