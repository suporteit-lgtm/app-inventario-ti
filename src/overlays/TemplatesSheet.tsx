import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { FieldLabel, Input, PrimaryButton, SelectChip } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { TermoTemplateDB, TERMO_TEMPLATES_PADRAO } from '../types';

export const TemplatesSheet: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db } = app;
  const visible = nav.cfgSheet === 'templates';

  const templates = db.templates.length ? db.templates : TERMO_TEMPLATES_PADRAO;
  const [idx, setIdx] = useState(0);
  const [nome, setNome] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [novo, setNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNovo(false);
    setIdx(0);
    const t = templates[0];
    setNome(t?.name || '');
    setConteudo(t?.content || '');
  }, [visible]);

  const selecionar = (i: number) => {
    setIdx(i);
    setNovo(false);
    setNome(templates[i].name);
    setConteudo(templates[i].content);
  };

  const novoTemplate = () => {
    setNovo(true);
    setNome('');
    setConteudo(
      'Eu, {NOME}, declaro ..., referente aos equipamentos abaixo:\n\n{EQUIPAMENTOS}\n\nData: {DATA}   ·   Assinatura: ____________________'
    );
  };

  const salvar = async () => {
    if (!nome.trim() || !conteudo.trim()) return app.showToast('Preencha o nome e o texto do termo');
    setSalvando(true);
    try {
      const t: TermoTemplateDB = { id: novo ? null : templates[idx].id, name: nome.trim(), content: conteudo };
      await app.saveTemplate(t);
      app.showToast('Template salvo');
      nav.setCfgSheet('');
    } catch {
      app.showToast('Falha ao salvar o template');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => nav.setCfgSheet('')}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
          Templates de termos
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 12 }}>
          Marcadores substituídos ao gerar o PDF: {'{NOME}'}, {'{CPF}'}, {'{DEPARTAMENTO}'}, {'{EQUIPAMENTOS}'},{' '}
          {'{DATA}'}, {'{DATA_EXTENSO}'}, {'{EMPRESA}'}, {'{CNPJ_EMPRESA}'}, {'{ENDERECO}'}, {'{RESPONSAVEL_TI}'} e{' '}
          {'{CPF_RESPONSAVEL_TI}'} (usuário logado que está gerando). Termos com "devolução" no nome devolvem os
          equipamentos ao estoque ao serem gerados.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingBottom: 12 }}>
          {templates.map((t, i) => (
            <SelectChip key={t.name + i} label={t.name} active={!novo && idx === i} onPress={() => selecionar(i)} />
          ))}
          <SelectChip label="+ Novo" active={novo} onPress={novoTemplate} />
        </View>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>Nome do termo</FieldLabel>
            <Input placeholder="Ex.: Responsabilidade" value={nome} onChangeText={setNome} />
          </View>
          <View>
            <FieldLabel>Texto do termo</FieldLabel>
            <TextInput
              value={conteudo}
              onChangeText={setConteudo}
              multiline
              placeholderTextColor={theme.muted2}
              style={{
                width: '100%',
                height: 180,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.bd,
                backgroundColor: theme.card,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 13,
                lineHeight: 19,
                color: theme.text,
                textAlignVertical: 'top',
              }}
            />
          </View>
          <PrimaryButton label={salvando ? 'Salvando…' : 'Salvar template'} onPress={salvar} />
        </View>
      </ScrollView>
    </Sheet>
  );
};
