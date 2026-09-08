// Função Edge "clicksign-webhook" — recebe o aviso do Clicksign quando o
// termo é assinado por todos e salva o PDF assinado no Google Drive
// compartilhado, dentro da pasta da unidade (criada automaticamente).
//
// IMPORTANTE ao publicar: desmarque "Verify JWT" / "Enforce JWT Verification".
// O Clicksign não envia token do Supabase; a segurança aqui é feita pela
// assinatura HMAC do próprio Clicksign (CLICKSIGN_WEBHOOK_SECRET).
//
// Secrets necessários (Edge Functions → clicksign-webhook → Secrets):
//   CLICKSIGN_TOKEN           = mesmo token usado no envio
//   CLICKSIGN_ENV             = production | sandbox
//   CLICKSIGN_WEBHOOK_SECRET  = segredo do webhook gerado no Clicksign
//   GOOGLE_SA_EMAIL           = e-mail da conta de serviço do Google
//   GOOGLE_SA_PRIVATE_KEY     = private_key do JSON da conta de serviço
//   GDRIVE_DRIVE_ID           = ID do Drive compartilhado OU da pasta destino
//   GDRIVE_PARENT_FOLDER_ID   = (opcional) pasta-mãe dentro do Drive
//   GOOGLE_IMPERSONATE_EMAIL  = (só para pasta comum) termos@locgrupo.com.br —
//                               exige delegação no Admin do Workspace

import { createClient } from 'npm:@supabase/supabase-js@2';

const enc = new TextEncoder();

// Atualiza a linha do termo em "TermoEnvio". Só a service_role escreve
// nessa tabela; o app apenas lê.
const atualizarTermo = async (documentKey: string, campos: Record<string, unknown>) => {
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin
      .from('TermoEnvio')
      .update(campos)
      .eq('documentKey', documentKey)
      .select('id');
    if (error) return console.error('[webhook] histórico não atualizado:', error.message);
    // Um update que não casa nenhuma linha não é erro para o PostgREST —
    // sem este aviso, um termo enviado por uma versão antiga do app (que
    // não gravava histórico) sumiria da tela sem explicação.
    if (!data || !data.length) {
      console.warn('[webhook] nenhum termo com documentKey', documentKey, '— enviado antes do histórico existir?');
    }
  } catch (e) {
    console.error('[webhook] histórico não atualizado:', e);
  }
};

