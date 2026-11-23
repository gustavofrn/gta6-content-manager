# GTA 6 AI Content Manager - Fase 1: Arquitetura, Banco de Dados, Autenticação e Dashboard

## Overview
- **Summary**: Construir a base funcional do sistema de gerenciamento de conteúdo para página de fãs de GTA 6: arquitetura do projeto, banco de dados com modelo de dados completo, autenticação de administradores e dashboard administrativo com tema escuro.
- **Purpose**: Estabelecer a fundação técnica sobre a qual as fases seguintes (fontes, IA, editor de vídeo, publicações, métricas) serão construídas.
- **Target Users**: Administrador da página de GTA 6 (usuário único inicial com acesso ao painel).

## Goals
- Projeto Next.js + TypeScript + Tailwind CSS funcional e executável.
- Banco de dados relacional via Prisma com todas as entidades do domínio (seção 23 do prompt mestre).
- Autenticação de administrador com credenciais e sessão segura.
- Dashboard administrativo navegável com menu lateral completo e visão geral.
- Estrutura de arquivos de conteúdo operacional (playbook, facts, idea_bank, watchlist, learning, scoreboard, templates).

## Non-Goals
- Integrações reais com redes sociais (X, Instagram, TikTok, YouTube) — Fase 5.
- Editor de vídeo / clipping com FFmpeg — Fase 4.
- Agente de IA e verificação de notícias — Fase 3.
- Publicação e agendamento via Buffer — Fase 5.
- Redis / BullMQ / workers assíncronos — fases posteriores.
- PostgreSQL em produção na Fase 1 (usamos SQLite em dev com schema compatível).

## Background & Context
- Repositório inicialmente vazio.
- Ambiente: Node.js v25.9.0, npm 11.12.1. Sem PostgreSQL, Redis, FFmpeg ou Docker instalados.
- Decisão: usar Prisma com SQLite no desenvolvimento (provider trocável para PostgreSQL via `.env`), Next.js API Routes como backend inicial (Fastify dedicado pode ser extraído depois).
- Interface em português brasileiro, conforme regra do prompt mestre.

## Functional Requirements
- **FR-1**: O projeto deve inicializar e rodar (`npm run dev`) sem erros, servindo a página de login e o dashboard.
- **FR-2**: O banco de dados deve ser criado via migração Prisma com todas as entidades listadas na seção 23.
- **FR-3**: Deve existir fluxo de login com email e senha, com hash de senha e sessão.
- **FR-4**: Rotas do dashboard devem ser protegidas (redirecionam para login se não autenticado).
- **FR-5**: O dashboard deve exibir cards de visão geral (publicações, agendados, pendentes, views, likes, comentários, compartilhamentos, crescimento de seguidores, engajamento).
- **FR-6**: Menu lateral com todas as seções: Dashboard, Agente IA, Notícias, Biblioteca de mídia, Editor de vídeos, Criador de publicações, Calendário, Aprovações, Redes sociais, Engajamento, Analytics, Aprendizado, Fontes, Configurações, Logs.
- **FR-7**: Cada seção do menu deve ter uma página (placeholder funcional com título e descrição, não botões decorativos).
- **FR-8**: Tema escuro: preto e grafite, detalhes em roxo e vermelho, cards modernos, responsivo.
- **FR-9**: Arquivos de conteúdo operacional criados na raiz do projeto.

## Non-Functional Requirements
- **NFR-1**: Código TypeScript compila sem erros (`tsc --noEmit`).
- **NFR-2**: Migrations Prisma versionadas e aplicáveis.
- **NFR-3**: Nenhuma credencial hardcoded; `.env.example` documenta variáveis.
- **NFR-4**: Interface responsiva (mobile, tablet, desktop).
- **NFR-5**: Sem dados de exemplo apresentados como reais — métricas do dashboard devem vir do banco (vazias inicialmente) ou zero, não números inventados.

