# GTA 6 AI Content Manager - Fase 1: Plano de Implementação

## Task 1: Inicializar projeto Next.js + TypeScript + Tailwind
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar estrutura base Next.js 15 (App Router) com TypeScript e Tailwind CSS
  - Configurar `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `postcss.config.js`
  - Definir tema escuro (cores preto/grafite, roxo, vermelho) no Tailwind
  - Criar `app/layout.tsx`, `app/globals.css`
- **Acceptance Criteria Addressed**: AC-1, AC-7
- **Test Requirements**:
  - `rule` TR-1.1: `npm run dev` inicia servidor sem erros fatais
  - `rule` TR-1.2: `npx tsc --noEmit` compila sem erros
  - `rubric` TR-1.3: tema escuro aplicado globalmente; escala 1-5; anchors 1=claro/quebrado, 3=básico, 5=rico com detalhes; threshold >=4

## Task 2: Configurar Prisma com modelo de dados completo
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Instalar Prisma e configurar `prisma/schema.prisma`
  - Definir todas as 24 entidades da seção 23 com relacionamentos, índices e constraints
  - Configurar provider SQLite (compatível com PostgreSQL via env)
  - Criar migration inicial e seed com usuário admin
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-2.1: `npx prisma migrate dev` aplica sem erros
  - `rule` TR-2.2: `npx prisma db seed` cria usuário admin
  - `rule` TR-2.3: todas as 24 entidades estão no schema

## Task 3: Implementar autenticação (Auth.js + credenciais)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Instalar `next-auth` (Auth.js) e configurar Credentials provider
  - Página de login (`app/login/page.tsx`) com formulário
  - Middleware para proteger rotas `/dashboard/*`
  - Hash de senha com bcryptjs
  - Rota de logout
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `rule` TR-3.1: login com credenciais do seed redireciona para `/dashboard`
  - `rule` TR-3.2: credenciais erradas mostram erro
  - `rule` TR-3.3: acesso não autenticado a `/dashboard` redireciona para `/login`
  - `rule` TR-3.4: logout remove sessão e volta ao login

## Task 4: Construir layout do dashboard com menu lateral
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Layout `app/(dashboard)/layout.tsx` com sidebar e topbar
  - Menu lateral com 15 itens (Dashboard, Agente IA, Notícias, Biblioteca, Editor, Publicações, Calendário, Aprovações, Redes sociais, Engajamento, Analytics, Aprendizado, Fontes, Configurações, Logs)
  - Componente de navegação responsiva (colapsável no mobile)
  - Indicador de seção ativa
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-4.1: todos os 15 itens do menu são renderizados
  - `rule` TR-4.2: cada item navega para uma rota existente
  - `rubric` TR-4.3: layout responsivo (sidebar colapsa no mobile); escala 1-5; threshold >=4

## Task 5: Página de visão geral do dashboard
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - Página `app/(dashboard)/page.tsx` com 9 cards de métricas
  - Métricas lidas do banco (valores reais ou zero): total publicações, agendados, pendentes, views, likes, comentários, compartilhamentos, crescimento seguidores, taxa de engajamento
  - Cards modernos com ícones e cores do tema
- **Acceptance Criteria Addressed**: AC-5, AC-7
- **Test Requirements**:
  - `rule` TR-5.1: 9 cards renderizam com valores numéricos
  - `rule` TR-5.2: valores vêm de consulta ao banco (não hardcoded)
  - `rubric` TR-5.3: design dos cards; escala 1-5; threshold >=4

## Task 6: Páginas placeholder para todas as seções do menu
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - Criar página para cada item do menu com título, descrição e estado "em desenvolvimento" funcional (não botões decorativos)
  - Seções: agente-ia, noticias, biblioteca, editor, publicacoes, calendario, aprovacoes, redes-sociais, engajamento, analytics, aprendizado, fontes, configuracoes, logs
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-6.1: todas as 14 seções (além do dashboard) têm rota que retorna 200
  - `rule` TR-6.2: cada página exibe conteúdo real (título + descrição)

## Task 7: Criar arquivos operacionais e documentação
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - Criar na raiz: `playbook.md`, `facts.md`, `idea_bank.md`, `watchlist.md`, `learning.md`, `scoreboard.csv`, `templates.md`
  - Criar `logs/`, `media/official/`, `media/raw/`, `media/edits/`
  - Criar `.env.example`, `.gitignore`, `README.md`
- **Acceptance Criteria Addressed**: AC-8, NFR-3
- **Test Requirements**:
  - `rule` TR-7.1: 7 arquivos operacionais existem na raiz
  - `rule` TR-7.2: `.env.example` lista todas as variáveis necessárias
  - `rule` TR-7.3: `.gitignore` exclui `node_modules`, `.env`, `.next`

## Task 8: Validação final e testes
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-7
- **Description**:
  - Rodar `npm run build` para verificar produção
  - Rodar `npx tsc --noEmit`
  - Verificar login, navegação, dashboard manualmente
  - Confirmar que nenhum dado de exemplo é apresentado como real
- **Acceptance Criteria Addressed**: AC-1 a AC-8
- **Test Requirements**:
  - `rule` TR-8.1: `npm run build` completa com sucesso
  - `rule` TR-8.2: `tsc --noEmit` sem erros
  - `rule` TR-8.3: fluxo completo login → dashboard → navegação → logout funciona
