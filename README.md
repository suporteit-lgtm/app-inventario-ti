# App Inventário TI

App mobile (Android + iOS, com pré-visualização web) para **inventário de equipamentos de TI**: cadastro, busca por QR code, movimentação entre responsáveis, alertas de garantia, relatórios e geração de termo de responsabilidade em PDF.

Construído em **React Native + Expo (SDK 57)** com TypeScript. O backend é **Supabase** (Postgres + Auth + Edge Functions), mas o app também roda sem nenhuma configuração, em modo demonstração.

## Funcionalidades

- **Login** com Supabase Auth, tema claro/escuro persistido
- **Home** — contadores por status, ações rápidas, alertas recentes e seletor de inventário (unidade)
- **Inventário** — busca em tempo real por nome, número de série e patrimônio; filtros por tipo; leitura de QR para localizar um equipamento
- **Detalhe** — dados completos, histórico de movimentações e ações de movimentar / gerar termo / editar
- **Cadastro e edição** — foto via câmera ou galeria, leitura do número de série por QR
- **Movimentações** — troca de responsável e de local, com histórico
- **Relatórios** — exportação real em PDF e CSV
- **Alertas** — derivados do fim de garantia e do status do equipamento
- **Usuários e permissões** (perfil Admin) — acesso liberado por inventário, por usuário
- **Importação de CSV** (perfil Admin) — seleção de arquivo, parse, importação e planilha modelo
- **Termo de responsabilidade** — fluxo em 3 passos com templates (Padrão, Comodato, Devolução), geração de PDF e envio para assinatura via Clicksign

## Como rodar

Requer Node.js 20+.

```bash
npm install
```

```bash
npx expo start
```

- **Android / iOS**: leia o QR code com o app **Expo Go** (ou `npm run android` com um emulador aberto).
- **Web**: `npm run web`.

### Modo demonstração (sem configuração)

Sem um `.env`, o app sobe com dados simulados em memória, persistidos localmente via AsyncStorage. O login aceita qualquer senha — use um dos usuários de exemplo definidos em [src/data/mock.ts](src/data/mock.ts).

### Modo Supabase

Crie o `.env` a partir do modelo e preencha com os dados do seu projeto (Supabase → Project Settings → API):

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

Reinicie o `expo start` depois de qualquer alteração no `.env`.

> As duas variáveis usam o prefixo `EXPO_PUBLIC_`, ou seja, ficam embutidas no bundle do app e são visíveis para quem instalar o APK. Isso é o esperado para a *anon key* do Supabase — **a proteção real dos dados vem do RLS**, não do sigilo dessa chave. Confira as políticas antes de distribuir qualquer build.

## Banco de dados

Os scripts ficam em [supabase/](supabase). Execute-os no **SQL Editor** do projeto Supabase.

Para um setup novo, rode **apenas `restore-after-reset.sql`** — ele é idempotente e substitui `setup-app.sql` até `setup-app-v5.sql`, que ficam no repositório só como histórico. É também o script para rodar de novo caso uma migration do Prisma resete o banco.

| Arquivo | O que faz |
|---|---|
| `restore-after-reset.sql` | **script principal**: colunas extras do app, tabela `EquipmentLog`, RLS, grants e templates de termo |
| `endurecer-acesso.sql` | rode depois do principal: fecha o acesso do visitante não-logado e faz a divisão por inventário valer no banco |
| `setup-linhas-corporativas.sql` | colunas da categoria "Linhas corporativas" (operadora, ICCID, telefone…) |
| `adicionar-colunas-unidade.sql` | colunas `cnpj`, `address` e `nickname` da tabela `Unit` — sem elas o termo sai sem CNPJ/endereço e a tela de unidades não salva |
| `corrigir-permissoes.sql` | só os grants, quando o sintoma é `permission denied for schema public` nas Edge Functions |
| `limpar-templates-legados.sql` | limpeza de templates antigos de termo |
| `atualizar-termo-devolucao.sql` | põe o texto oficial completo no termo de devolução, quando o banco ainda tem o rascunho curto (sem endereço, CNPJ e CPFs) |
| `setup-app.sql` … `setup-app-v5.sql` | histórico, superados pelo `restore-after-reset.sql` |

Tabelas principais: `Unit` (inventários), `Category` (tipos de equipamento), `Equipment`, `User` (papel e inventários liberados) e `AssignmentHistory` (movimentações). Os alertas são derivados de `warrantyEndDate` combinado com `Settings.warrantyWarningDays`.

Depois de rodar os scripts, crie os logins em **Authentication → Users**. O e-mail do login precisa existir também na tabela `User` — é o vínculo com nome, papel e permissões.

### Controle de acesso

O acesso é por inventário: o Admin define, na tela de Usuários, quais unidades cada pessoa enxerga (coluna `User.allowedUnitIds`, que aceita quantas unidades forem necessárias). Quem tem papel `ADMIN` enxerga todas.

Com o `endurecer-acesso.sql` aplicado, essa regra passa a valer **no banco**, não só na interface: as políticas de RLS de `Equipment`, `Unit` e `Category` leem a mesma lista, e `AssignmentHistory` / `EquipmentLog` seguem a visibilidade do equipamento. Usuário sem unidade configurada não enxerga nada — a falha é fechada e visível, em vez de liberar tudo em silêncio.

Um detalhe importante: as tabelas pertencem ao papel `postgres`, e dono de tabela não é submetido a RLS. Se o sistema web compartilha este banco conectando como `postgres` (via Prisma / pooler), ele não é afetado pelas políticas. Nenhum script usa `force row level security`, justamente para preservar essa isenção.

### Edge Functions

Em [supabase/functions/](supabase/functions):

- `admin-users` — criação e gestão de usuários pelo app (roda com `service_role`)
- `clicksign-send` — envia o termo em PDF para assinatura
- `clicksign-webhook` — recebe o retorno de assinatura da Clicksign

O token da Clicksign é configurado como **secret da Edge Function** (`supabase secrets set`), nunca no código do app.

## Build e distribuição

Os builds são feitos na nuvem pelo **EAS Build** (requer conta em expo.dev). O `eas.json` **não é versionado**, porque carrega as variáveis de ambiente do projeto — crie o seu a partir do modelo:

```bash
cp eas.json.example eas.json
```

```bash
npm install -g eas-cli && eas login
```

```bash
eas build -p android --profile preview
```

O perfil `preview` gera um APK instalável (o terminal devolve link e QR ao final). Para a Play Store use `--profile production` (gera AAB); para iOS, `eas build -p ios`, que exige conta Apple Developer.

Alternativa ao `env` no `eas.json`: guardar os valores como secrets do EAS, com `eas secret:create`.

## Estrutura

```
src/
  components/   UI reutilizável (cards, chips, tab bar, sheets, toast…)
  data/         mock.ts (dados demo) e repo.ts (camada de dados: mock ⇄ Supabase)
  lib/          supabase.ts, clicksign.ts, export.ts (PDF/CSV), máscaras
  nav/          navegação em pilha + estado dos overlays
  overlays/     sheets globais e scanner de QR
  pdf/          template HTML do termo de responsabilidade
  screens/      as telas do app
  state/        AppContext (sessão, tema, inventário ativo, dados)
  theme/        tokens de design (claro/escuro)
supabase/       scripts SQL + Edge Functions
```

## Licença

MIT — veja [LICENSE](LICENSE).
