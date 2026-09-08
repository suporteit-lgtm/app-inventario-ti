import { Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubHeader } from '../components/SubHeader';
import { Tela, TelaScroll } from '../components/Tela';
import { Avatar, Card, Checkbox, FieldLabel, Input, OutlineButton, PrimaryButton, Radio, SelectChip, SEM_AUTOCOMPLETAR } from '../components/ui';
import { EMAIL_EMPRESA, enviarParaAssinatura } from '../lib/clicksign';
import { confirmAsync } from '../lib/confirm';
import { sharePdf } from '../lib/export';
import { splitTemplate, termoHtml } from '../pdf/termo';
import { todayBR, useApp } from '../state/AppContext';
import { cidadeUfDaUnidade, equipNome, iniciais, invDisplay, isTemplateDevolucao, termoTitulo, TERMO_TEMPLATES_PADRAO } from '../types';

export const TermsScreen: React.FC = () => {
  const app = useApp();
  const { theme, db } = app;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [inv, setInv] = useState(app.inv);
  const [colabNome, setColabNome] = useState('');
  const [busca, setBusca] = useState('');
  const [selIds, setSelIds] = useState<string[]>([]);
  const [tplIdx, setTplIdx] = useState(0);
  // campos exclusivos do termo de devolução
  const [emailEx, setEmailEx] = useState('');
  const [estadoPerfeito, setEstadoPerfeito] = useState(true);
  const [avarias, setAvarias] = useState('');
  const [enviando, setEnviando] = useState(false);

  const templates = db.templates.length ? db.templates : TERMO_TEMPLATES_PADRAO;
  const template = templates[Math.min(tplIdx, templates.length - 1)];

  // Colaboradores APENAS da unidade selecionada para o termo
  const colabs = useMemo(() => {
    const map = new Map<string, { nome: string; setor: string }>();
    db.equipments
      .filter((e) => e.unidade === inv && e.usuario && e.usuario !== '—')
      .forEach((e) => {
        if (!map.has(e.usuario)) map.set(e.usuario, { nome: e.usuario, setor: e.departamento || '—' });
      });
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [db.equipments, inv]);

  const tokens = busca.toLowerCase().split(/\s+/).filter(Boolean);
  const colabsFiltrados = tokens.length
    ? colabs.filter((c) => tokens.every((t) => c.nome.toLowerCase().includes(t)))
    : colabs;

  const colabSel = colabs.find((c) => c.nome === colabNome);
  const pool = colabNome ? db.equipments.filter((e) => e.unidade === inv && e.usuario === colabNome) : [];
  const selecionados = pool.filter((e) => selIds.includes(e.id));
  const linhas = selecionados.map(
    (t) => `${equipNome(t)} — ${t.patrimonio} (S/N ${t.serial}${t.imei1 ? `, IMEI ${t.imei1}` : ''})`
  );
  const dadosColab = selecionados[0];
  const unidadeAtiva = db.inventories.find((i) => i.nome === inv);
  const termoData = {
    nome: colabNome || '________________',
    cpf: dadosColab?.cpfUsuario,
    departamento: dadosColab?.departamento || colabSel?.setor,
    linhas,
    empresa: unidadeAtiva?.nome,
    endereco: unidadeAtiva?.endereco,
    cnpjEmpresa: unidadeAtiva?.cnpj,
    responsavelTi: app.session?.nome,
    cpfResponsavelTi: app.session?.cpf,
    cidadeUf: unidadeAtiva
      ? cidadeUfDaUnidade(unidadeAtiva.nome, unidadeAtiva.endereco, unidadeAtiva.apelido)
      : undefined,
    emailEx,
    estadoPerfeito,
    avarias,
  };
  const preview = splitTemplate(template.content, termoData);

  // Campos sem valor viram linha pontilhada no PDF. Sem este aviso, o termo
  // sai "errado" em silêncio e não há como saber de onde vinha cada dado.
  const faltando = [
    !unidadeAtiva?.endereco?.trim() && { campo: 'endereço da unidade', onde: 'Configurações › Locais e unidades' },
    !unidadeAtiva?.cnpj?.trim() && { campo: 'CNPJ da unidade', onde: 'Configurações › Locais e unidades' },
    !dadosColab?.cpfUsuario?.trim() && { campo: 'CPF do colaborador', onde: 'Inventário › o equipamento › Editar › CPF do usuário' },
    !app.session?.cpf?.trim() && { campo: 'seu CPF (responsável de T.I.)', onde: 'Configurações › Meu CPF' },
  ].filter(Boolean) as { campo: string; onde: string }[];

  const next = () => {
    if (step === 1 && !colabNome) return app.showToast('Selecione um colaborador');
    if (step === 2 && !selIds.length) return app.showToast('Selecione ao menos um equipamento');
    setStep((s) => Math.min(3, s + 1));
  };

  const gerar = async () => {
    try {
      await sharePdf(
        termoHtml(template.name, template.content, termoData),
        `termo-${colabNome.toLowerCase().replace(/\s+/g, '-')}.pdf`
      );
      app.registerTermo({ colaborador: colabNome, template: template.name, equipamentos: linhas, data: todayBR() });
      // A baixa dos equipamentos é irreversível pelo app, então só é aplicada
      // após confirmação — se o compartilhamento do PDF for cancelado, nada muda
      if (isTemplateDevolucao(template.name)) {
        const ok = await confirmAsync(
          'Confirmar devolução',
          `Liberar ${selecionados.length} ${selecionados.length === 1 ? 'equipamento' : 'equipamentos'} de ${colabNome} para o estoque?`,
          'Confirmar'
        );
        if (!ok) return app.showToast('PDF gerado — devolução NÃO aplicada');
        await app.devolverEquipamentos(selecionados, colabNome);
        app.showToast('Termo gerado e equipamentos devolvidos ao estoque');
      } else {
        app.showToast('Termo gerado — pronto para assinatura');
      }
      setStep(1);
      setColabNome('');
      setSelIds([]);
      setEmailEx('');
      setEstadoPerfeito(true);
      setAvarias('');
    } catch {
      app.showToast('Falha ao gerar o PDF');
    }
  };

  const enviarAssinatura = async () => {
    if (enviando) return;
    const devolucao = isTemplateDevolucao(template.name);
    // no termo de devolução o e-mail é o pessoal digitado; nos demais, o do inventário
    const emailColab = devolucao ? emailEx.trim() : (dadosColab?.emailUsuario || '').trim();
    if (!emailColab.includes('@'))
      return app.showToast(
        devolucao ? 'Informe o e-mail pessoal do ex-colaborador' : 'O colaborador não tem e-mail cadastrado no equipamento'
      );
    if (!app.session?.email) return app.showToast('Sessão inválida — entre novamente');

    setEnviando(true);
    try {
      // pasta no Drive: nome curto da unidade, ou a cidade dela
      const pastaDrive =
        unidadeAtiva?.apelido?.trim() ||
        (unidadeAtiva
          ? cidadeUfDaUnidade(unidadeAtiva.nome, unidadeAtiva.endereco, unidadeAtiva.apelido).split('/')[0]
          : '') ||
        'Geral';
      const enviados = await enviarParaAssinatura({
        html: termoHtml(template.name, template.content, termoData),
        filename: `termo-${template.name.toLowerCase()}-${colabNome.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pasta: pastaDrive,
        mensagem: `${termoTitulo(template.name)} — ${colabNome}. Segue para assinatura eletrônica.`,
        signatarios: [
          { name: colabNome, email: emailColab, documentation: dadosColab?.cpfUsuario, sign_as: 'party' },
          { name: app.session.nome, email: app.session.email, documentation: app.session.cpf, sign_as: 'sign' },
        ],
      });
      app.registerTermo({ colaborador: colabNome, template: template.name, equipamentos: linhas, data: todayBR() });
      if (devolucao) {
        const ok = await confirmAsync(
          'Confirmar devolução',
          `Termo enviado para assinatura. Liberar ${selecionados.length} ${selecionados.length === 1 ? 'equipamento' : 'equipamentos'} de ${colabNome} para o estoque?`,
          'Confirmar'
        );
        if (ok) {
          await app.devolverEquipamentos(selecionados, colabNome);
          app.showToast(`Enviado para assinatura e equipamentos devolvidos (${enviados.length} e-mails)`);
        } else {
          app.showToast(`Enviado para assinatura — devolução NÃO aplicada (${enviados.length} e-mails)`);
        }
      } else {
        app.showToast(`Enviado para assinatura (${enviados.length} e-mails)`);
      }
      setStep(1);
      setColabNome('');
      setSelIds([]);
      setEmailEx('');
      setEstadoPerfeito(true);
      setAvarias('');
    } catch (e: any) {
      app.showToast(e?.message || 'Falha ao enviar para assinatura');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tela>
      <SubHeader />
      <TelaScroll contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 132, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                backgroundColor: n <= step ? theme.primary : theme.dark ? '#2a3a5c' : '#dbe2ec',
              }}
            />
          ))}
        </View>

        {step === 1 && (
          <>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>1. Selecione o colaborador</Text>
            <View>
              <FieldLabel>Unidade</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {app.allowedInvs.map((n) => (
                  <SelectChip
                    key={n}
                    label={invDisplay(db.inventories, n)}
                    active={inv === n}
                    onPress={() => {
                      setInv(n);
                      setColabNome('');
                      setSelIds([]);
                    }}
                  />
                ))}
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                height: 44,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.line,
                borderRadius: 12,
                paddingHorizontal: 12,
              }}
            >
              <Search size={17} color={theme.muted2} strokeWidth={2} />
              <TextInput
                {...SEM_AUTOCOMPLETAR}
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar colaborador pelo nome…"
                placeholderTextColor={theme.muted2}
                style={{ flex: 1, fontSize: 14, color: theme.text, minWidth: 0, paddingVertical: 0 }}
              />
            </View>
            {colabsFiltrados.length === 0 && (
              <Text style={{ fontSize: 13, color: theme.muted, textAlign: 'center', paddingVertical: 12 }}>
                Nenhum colaborador com equipamentos em {inv}.
              </Text>
            )}
            <View style={{ gap: 8 }}>
              {colabsFiltrados.map((c) => {
                const qtd = db.equipments.filter((e) => e.unidade === inv && e.usuario === c.nome).length;
                const active = colabNome === c.nome;
                return (
                  <Pressable
                    key={c.nome}
                    onPress={() => {
                      setColabNome(active ? '' : c.nome);
                      setSelIds([]);
                    }}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                      backgroundColor: theme.card,
                      borderWidth: 1.5,
                      borderColor: active ? theme.primary : theme.line,
                      borderRadius: 14,
                      padding: 12,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Avatar text={iniciais(c.nome)} size={40} bg={theme.chip} fg={theme.chipFg} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{c.nome}</Text>
                      <Text style={{ fontSize: 12, color: theme.muted }}>
                        {c.setor} · {qtd} {qtd === 1 ? 'equipamento' : 'equipamentos'}
                      </Text>
                    </View>
                    <Radio on={active} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>2. Equipamentos de {colabNome}</Text>
            {pool.length === 0 && (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: theme.dash,
                  borderRadius: 14,
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                }}
              >
                <Text style={{ textAlign: 'center', fontSize: 13.5, color: theme.muted }}>
                  Nenhum equipamento está no nome deste colaborador no inventário.
                </Text>
              </View>
            )}
            <View style={{ gap: 8 }}>
              {pool.map((it) => {
                const on = selIds.includes(it.id);
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => setSelIds((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : [...s, it.id]))}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                      backgroundColor: theme.card,
                      borderWidth: 1.5,
                      borderColor: on ? theme.primary : theme.line,
                      borderRadius: 14,
                      padding: 12,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Checkbox on={on} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text }}>{equipNome(it)}</Text>
                      <Text style={{ fontSize: 12, color: theme.muted }}>
                        {it.patrimonio} · {it.serial}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label="Voltar" onPress={() => setStep(1)} style={{ flex: 1 }} />
              <PrimaryButton label="Revisar termo" onPress={next} disabled={!selIds.length} style={{ flex: 2 }} />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>3. Revisar e gerar</Text>
            <View>
              <FieldLabel>Template do termo</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {templates.map((t, i) => (
                  <SelectChip key={t.name + i} label={t.name} active={tplIdx === i} onPress={() => setTplIdx(i)} />
                ))}
              </View>
              {isTemplateDevolucao(template.name) ? (
                <Text style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>
                  Ao gerar este termo, os equipamentos selecionados serão desvinculados do colaborador e devolvidos ao
                  estoque automaticamente.
                </Text>
              ) : null}
            </View>

            {isTemplateDevolucao(template.name) && (
              <View style={{ gap: 12 }}>
                <View>
                  <FieldLabel>E-mail pessoal do ex-colaborador (envio do termo)</FieldLabel>
                  <Input
                    value={emailEx}
                    onChangeText={setEmailEx}
                    placeholder="email.pessoal@gmail.com"
                    mascara="email"
                  />
                </View>
                <View>
                  <FieldLabel>Estado dos equipamentos na vistoria</FieldLabel>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <SelectChip label="Perfeito estado" active={estadoPerfeito} onPress={() => setEstadoPerfeito(true)} />
                    <SelectChip label="Com avarias / faltas" active={!estadoPerfeito} onPress={() => setEstadoPerfeito(false)} />
                  </View>
                </View>
                {!estadoPerfeito && (
                  <View>
                    <FieldLabel>Descrição das avarias, faltas ou observações</FieldLabel>
                    <TextInput
                      {...SEM_AUTOCOMPLETAR}
                      value={avarias}
                      onChangeText={setAvarias}
                      placeholder="Ex.: tela trincada, sem carregador…"
                      placeholderTextColor={theme.muted2}
                      multiline
                      style={{
                        width: '100%',
                        height: 74,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.bd,
                        backgroundColor: theme.card,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: theme.text,
                        textAlignVertical: 'top',
                      }}
                    />
                  </View>
                )}
              </View>
            )}
            {faltando.length > 0 && (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.dark ? theme.tintbd : '#9db4d8',
                  backgroundColor: theme.tint,
                  padding: 12,
                  paddingHorizontal: 14,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.chipFg }}>
                  {faltando.length === 1 ? 'Um campo sairá em branco' : `${faltando.length} campos sairão em branco`}
                </Text>
                {faltando.map((f) => (
                  <Text key={f.campo} style={{ fontSize: 12.5, lineHeight: 19, color: theme.chipFg }}>
                    • {f.campo} — preencha em {f.onde}
                  </Text>
                ))}
              </View>
            )}

            <Card style={{ padding: 20, paddingHorizontal: 18 }}>
              <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 13.5, color: theme.text, marginBottom: 10 }}>
                {preview.titulo || termoTitulo(template.name)}
              </Text>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: theme.text2 }}>{preview.pre}</Text>
              <View style={{ marginVertical: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.code, borderRadius: 10 }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 11.5, lineHeight: 18, color: theme.text2 }}>
                  {linhas.length ? linhas.join('\n') : 'Nenhum equipamento selecionado'}
                </Text>
              </View>
              {preview.pos ? <Text style={{ fontSize: 12.5, lineHeight: 20, color: theme.text2 }}>{preview.pos}</Text> : null}
            </Card>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label="Voltar" onPress={() => setStep(2)} style={{ flex: 1 }} />
              <PrimaryButton label="Gerar PDF" onPress={gerar} style={{ flex: 2 }} />
            </View>
            <OutlineButton
              label={enviando ? 'Enviando…' : 'Enviar para assinatura (Clicksign)'}
              onPress={enviarAssinatura}
              height={48}
            />
            <Text style={{ fontSize: 11.5, color: theme.muted2, textAlign: 'center', marginTop: -4 }}>
              Envia por e-mail para o colaborador, para você e para {EMAIL_EMPRESA}
            </Text>
          </>
        )}
      </TelaScroll>

      {step === 1 && !!colabNome && (
        <View
          style={{
            position: 'absolute',
            left: 18,
            right: 18,
            bottom: Math.max(insets.bottom, 12) + 100,
            shadowColor: theme.primary,
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <PrimaryButton label={`Continuar com ${colabNome.split(' ')[0]}`} height={50} onPress={next} />
        </View>
      )}
    </Tela>
  );
};
