import { ExternalLink } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { SubHeader } from '../components/SubHeader';
import { Card, SelectChip } from '../components/ui';
import { useApp } from '../state/AppContext';
import { invDisplay, linkDoDrive, TermoEnvio, TermoStatus } from '../types';

/** "não enviado" não existe no banco: é a ausência de termo para quem tem equipamento. */
type Situacao = TermoStatus | 'nao_enviado';

interface Linha {
  colaborador: string;
  unidade: string;
  equipamentos: number;
  termo: TermoEnvio | null;
}

const ROTULO: Record<Situacao, string> = {
  assinado: 'Assinado',
  enviado: 'Aguardando assinatura',
  recusado: 'Recusado',
  nao_enviado: 'Termo não enviado',
};

const COR: Record<Situacao, string> = {
  assinado: '#16a34a',
  enviado: '#2563eb',
  recusado: '#dc2626',
  nao_enviado: '#f59e0b',
};

// Pendência primeiro: quem precisa de ação aparece no topo da lista
const ORDEM: Situacao[] = ['nao_enviado', 'recusado', 'enviado', 'assinado'];

const dataBR = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
};

const situacaoDe = (l: Linha): Situacao => l.termo?.status ?? 'nao_enviado';

export const TermosStatusScreen: React.FC = () => {
  const app = useApp();
  const { theme, db } = app;
  const [filtro, setFiltro] = useState<Situacao | 'todos'>('todos');

  const linhas = useMemo(() => {
    const porColab = new Map<string, Linha>();
    const permitida = (u?: string) => !u || app.allowedInvs.includes(u);

    // Quem está com equipamento hoje — a base de quem DEVERIA ter termo
    db.equipments.forEach((e) => {
      if (!e.usuario || e.usuario === '—' || !permitida(e.unidade)) return;
      const atual = porColab.get(e.usuario) || {
        colaborador: e.usuario,
        unidade: e.unidade,
        equipamentos: 0,
        termo: null,
      };
      atual.equipamentos += 1;
      porColab.set(e.usuario, atual);
    });

    // Termos já enviados. A lista vem do mais novo para o mais antigo, então
    // o primeiro de cada pessoa é o termo que vale.
    db.termos.forEach((t) => {
      if (!permitida(t.unidade)) return;
      const atual = porColab.get(t.colaborador) || {
        colaborador: t.colaborador,
        unidade: t.unidade || '—',
        equipamentos: 0,
        termo: null,
      };
      if (!atual.termo) atual.termo = t;
      porColab.set(t.colaborador, atual);
    });

    return [...porColab.values()].sort((a, b) => {
      const d = ORDEM.indexOf(situacaoDe(a)) - ORDEM.indexOf(situacaoDe(b));
      return d !== 0 ? d : a.colaborador.localeCompare(b.colaborador);
    });
  }, [db.equipments, db.termos, app.allowedInvs]);

  const contagem = useMemo(() => {
    const c: Record<Situacao, number> = { assinado: 0, enviado: 0, recusado: 0, nao_enviado: 0 };
    linhas.forEach((l) => (c[situacaoDe(l)] += 1));
    return c;
  }, [linhas]);

  const visiveis = filtro === 'todos' ? linhas : linhas.filter((l) => situacaoDe(l) === filtro);

  const abrirDrive = async (fileId?: string) => {
    const url = linkDoDrive(fileId);
    if (!url) return app.showToast('Este termo não tem arquivo no Drive');
    try {
      await Linking.openURL(url);
    } catch {
      app.showToast('Não foi possível abrir o Drive');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader />
      <FlatList
        data={visiveis}
        keyExtractor={(l) => l.colaborador}
        contentContainerStyle={{ gap: 8, padding: 18, paddingTop: 14, paddingBottom: 132 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <SelectChip
              label={'Todos (' + linhas.length + ')'}
              active={filtro === 'todos'}
              onPress={() => setFiltro('todos')}
            />
            {ORDEM.map((s) => (
              <SelectChip
                key={s}
                label={ROTULO[s] + ' (' + contagem[s] + ')'}
                active={filtro === s}
                onPress={() => setFiltro(s)}
              />
            ))}
          </View>
        }
        ListEmptyComponent={
          <Text style={{ fontSize: 13, color: theme.muted, textAlign: 'center', paddingVertical: 24 }}>
            Nenhum colaborador nesta situação.
          </Text>
        }
        renderItem={({ item: l }) => {
          const s = situacaoDe(l);
          const t = l.termo;
          const quando =
            s === 'assinado' ? dataBR(t?.assinadoEm) : s === 'recusado' ? dataBR(t?.recusadoEm) : dataBR(t?.enviadoEm);
          return (
            <Card style={{ padding: 13, paddingHorizontal: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COR[s] }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                    {l.colaborador}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted, marginTop: 1 }}>
                    {invDisplay(db.inventories, l.unidade)}
                    {l.equipamentos ? ' · ' + l.equipamentos + ' equip.' : ''}
                    {t?.template ? ' · ' + t.template : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: COR[s] }}>{ROTULO[s]}</Text>
                  {quando ? <Text style={{ fontSize: 11, color: theme.muted2, marginTop: 1 }}>{quando}</Text> : null}
                </View>
              </View>

              {s === 'recusado' && t?.motivoRecusa ? (
                <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 17 }}>Motivo: {t.motivoRecusa}</Text>
              ) : null}

              {s === 'nao_enviado' ? (
                <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 17 }}>
                  Está com equipamento e nunca recebeu termo. Gere em Termos.
                </Text>
              ) : null}

              {s === 'assinado' && t?.driveFileId ? (
                <Pressable
                  onPress={() => abrirDrive(t.driveFileId)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    alignSelf: 'flex-start',
                    paddingVertical: 7,
                    paddingHorizontal: 11,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.bd,
                    backgroundColor: theme.tint,
                  }}
                >
                  <ExternalLink size={14} color={theme.primary} strokeWidth={2} />
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.primary }}>
                    Abrir termo assinado no Drive
                  </Text>
                </Pressable>
              ) : null}

              {s === 'assinado' && !t?.driveFileId ? (
                <Text style={{ fontSize: 12, color: theme.muted }}>
                  Assinado, mas o arquivo ainda não chegou ao Drive.
                </Text>
              ) : null}
            </Card>
          );
        }}
      />
    </View>
  );
};