## Constraints
- **Technical**: Node.js disponível; sem PostgreSQL/Redis/FFmpeg/Docker. Usar SQLite + Prisma.
- **Business**: Não publicar nada automaticamente; sem integrações simuladas como funcionais.
- **Dependencies**: Next.js 15, React 19, Tailwind CSS, Prisma, Auth.js (NextAuth), bcryptjs.

## Assumptions
- SQLite é aceitável para Fase 1 e pode ser migrado para PostgreSQL depois trocando o provider.
- Next.js API Routes substituem o backend Fastify dedicado nesta fase.
- Um único usuário administrador inicial é criado via seed.

## Acceptance Criteria

### AC-1: Projeto inicializa e roda
- **Type**: `rule`
- **Given**: projeto clonado e `npm install` executado
- **When**: `npm run dev` é executado
- **Then**: servidor inicia em `http://localhost:3000` sem erros fatais
- **Pass Condition**: comando roda por pelo menos 10s sem crash; página de login carrega
- **Evidence**: output do terminal + captura da página

### AC-2: Banco de dados com todas as entidades
- **Type**: `rule`
- **Given**: schema Prisma definido
- **When**: `npx prisma migrate dev` é executado
- **Then**: tabelas para User, Role, SocialAccount, SocialConnection, ContentSource, VerifiedFact, Creator, MediaAsset, MediaPermission, ContentIdea, ContentDraft, ContentRevision, Approval, ScheduledPost, PublishedPost, PublicationAttempt, EngagementRecord, MetricSnapshot, Experiment, LearningRecord, Notification, AuditLog, AutomationJob, SystemSetting são criadas
- **Pass Condition**: todas as 24 entidades existem no schema e migração aplica sem erro
- **Evidence**: `prisma/schema.prisma` + output da migração

### AC-3: Autenticação funcional
- **Type**: `rule`
- **Given**: usuário admin criado via seed
- **When**: login com credenciais corretas
- **Then**: sessão é criada e usuário acessa o dashboard; credenciais erradas rejeitam
- **Pass Condition**: login com sucesso redireciona para `/dashboard`; logout remove sessão
- **Evidence**: teste manual na interface

### AC-4: Rotas protegidas
- **Type**: `rule`
- **Given**: usuário não autenticado
- **When**: acessa qualquer rota sob `/dashboard`
- **Then**: é redirecionado para `/login`
- **Pass Condition**: middleware ou verificação de sessão bloqueia acesso
- **Evidence**: acesso direto a `/dashboard` redireciona

### AC-5: Dashboard com visão geral
- **Type**: `rule`
- **Given**: usuário autenticado
- **When**: acessa `/dashboard`
- **Then**: vê cards com métricas (valores reais do banco ou zero) e menu lateral
- **Pass Condition**: 9 cards de métricas renderizam com valores numéricos
- **Evidence**: captura da tela

### AC-6: Menu lateral completo e navegável
- **Type**: `rule`
- **Given**: usuário autenticado
- **When**: clica em cada item do menu
- **Then**: navega para página correspondente que renderiza conteúdo (não erro 404)
- **Pass Condition**: todas as 15 seções do menu têm rota funcional
- **Evidence**: navegação manual

### AC-7: Tema escuro e responsividade
- **Type**: `rubric`
- **Dimension**: fidelidade visual ao tema escuro (preto/grafite, roxo e vermelho) e responsividade
- **Scale**: 1-5
- **Anchors**: 1 = tema claro ou quebrado; 3 = tema escuro básico; 5 = tema escuro rico com detalhes roxo/vermelho, cards modernos, layout responsivo em mobile
- **Pass Threshold**: >= 4
- **Evidence**: capturas em desktop e mobile

### AC-8: Estrutura de arquivos operacionais
- **Type**: `rule`
- **Given**: projeto criado
- **When**: listar raiz do projeto
- **Then**: arquivos playbook.md, facts.md, idea_bank.md, watchlist.md, learning.md, scoreboard.csv, templates.md existem
- **Pass Condition**: 7 arquivos presentes com conteúdo inicial (vazios ou cabeçalhos)
- **Evidence**: `ls` da raiz

## Open Questions
- Nenhuma para Fase 1; requisitos do prompt mestre são explícitos.
