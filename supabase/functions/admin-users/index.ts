// Função Edge "admin-users" — operações privilegiadas de usuários
// (alterar e-mail/senha de outros usuários e excluir logins), permitidas
// apenas para administradores do app.
//
// Como publicar (uma vez, ~2 min):
//   Painel do Supabase → Edge Functions → Deploy a new function →
//   nome: admin-users → cole este arquivo inteiro → Deploy.
// Nada mais é preciso: as chaves (service role) já ficam disponíveis
// automaticamente dentro da função.

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user?.email) return json({ error: 'Não autenticado' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: caller } = await admin.from('User').select('role').ilike('email', user.email).maybeSingle();
    if (!caller || !String(caller.role).toUpperCase().includes('ADMIN')) {
      return json({ error: 'Apenas administradores podem gerenciar usuários' }, 403);
    }

    const { action, email, novoEmail, novaSenha } = await req.json();
    if (!action || !email) return json({ error: 'Parâmetros inválidos' }, 400);

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = list?.users?.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());

    // Cria um login já CONFIRMADO (não depende de e-mail de confirmação)
    if (action === 'create') {
      if (target) return json({ error: 'E-mail já possui login cadastrado' }, 400);
      const { error } = await admin.auth.admin.createUser({
        email,
        password: novaSenha,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'delete') {
      if (target) await admin.auth.admin.deleteUser(target.id);
      await admin.from('User').delete().ilike('email', email);
      return json({ ok: true });
    }

    if (action === 'update') {
      if (!target) return json({ error: 'Login não encontrado no Supabase Auth' }, 404);
      // email_confirm sempre true: também "destrava" usuários criados
      // enquanto a confirmação por e-mail estava ligada
      const attrs: Record<string, unknown> = { email_confirm: true };
      if (novoEmail) attrs.email = novoEmail;
      if (novaSenha) attrs.password = novaSenha;
      const { error } = await admin.auth.admin.updateUserById(target.id, attrs);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
