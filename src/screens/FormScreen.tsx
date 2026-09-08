import { QrCode } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SubHeader } from '../components/SubHeader';
import { Tela, TelaScroll } from '../components/Tela';
import { FieldLabel, Input, PrimaryButton, SelectChip, SEM_AUTOCOMPLETAR } from '../components/ui';
import { cpfValido, dataValida, emailValido } from '../lib/mascaras';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import {
  CONDICOES,
  CONDICOES_LINHA,
  emptyForm,
  EquipForm,
  EQUIP_STATUS,
  isCelular,
  isLinha,
  isNotebook,
} from '../types';

const Field: React.FC<{ label: string; children: React.ReactNode; flex?: boolean }> = ({ label, children, flex }) => (
  <View style={flex ? { flex: 1, minWidth: 0 } : undefined}>
    <FieldLabel>{label}</FieldLabel>
    {children}
  </View>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
);

export const FormScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme } = app;
  const editing = nav.editing;
  const original = editing ? app.db.equipments.find((e) => e.id === nav.selId) : null;

  const [form, setForm] = useState<EquipForm>(() =>
    original
      ? {
          ...emptyForm(),
          tipo: original.tipo,
          marca: original.marca,
          modelo: original.modelo,
          serial: original.serial === '—' ? '' : original.serial,
          patrimonio: original.patrimonio,
          local: original.local === '—' ? '' : original.local,
          usuario: original.usuario === '—' ? '' : original.usuario,
          obs: original.obs || '',
          status: original.status,
          foto: original.foto || null,
          cor: original.cor || '',
          configuracao: original.configuracao || '',
          condicao: original.condicao || '',
          propriedade: original.propriedade || '',
          fornecedor: original.fornecedor || '',
          emailUsuario: original.emailUsuario || '',
          cpfUsuario: original.cpfUsuario || '',
          departamento: original.departamento || '',
          gestor: original.gestor || '',
          compra: original.compra === '—' ? '' : original.compra,
          entrega: original.entrega || '',
          garantia: original.garantia === '—' ? '' : original.garantia,
          conferencia: original.conferencia || '',
          valor: original.valor || '',
          acessorios: original.acessorios || '',
          imei1: original.imei1 || '',
          imei2: original.imei2 || '',
          mac: original.mac || '',
          pelicula: original.pelicula || '',
          capa: original.capa || '',
          operadora: original.operadora || '',
          plano: original.plano || '',
          portabilidade: original.portabilidade || '',
          iccid: original.iccid || '',
          telefone: original.telefone || '',
          usuarioAntigo: original.usuarioAntigo || '',
        }
      : emptyForm()
  );

  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof EquipForm, v: string | null) => setForm((f) => ({ ...f, [k]: v as any }));
  const celular = isCelular(form.tipo);
  const notebook = isNotebook(form.tipo);
  const linha = isLinha(form.tipo);
  const condicoes = linha ? CONDICOES_LINHA : CONDICOES;

  const save = async () => {
    if (salvando) return;
    if (!editing) {
      if (!form.usuario.trim()) return app.showToast('Informe o nome do responsável');
      if (!form.cpfUsuario.trim()) return app.showToast('Informe o CPF do responsável');
      if (!emailValido(form.emailUsuario)) return app.showToast('Informe um e-mail válido do responsável');
    }
    if (form.cpfUsuario.trim() && !cpfValido(form.cpfUsuario)) return app.showToast('CPF do responsável é inválido');
    for (const [rotulo, valor] of [
      ['Data de aquisição', form.compra],
      ['Entrega ao usuário', form.entrega],
      ['Garantia', form.garantia],
      ['Última conferência', form.conferencia],
    ] as [string, string][]) {
      if (valor.trim() && !dataValida(valor)) return app.showToast(`${rotulo}: data inválida`);
    }
    setSalvando(true);
    try {
      const saved = await app.saveEquipment(form, editing ? nav.selId : null);
      app.showToast(editing ? 'Alterações salvas' : 'Equipamento cadastrado');
      nav.openItem(saved.id);
    } catch (e: any) {
      app.showToast(e?.message || 'Não foi possível salvar o equipamento');
    } finally {
      setSalvando(false);
    }
  };

  /* --------------------- blocos comuns aos dois formulários -------------------- */

  const blocoTipo = (
    <Field label="Tipo / Categoria">
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(app.db.categorias.length ? app.db.categorias : ['Notebook']).map((t) => (
          <SelectChip key={t} label={t} active={form.tipo === t} onPress={() => set('tipo', t)} />
        ))}
      </View>
    </Field>
  );

  const blocoStatusCondicao = (
    <>
      <Field label="Status do ativo">
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {EQUIP_STATUS.map((s) => (
            <SelectChip key={s} label={s} active={form.status === s} onPress={() => set('status', s)} />
          ))}
        </View>
      </Field>
      <Field label="Condição">
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {condicoes.map((c) => (
            <SelectChip key={c} label={c} active={form.condicao === c} onPress={() => set('condicao', c)} />
          ))}
        </View>
      </Field>
    </>
  );

  const blocoResponsavel = (
    <>
      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.muted, marginTop: 4 }}>
        Responsável atual (quando em uso)
      </Text>
      {linha && (
        <Field label="Usuário antigo">
          <Input placeholder="Quem usava a linha antes" value={form.usuarioAntigo} onChangeText={(v) => set('usuarioAntigo', v)} />
        </Field>
      )}
      <Field label={editing ? 'Usuário atual' : 'Usuário atual *'}>
        <Input placeholder="Nome do colaborador" value={form.usuario} onChangeText={(v) => set('usuario', v)} />
      </Field>
      <Row>
        <Field label={editing ? 'E-mail do usuário' : 'E-mail do usuário *'} flex>
          <Input placeholder="email@locgrupo.com.br" mascara="email" value={form.emailUsuario} onChangeText={(v) => set('emailUsuario', v)} />
        </Field>
        <Field label={editing ? 'CPF do usuário' : 'CPF do usuário *'} flex>
          <Input placeholder="000.000.000-00" mascara="cpf" value={form.cpfUsuario} onChangeText={(v) => set('cpfUsuario', v)} />
        </Field>
      </Row>
      <Row>
        <Field label="Departamento" flex>
          <Input placeholder="Financeiro" value={form.departamento} onChangeText={(v) => set('departamento', v)} />
        </Field>
        <Field label="Gestor" flex>
          <Input placeholder="Nome do gestor" value={form.gestor} onChangeText={(v) => set('gestor', v)} />
        </Field>
      </Row>
    </>
  );

  const blocoObs = (
    <Field label="Observações">
      <TextInput
        placeholder="Ex.: defeitos, riscos, tela com mancha, bateria fraca…"
        placeholderTextColor={theme.muted2}
        {...SEM_AUTOCOMPLETAR}
        value={form.obs}
        onChangeText={(v) => set('obs', v)}
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
    </Field>
  );

  return (
    <Tela>
      <SubHeader titleOverride={editing ? 'Editar equipamento' : 'Novo equipamento'} />
      <TelaScroll contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 132, gap: 14 }}>
        {blocoTipo}

        {linha ? (
          /* ----------------------- LINHAS CORPORATIVAS ----------------------- */
          <>
            <Row>
              <Field label="ID Operadora" flex>
                <Input placeholder="Vivo, Claro, TIM…" value={form.operadora} onChangeText={(v) => set('operadora', v)} />
              </Field>
              <Field label="Plano" flex>
                <Input placeholder="Ex.: 20 GB + ilimitado" value={form.plano} onChangeText={(v) => set('plano', v)} />
              </Field>
            </Row>

            <Field label="Portabilidade">
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {['Sim', 'Não', 'Em andamento'].map((p) => (
                  <SelectChip key={p} label={p} active={form.portabilidade === p} onPress={() => set('portabilidade', p)} />
                ))}
              </View>
            </Field>

            <Row>
              <Field label="ICCID" flex>
                <Input placeholder="Nº do chip" mascara="maiuscula" value={form.iccid} onChangeText={(v) => set('iccid', v)} />
              </Field>
              <Field label="Número de telefone" flex>
                <Input placeholder="(00) 00000-0000" mascara="telefone" value={form.telefone} onChangeText={(v) => set('telefone', v)} />
              </Field>
            </Row>

            {blocoStatusCondicao}

            <Row>
              <Field label="Fornecedor" flex>
                <Input placeholder="Fornecedor" value={form.fornecedor} onChangeText={(v) => set('fornecedor', v)} />
              </Field>
              <Field label="Unidade" flex>
                <Input value={app.inv} editable={false} style={{ opacity: 0.6 }} />
              </Field>
            </Row>

            {blocoResponsavel}

            <Row>
              <Field label="Data de aquisição" flex>
                <Input placeholder="dd/mm/aaaa" mascara="data" value={form.compra} onChangeText={(v) => set('compra', v)} />
              </Field>
              <Field label="Entrega ao usuário" flex>
                <Input placeholder="dd/mm/aaaa" mascara="data" value={form.entrega} onChangeText={(v) => set('entrega', v)} />
              </Field>
            </Row>

            {blocoObs}
          </>
        ) : (
          /* -------------------------- DEMAIS EQUIPAMENTOS -------------------------- */
          <>
            <Row>
              <Field label="Marca" flex>
                <Input placeholder="Dell" value={form.marca} onChangeText={(v) => set('marca', v)} />
              </Field>
              <Field label="Modelo" flex>
                <Input placeholder="Latitude 5440" value={form.modelo} onChangeText={(v) => set('modelo', v)} />
              </Field>
            </Row>

            <Row>
              <Field label="Cor" flex>
                <Input placeholder="Preto" value={form.cor} onChangeText={(v) => set('cor', v)} />
              </Field>
              <Field label="Configuração" flex>
                <Input placeholder="i5 · 16GB · 256GB" value={form.configuracao} onChangeText={(v) => set('configuracao', v)} />
              </Field>
            </Row>

            {celular && (
              <>
                <Row>
                  <Field label="Película" flex>
                    <Input placeholder="Sim / Não" value={form.pelicula} onChangeText={(v) => set('pelicula', v)} />
                  </Field>
                  <Field label="Capa" flex>
                    <Input placeholder="Sim / Não" value={form.capa} onChangeText={(v) => set('capa', v)} />
                  </Field>
                </Row>
                <Row>
                  <Field label="IMEI 1" flex>
                    <Input placeholder="15 dígitos" mascara="imei" value={form.imei1} onChangeText={(v) => set('imei1', v)} />
                  </Field>
                  <Field label="IMEI 2" flex>
                    <Input placeholder="15 dígitos" mascara="imei" value={form.imei2} onChangeText={(v) => set('imei2', v)} />
                  </Field>
                </Row>
              </>
            )}

            {(celular || notebook) && (
              <Field label="Endereço MAC">
                <Input placeholder="AA:BB:CC:DD:EE:FF" mascara="mac" value={form.mac} onChangeText={(v) => set('mac', v)} />
              </Field>
            )}

            <Field label="Nº de série">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input
                  placeholder="BRJ0K33"
                  mascara="maiuscula"
                  value={form.serial}
                  onChangeText={(v) => set('serial', v)}
                  style={{ flex: 1, width: undefined }}
                />
                <Pressable
                  onPress={() => app.showToast('Leitura de QR indisponível no momento')}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.bd,
                    backgroundColor: theme.chip,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.55,
                  }}
                >
                  <QrCode size={20} color={theme.muted2} strokeWidth={1.8} />
                </Pressable>
              </View>
            </Field>

            <Row>
              <Field label="Patrimônio" flex>
                <Input placeholder="PAT-0000" mascara="maiuscula" value={form.patrimonio} onChangeText={(v) => set('patrimonio', v)} />
              </Field>
              <Field label="Localização" flex>
                <Input placeholder="Matriz — 2º andar" value={form.local} onChangeText={(v) => set('local', v)} />
              </Field>
            </Row>

            {blocoStatusCondicao}

            <Row>
              <Field label="Propriedade" flex>
                <Input placeholder="Própria / Alugada" value={form.propriedade} onChangeText={(v) => set('propriedade', v)} />
              </Field>
              <Field label="Fornecedor" flex>
                <Input placeholder="Fornecedor" value={form.fornecedor} onChangeText={(v) => set('fornecedor', v)} />
              </Field>
            </Row>

            {blocoResponsavel}

            <Row>
              <Field label="Data de aquisição" flex>
                <Input placeholder="dd/mm/aaaa" mascara="data" value={form.compra} onChangeText={(v) => set('compra', v)} />
              </Field>
              <Field label="Entrega ao usuário" flex>
                <Input placeholder="dd/mm/aaaa" mascara="data" value={form.entrega} onChangeText={(v) => set('entrega', v)} />
              </Field>
            </Row>

            <Row>
              <Field label="Garantia (data final)" flex>
                <Input placeholder="dd/mm/aaaa" mascara="data" value={form.garantia} onChangeText={(v) => set('garantia', v)} />
              </Field>
              <Field label="Última conferência" flex>
                <Input placeholder="dd/mm/aaaa" mascara="data" value={form.conferencia} onChangeText={(v) => set('conferencia', v)} />
              </Field>
            </Row>

            <Field label="Valor (R$)">
              <Input placeholder="0,00" mascara="moeda" value={form.valor} onChangeText={(v) => set('valor', v)} />
            </Field>

            <Field label="Acessórios / itens inclusos">
              <Input placeholder="Ex.: Carregador, Capa, Fonte, Adaptador" value={form.acessorios} onChangeText={(v) => set('acessorios', v)} />
            </Field>

            {blocoObs}
          </>
        )}

        <PrimaryButton
          label={salvando ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar equipamento'}
          height={50}
          onPress={save}
          disabled={salvando}
          style={{ marginTop: 4 }}
        />
      </TelaScroll>
    </Tela>
  );
};
