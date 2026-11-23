# GTA 6 AI Content Manager

Sistema completo de gerenciamento de conteúdo para página de fãs de GTA 6, com inteligência artificial, edição de vídeos, aprovação, agendamento, publicação, análise de desempenho e aprendizado contínuo.

> Página independente de fãs. Sem afiliação com a Rockstar Games.

## Funcionalidades

- **Dashboard administrativo** com tema escuro, métricas reais e menu lateral completo
- **Fontes, Fatos e Criadores**: monitoramento de fontes, fatos verificados e criadores
- **Biblioteca de mídia**: upload e organização de materiais de vídeo/imagem
- **Notícias e Agente de IA**: geração de ideias, rascunhos e legendas (com fallback local determinístico)
- **Editor de vídeos**: criação de clipes e exportação via ffmpeg
- **Redes sociais e publicação**: contas sociais, publicações, agendamento, calendário e aprovações
- **Engajamento e Analytics**: registro de métricas, experimentos e relatórios
- **Aprendizado contínuo**: registro de aprendizados vinculados a experimentos
- **Configurações, Logs, Notificações e Automações**
- **Autenticação de administrador** (Auth.js + credenciais) com auditoria de ações

## Tecnologias

- **Frontend/Backend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Banco de dados**: Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Autenticação**: Auth.js (NextAuth) v5
- **Segurança**: bcryptjs para hash de senhas

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Crie .env sem sobrescrever um arquivo existente
test -f .env || cp .env.example .env
# Edite .env com suas credenciais
# Defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 12 caracteres)

# 3. Criar banco de dados e rodar migrations
npm run db:migrate

# 4. Criar o usuário administrador
npm run db:seed

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000` e use o e-mail e a senha definidos em `.env`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run db:migrate` | Cria e aplica migrations |
| `npm run db:generate` | Gera Prisma Client |
| `npm run db:seed` | Popula banco com dados iniciais |
| `npm run db:studio` | Abre Prisma Studio |

## Estrutura de pastas

```
.
├── app/
│   ├── (dashboard)/          # Layout e páginas do painel
│   ├── api/                  # Rotas de API (fontes, fatos, mídia, IA, clipes, publicação, etc.)
│   ├── login/                # Página de login
│   ├── globals.css           # Estilos globais e tema
│   └── layout.tsx            # Layout raiz
├── components/               # Componentes reutilizáveis (inclui components/ui/)
├── lib/                      # prisma, auth, api, ai, video, publish, audit, format
├── prisma/
│   ├── schema.prisma         # Modelo de dados (25 entidades)
│   ├── seed.ts               # Dados iniciais
│   └── migrations/           # Migrations versionadas
├── types/                    # Tipos TypeScript
├── media/
│   ├── library/              # Mídia enviada pela biblioteca
│   └── ...                   # Clipes exportados
├── logs/                     # Logs de operação
├── playbook.md               # Regras operacionais e identidade
├── facts.md                  # Fatos verificados
├── idea_bank.md              # 15 rascunhos iniciais
├── watchlist.md              # Fontes oficiais e criadores candidatos
├── CLIPPING_PIPELINE.md      # Estado e próximos passos da automação de clipes
├── log.md                    # Registro de publicações reais
├── credit_link.md            # Créditos e permissões de uso
├── takedowns.md              # Pedidos e ações de remoção
├── learning.md               # Aprendizados baseados em métricas reais
├── scoreboard.csv            # Métricas de publicações reais
├── templates.md              # Modelos de legendas para Instagram e TikTok
└── .env.example              # Exemplo de variáveis de ambiente
```

## Modelo de dados (25 entidades)

User, Role, SocialAccount, SocialConnection, ContentSource, VerifiedFact, Creator, MediaAsset, MediaClip, MediaPermission, ContentIdea, ContentDraft, ContentRevision, Approval, ScheduledPost, PublishedPost, PublicationAttempt, EngagementRecord, MetricSnapshot, Experiment, LearningRecord, Notification, AuditLog, AutomationJob, SystemSetting.

## Rotas de API (sessão de administrador, exceto o webhook Telegram autenticado por segredo)

