import { QrCode, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvChip } from '../components/InvChip';
import { Sheet } from '../components/Sheet';
import { Tela } from '../components/Tela';
import { Card, Checkbox, PrimaryButton, StatusBadge, TypeTag } from '../components/ui';
import { useNav } from '../nav/NavContext';
import { useApp } from '../state/AppContext';
import { equipNome, EQUIP_STATUS, invDisplay, shortName, tipoTag } from '../types';

export const InventoryScreen: React.FC = () => {
  const app = useApp();
  const nav = useNav();
  const { theme, db, inv } = app;
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const FILTERS = ['Todos', ...db.categorias];

  // Busca por termos: cada palavra digitada precisa aparecer em algum campo,
  // então "primeiro + último nome" do responsável também encontra o item
  const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = db.equipments.filter((it) => {
    if (it.unidade !== inv) return false;
    if (filter !== 'Todos' && it.tipo !== filter) return false;
    if (statusFilter.length && !statusFilter.includes(it.status)) return false;
    if (!tokens.length) return true;
    const hay = `${it.marca} ${it.modelo} ${it.serial} ${it.patrimonio} ${it.usuario} ${it.local}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  return (
    <Tela>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: theme.text }}>Inventário</Text>
          <InvChip compact />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View
            style={{
              flex: 1,
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
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nome, serial, patrimônio…"
              placeholderTextColor={theme.muted2}
              style={{ flex: 1, fontSize: 14, color: theme.text, minWidth: 0, paddingVertical: 0 }}
            />
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: statusFilter.length ? theme.primary : theme.card,
              borderWidth: statusFilter.length ? 0 : 1,
              borderColor: theme.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={19} color={statusFilter.length ? '#fff' : theme.text2} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            onPress={() => app.showToast('Leitura de QR indisponível no momento')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: theme.chip,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.55,
            }}
          >
            <QrCode size={20} color={theme.muted2} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  height: 34,
                  paddingHorizontal: 14,
                  borderRadius: 17,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.bd,
                  backgroundColor: active ? theme.primary : theme.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text2 }}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Text style={{ paddingHorizontal: 18, paddingTop: 6, fontSize: 12.5, color: theme.muted }}>
        {filtered.length} {filtered.length === 1 ? 'equipamento' : 'equipamentos'} em {invDisplay(db.inventories, inv)}
        {statusFilter.length ? ` · ${statusFilter.join(' / ')}` : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 132 }}
        renderItem={({ item: it }) => (
          <Card onPress={() => nav.openItem(it.id)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14 }}>
            <TypeTag tag={tipoTag(it.tipo)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                {equipNome(it) || it.telefone || it.operadora || it.tipo}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
                {[it.patrimonio, it.serial].filter(Boolean).join(' · ') || it.assetId || 'sem identificação'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: '42%' }}>
              <StatusBadge status={it.status} />
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted2 }}>
                {it.usuario === '—' ? '—' : shortName(it.usuario)}
              </Text>
            </View>
          </Card>
        )}
      />

      <Sheet visible={filterOpen} onClose={() => setFilterOpen(false)}>
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 2, color: theme.text }}>
          Filtrar por status
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.muted, paddingHorizontal: 4, paddingBottom: 10 }}>
          Marque um ou mais status para combinar (ex.: Manutenção + Descartado).
        </Text>
        <Pressable
          onPress={() => setStatusFilter([])}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 13,
            paddingHorizontal: 4,
            borderBottomWidth: 1,
            borderBottomColor: theme.hair,
          }}
        >
          <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: theme.text }}>Todos</Text>
          <Checkbox on={statusFilter.length === 0} />
        </Pressable>
        {EQUIP_STATUS.map((s, i) => (
          <Pressable
            key={s}
            onPress={() =>
              setStatusFilter((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]))
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 13,
              paddingHorizontal: 4,
              borderBottomWidth: i < EQUIP_STATUS.length - 1 ? 1 : 0,
              borderBottomColor: theme.hair,
            }}
          >
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: theme.text }}>{s}</Text>
            <Text style={{ fontSize: 12, color: theme.muted }}>
              {db.equipments.filter((e) => e.unidade === inv && e.status === s).length}
            </Text>
            <Checkbox on={statusFilter.includes(s)} />
          </Pressable>
        ))}
        <PrimaryButton label="Aplicar" height={46} onPress={() => setFilterOpen(false)} style={{ marginTop: 14 }} />
      </Sheet>
    </Tela>
  );
};