const b64url = (input: string | Uint8Array) => {
  const bytes = typeof input === 'string' ? enc.encode(input) : input;
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemToBuffer = (pem: string) => {
  const b64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const b64 = (buf: ArrayBuffer) => {
  let bin = '';
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

// Token de acesso do Google via conta de serviço (JWT assinado com RS256)
async function googleAccessToken(): Promise<string> {
  const email = Deno.env.get('GOOGLE_SA_EMAIL');
  const pk = Deno.env.get('GOOGLE_SA_PRIVATE_KEY');
  if (!email || !pk) throw new Error('GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY não configurados');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim: Record<string, unknown> = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  // Delegação em todo o domínio: a conta de serviço age COMO este usuário,
  // então os arquivos ficam no Drive dele (necessário para pasta comum,
  // que não é Drive compartilhado). Deixe vazio se usar Drive compartilhado.
  const impersonar = Deno.env.get('GOOGLE_IMPERSONATE_EMAIL');
  if (impersonar) claim.sub = impersonar;
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(pk),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  const assertion = `${unsigned}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error('Google OAuth: ' + JSON.stringify(data).slice(0, 300));
  return data.access_token as string;
}

// Procura a pasta pelo nome dentro do pai; cria se não existir.
// Funciona tanto em Drive compartilhado quanto em pasta comum compartilhada.
async function ensureFolder(token: string, parentId: string, nome: string): Promise<string> {
  const escaped = nome.replace(/'/g, "\\'");
  const q = `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)`;
  const found = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  if (found?.files?.length) return found.files[0].id;

  const criada = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  }).then((r) => r.json());
  if (!criada?.id) throw new Error('Drive: falha ao criar a pasta ' + nome + ' — ' + JSON.stringify(criada).slice(0, 300));
  return criada.id as string;
}

// Evita duplicar o arquivo caso o Clicksign reenvie o mesmo aviso
async function arquivoJaExiste(token: string, folderId: string, filename: string): Promise<string | null> {
  const escaped = filename.replace(/'/g, "\\'");
  const q = `name='${escaped}' and '${folderId}' in parents and trashed=false`;
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id)`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
  return r?.files?.length ? r.files[0].id : null;
}

async function uploadPdf(token: string, folderId: string, filename: string, pdf: Uint8Array) {
  const boundary = 'locagora' + Math.random().toString(36).slice(2);
  const metadata = { name: filename, parents: [folderId], mimeType: 'application/pdf' };
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(pre.length + pdf.length + post.length);
  body.set(pre, 0);
  body.set(pdf, pre.length);
  body.set(post, pre.length + pdf.length);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.id) throw new Error('Drive upload: ' + JSON.stringify(data).slice(0, 300));
  return data as { id: string; webViewLink?: string };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  try {
    const raw = await req.text();

    console.log('[webhook] recebido, tamanho do corpo:', raw.length);

    // 1) Confere a assinatura HMAC enviada pelo Clicksign.
    // O formato pode variar (hex ou base64, com ou sem prefixo "sha256="),
    // então aceitamos as variações e registramos o que chegou se falhar.
    const segredo = Deno.env.get('CLICKSIGN_WEBHOOK_SECRET');
    if (segredo) {
      const nomesPossiveis = ['content-hmac', 'x-clicksign-signature', 'x-hub-signature-256', 'x-signature'];
      let enviado = '';
      let nomeUsado = '';
      for (const n of nomesPossiveis) {
        const v = req.headers.get(n);
        if (v) {
          enviado = v.replace(/^sha256=/i, '').trim();
          nomeUsado = n;
          break;
        }
      }
      const key = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]);
      const assinatura = await crypto.subtle.sign('HMAC', key, enc.encode(raw));
      const emHex = hex(assinatura);
      const emB64 = b64(assinatura);
      const confere = enviado && (enviado.toLowerCase() === emHex || enviado === emB64);
      if (!confere) {
        const cabecalhos: string[] = [];
        req.headers.forEach((v, k) => cabecalhos.push(`${k}=${String(v).slice(0, 90)}`));
        console.error(
          '[webhook] ASSINATURA NÃO CONFERE.',
          `header lido: ${nomeUsado || '(nenhum)'} = ${enviado.slice(0, 90) || '(vazio)'}`,
          `| esperado hex: ${emHex.slice(0, 20)}...`,
          `| cabeçalhos recebidos: ${cabecalhos.join(' ; ')}`
        );
        return new Response('assinatura inválida', { status: 401 });
      }
      console.log('[webhook] assinatura conferida via header', nomeUsado);
    } else {
      console.warn('[webhook] CLICKSIGN_WEBHOOK_SECRET não configurado — seguindo sem validar');
    }

    const payload = JSON.parse(raw);
    const nomeEvento = payload?.event?.name || '';
    console.log('[webhook] evento:', nomeEvento, '| caminho no payload:', payload?.document?.path || '(sem path)');

    // Recusa: registra e encerra — não há PDF assinado para arquivar
    if (nomeEvento === 'refusal') {
      const chave = payload?.document?.key || payload?.event?.data?.document_key;
      const dados = payload?.event?.data || {};
      const quem = [dados?.user?.name, dados?.user?.email].filter(Boolean).join(' ');
      const motivos = Array.isArray(dados?.refusal?.reasons) ? dados.refusal.reasons.join('; ') : '';
      const comentario = dados?.refusal?.comment || '';
      const motivo = [quem, motivos, comentario].filter(Boolean).join(' — ') || 'sem motivo informado';
      console.log('[webhook] recusa registrada para', chave, ':', motivo);
      if (chave) {
        await atualizarTermo(chave, {
          status: 'recusado',
          motivoRecusa: motivo.slice(0, 500),
          recusadoEm: new Date().toISOString(),
        });
      }
      return new Response(JSON.stringify({ ok: true, recusado: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // só interessa quando o documento é finalizado (todos assinaram)
    if (!['auto_close', 'close', 'document_closed'].includes(nomeEvento)) {
      console.log('[webhook] evento ignorado (não é finalização):', nomeEvento);
      return new Response(JSON.stringify({ ignorado: nomeEvento }), { status: 200 });
    }

    const docPayload = payload?.document || payload?.event?.data?.document || {};
    const documentKey = docPayload?.key || payload?.event?.data?.document_key;
    if (!documentKey) return new Response('documento não identificado', { status: 200 });

    const prefixo = (Deno.env.get('CLICKSIGN_PATH_PREFIX') || 'inventario-ti').replace(/[^\w-]/g, '');
    const ignorar = (caminho: string) => {
      console.log(`[webhook] ignorado: caminho "${caminho}" não começa com /${prefixo}/`);
      return new Response(JSON.stringify({ ignorado: 'documento de outro setor', caminho }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // Descarte imediato: se o próprio aviso já traz o caminho e ele não é
    // deste app, encerramos aqui — sem consultar a API nem baixar nada
    if (docPayload?.path && !String(docPayload.path).startsWith(`/${prefixo}/`)) {
      return ignorar(docPayload.path);
    }

    // 2) Busca os dados do documento no Clicksign (link do PDF assinado).
    // O aviso chega no instante da última assinatura, mas o Clicksign leva
    // alguns segundos para montar o PDF final — por isso tentamos algumas
    // vezes até o link aparecer.
    const token = Deno.env.get('CLICKSIGN_TOKEN');
    const host =
      (Deno.env.get('CLICKSIGN_ENV') || 'production') === 'sandbox'
        ? 'https://sandbox.clicksign.com'
        : 'https://app.clicksign.com';

    const pegarUrlAssinada = (d: any): string =>
      d?.downloads?.signed_file_url || d?.downloads?.signed_file || d?.signed_file_url || '';

    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let det: any = null;
    let doc: any = docPayload;
    let signedUrl = pegarUrlAssinada(docPayload);

    // 5 tentativas em ~12s: tempo suficiente para o Clicksign montar o PDF
    // sem estourar o limite de espera do webhook
    for (let tentativa = 1; tentativa <= 5 && !signedUrl; tentativa++) {
      if (tentativa > 1) await espera(3000);
      det = await fetch(`${host}/api/v1/documents/${documentKey}?access_token=${token}`, {
        headers: { Accept: 'application/json' },
      }).then((r) => r.json());
      doc = det?.document || docPayload;
      // confirmado o caminho pela API, descarta documentos de outros setores
      // já na primeira volta — evita esperar à toa por algo que não é nosso
      if (tentativa === 1) {
        const p: string = doc?.path || docPayload?.path || '';
        if (!p.startsWith(`/${prefixo}/`)) return ignorar(p);
      }
      signedUrl = pegarUrlAssinada(doc);
      console.log(
        `[webhook] tentativa ${tentativa}: signed_file_url ${signedUrl ? 'disponível' : 'ainda não gerado'}` +
          (signedUrl ? '' : ` | downloads: ${JSON.stringify(doc?.downloads ?? null)}`)
      );
    }

    const caminho: string = doc?.path || docPayload?.path || '';

    if (!signedUrl) {
      console.error(
        '[webhook] o Clicksign não gerou o PDF assinado a tempo. Resposta:',
        JSON.stringify(det).slice(0, 800)
      );
      return new Response('PDF assinado ainda indisponível', { status: 200 });
    }

    const partes = caminho.split('/').filter(Boolean);
    const pastaUnidade = partes.length >= 3 ? partes[1] : 'Geral';
    const filename = partes.length ? partes[partes.length - 1] : `termo-${documentKey}.pdf`;
    console.log(`[webhook] arquivando "${filename}" na pasta "${pastaUnidade}"`);

    // 4) Baixa o PDF assinado e envia ao Drive compartilhado
    const pdf = new Uint8Array(await fetch(signedUrl).then((r) => r.arrayBuffer()));
    // aceita tanto o ID de um Drive compartilhado quanto o de uma pasta
    const raiz = Deno.env.get('GDRIVE_PARENT_FOLDER_ID') || Deno.env.get('GDRIVE_DRIVE_ID');
    if (!raiz) throw new Error('Configure GDRIVE_DRIVE_ID (ou GDRIVE_PARENT_FOLDER_ID) nos Secrets');
    const gtoken = await googleAccessToken();
    const pastaTermos = await ensureFolder(gtoken, raiz, 'Termos assinados');
    const pastaFinal = await ensureFolder(gtoken, pastaTermos, pastaUnidade);

    const existente = await arquivoJaExiste(gtoken, pastaFinal, filename);
    if (existente) {
      console.log('[webhook] arquivo já estava no Drive, nada a fazer. fileId:', existente);
      await atualizarTermo(documentKey, {
        status: 'assinado',
        driveFileId: existente,
        assinadoEm: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true, jaExistia: true, fileId: existente }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arquivo = await uploadPdf(gtoken, pastaFinal, filename, pdf);
    console.log('[webhook] SALVO no Drive. fileId:', arquivo.id);
    await atualizarTermo(documentKey, {
      status: 'assinado',
      driveFileId: arquivo.id,
      assinadoEm: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, pasta: pastaUnidade, fileId: arquivo.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // devolve 200 para o Clicksign não ficar reenviando em loop; o erro
    // fica registrado nos logs da função (Edge Functions → Logs)
    console.error('clicksign-webhook:', e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 200 });
  }
});