| Área | Rotas |
|------|-------|
| Fontes / Fatos / Criadores | `/api/sources`, `/api/facts`, `/api/creators` (+ `/[id]`) |
| Biblioteca de mídia | `/api/media`, `/api/media/upload`, `/api/media/[id]`, `/api/media/file/[id]` |
| Agente de IA | `/api/ai/status`, `/api/ai/generate`, `/api/ai/ideas`, `/api/ai/improve` |
| Editor de vídeos | `/api/editor/status`, `/api/clips`, `/api/clips/[id]`, `/api/clips/[id]/export`, `/api/clips/[id]/file` |
| Redes sociais | `/api/social-accounts` (+ `/[id]`) |
| Publicações e agendamento | `/api/drafts` (+ `/[id]`, `/[id]/submit`), `/api/scheduled-posts` (+ `/[id]`, `/[id]/publish`) |
| Aprovações | `/api/approvals` |
| Engajamento / Métricas | `/api/engagement`, `/api/metrics` |
| Experimentos / Aprendizado | `/api/experiments` (+ `/[id]`), `/api/learning` (+ `/[id]`) |
| Sistema | `/api/settings`, `/api/notifications` (+ `/[id]`, `/read-all`), `/api/logs`, `/api/automation` (+ `/[id]`, `/[id]/run`), `/api/telegram` |

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do banco (SQLite ou PostgreSQL) |
| `AUTH_SECRET` | Segredo para sessões (gere com `openssl rand -base64 32`) |
| `AUTH_URL` | URL base da aplicação |
| `ADMIN_EMAIL` | Email do administrador inicial |
| `ADMIN_PASSWORD` | Senha do administrador inicial |
| `AI_API_KEY` | Chave de API do provedor de IA (opcional; sem ela, usa o gerador local determinístico) |
| `AI_BASE_URL` | Endpoint compatível com OpenAI (padrão: `https://api.openai.com/v1`) |
| `AI_MODEL` | Modelo de IA utilizado (padrão: `gpt-4o-mini`) |
| `PUBLISH_WEBHOOK_URL` | Webhook para publicação (opcional; sem ele, a publicação é registrada manualmente) |
| `TELEGRAM_BOT_TOKEN` | Token do bot de aprovação (opcional) |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat privado autorizado a aprovar/rejeitar rascunhos |
| `TELEGRAM_WEBHOOK_SECRET` | Segredo enviado no header do webhook do Telegram |

## Observações importantes

- Nenhuma publicação é automática: todo conteúdo passa por revisão e aprovação.
- Sem `AI_API_KEY`, o agente de IA usa um gerador local determinístico — nunca inventa fatos.
- Sem `PUBLISH_WEBHOOK_URL`, a publicação é registrada manualmente pelo operador (com URL opcional).
- Telegram é opcional: só envia vídeos locais com permissão registrada e registra decisões de aprovação via webhook HTTPS.
- A exportação de clipes gera MP4 vertical 9:16; separação de webcam e transcrição automática ainda não estão implementadas.
- Para exportar clipes, instale FFmpeg no macOS com `brew install ffmpeg`.
- A exportação de clipes de vídeo requer `ffmpeg` instalado no ambiente.
- Métricas do dashboard vêm do banco de dados (valores reais ou zero).
- Credenciais não são armazenadas no código.

## Kickoff da página

- Canais desejados: Instagram e TikTok. Nenhuma conta social foi criada ou conectada.
- Nome de trabalho informado: “GTA 6”; confirme nome final e @ antes de criar a conta.
- Horário de aprovação informado: 10h da manhã; fuso e dias ainda não definidos.
- Frequência e ferramentas ainda não confirmadas. O “4” enviado na conversa não foi tratado como quantidade de posts.
- Fatos oficiais iniciais e 15 rascunhos foram preparados; rascunhos exigem revisão e aprovação antes de uso.
- A watchlist contém candidatos para descoberta, não parceiros autorizados. Não reutilize clipes sem permissão explícita.
- GTA 6 está disponível desde 19/11/2026 segundo o Rockstar Newswire; o plano de pré-lançamento da transcrição não se aplica mais.
- O painel registra conteúdo e pode usar webhook configurado, mas não conecta nem publica diretamente no Instagram/TikTok por padrão.

## Licença

Uso interno. Respeite os termos de serviço das plataformas e direitos autorais.
