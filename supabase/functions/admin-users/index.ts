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

// Devolvido quando o banco recusa a coluna "cpf". Antes o CPF era
// descartado em silêncio e a tela dizia "usuário atualizado".
// Carrega a mensagem ORIGINAL do banco: sem ela sobra só palpite sobre o
// motivo — coluna ausente, cache velho, permissão, constraint…
const avisoCpf = (motivo: string) =>
  'Usuário salvo, mas o CPF não. O banco recusou a coluna "cpf": ' + motivo;

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

    const { action, email, novoEmail, novaSenha, perfil, nome, allowedUnitIds } = await req.json();

    // Grava na tabela "User" usando a service_role. É isto que permite
    // fechar a tabela para o app: o cargo e os acessos passam a só mudar
    // por aqui, depois da checagem de administrador feita acima.
    // Se o banco recusar a coluna "cpf", grava o resto para não perder a
    // edição — mas DEVOLVE o aviso. Antes essa segunda tentativa zerava o
    // erro e o CPF sumia sem que a tela soubesse.
    const gravarPerfil = async (
      op: 'insert' | 'update',
      dados: Record<string, unknown>,
      alvoEmail?: string
    ) => {
      // select('*') e não uma lista de colunas: pedir "cpf" por nome faria
      // o próprio select falhar quando é justamente essa coluna que falta.
      // O retorno permite conferir se alguma linha foi atingida.
      const exec = async (d: Record<string, unknown>) =>
        op === 'insert'
          ? await admin.from('User').insert(d).select('*')
          : await admin.from('User').update(d).ilike('email', alvoEmail!).select('*');

      let { data, error } = await exec(dados);
      let motivoCpf = '';
      if (error && /cpf/i.test(error.message)) {
        const original = error.message;
        const { cpf: _ignorado, ...semCpf } = dados;
        ({ data, error } = await exec(semCpf));
        if (!error) motivoCpf = original;
      }
      if (error) return { error, motivoCpf: '', nenhumaLinha: false };

      // Um update que não casa nenhuma linha NÃO é erro para o PostgREST:
      // sem esta checagem, "nada foi salvo" chega à tela como sucesso.
      const nenhumaLinha = !data || data.length === 0;

      // Última rede: linha gravada, mas o CPF voltou vazio (trigger, regra
      // ou coluna gerada mexendo no valor).
      const gravado = (data || [])[0] as { cpf?: string | null } | undefined;
      if (!motivoCpf && !nenhumaLinha && dados.cpf && gravado && !gravado.cpf) {
        motivoCpf = 'a linha foi gravada, mas o banco devolveu o campo cpf vazio';
      }
      return { error, motivoCpf, nenhumaLinha };
    };

    // Acessos por inventário (tela de Permissões). Identifica pelo nome,
    // que é como o app já faz.
    if (action === 'set-access') {
      if (!nome) return json({ error: 'Parâmetros inválidos' }, 400);
      const { error } = await admin
        .from('User')
        .update({ allowedUnitIds: Array.isArray(allowedUnitIds) && allowedUnitIds.length ? allowedUnitIds : null })
        .eq('name', nome);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

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
      // "perfil" só vem das versões novas do app; sem ele a função se
      // comporta como antes e o app grava a linha por conta própria.
      if (perfil) {
        const { error: erroPerfil, motivoCpf } = await gravarPerfil('insert', perfil);
        if (erroPerfil) {
          // desfaz o login para não deixar usuário órfão no Auth
          const { data: l2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const criado = l2?.users?.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
          if (criado) await admin.auth.admin.deleteUser(criado.id);
          return json({ error: 'Login criado, mas falhou ao salvar o perfil: ' + erroPerfil.message }, 400);
        }
        if (motivoCpf) return json({ ok: true, aviso: avisoCpf(motivoCpf) });
      }
      return json({ ok: true });
    }

    if (action === 'delete') {
      if (target) await admin.auth.admin.deleteUser(target.id);
      await admin.from('User').delete().ilike('email', email);
      return json({ ok: true });
    }

    if (action === 'update') {
      // Só exige o login no Auth quando há e-mail/senha para alterar;
      // atualizar apenas o perfil funciona mesmo sem login correspondente.
      if (novoEmail || novaSenha) {
        if (!target) return json({ error: 'Login não encontrado no Supabase Auth' }, 404);
        // email_confirm sempre true: também "destrava" usuários criados
        // enquanto a confirmação por e-mail estava ligada
        const attrs: Record<string, unknown> = { email_confirm: true };
        if (novoEmail) attrs.email = novoEmail;
        if (novaSenha) attrs.password = novaSenha;
        const { error } = await admin.auth.admin.updateUserById(target.id, attrs);
        if (error) return json({ error: error.message }, 400);
      }
      if (perfil) {
        const { error: erroPerfil, motivoCpf, nenhumaLinha } = await gravarPerfil('update', perfil, email);
        if (erroPerfil) return json({ error: 'Falha ao salvar o usuário: ' + erroPerfil.message }, 400);
        if (nenhumaLinha) {
          return json({ error: 'Nada foi salvo: nenhuma linha da tabela "User" tem o e-mail ' + email }, 400);
        }
        if (motivoCpf) return json({ ok: true, aviso: avisoCpf(motivoCpf) });
      }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
