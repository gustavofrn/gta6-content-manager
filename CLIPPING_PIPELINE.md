# Pipeline de clipes GTA 6

## Objetivo

Preparar vídeos curtos para Instagram e TikTok, mantendo aprovação humana antes de qualquer publicação e usando apenas mídia própria ou autorizada.

## MVP disponível no projeto

1. Enviar um arquivo local pela Biblioteca de mídia e confirmar que foi criado pelo operador ou que existe autorização explícita.
2. Informar manualmente início e fim do trecho no Editor.
3. Exportar o trecho como MP4 vertical 1080x1920, preservando o vídeo centralizado sobre um fundo ampliado e desfocado.
4. O arquivo exportado volta à biblioteca com o registro de permissão derivado da origem.
5. Criar um rascunho com o clipe final e enviá-lo para aprovação no painel.
6. Com Telegram configurado, o bot pode enviar o arquivo e botões de aprovar/rejeitar. A decisão retorna ao banco do painel.
7. Publicar manualmente ou encaminhar para um webhook configurado.

O MVP não escolhe automaticamente momentos da live, não gera transcrição e não separa webcam. O vídeo precisa ser selecionado e revisado por uma pessoa.

## Integrações ainda pendentes

| Parte | Situação |
|---|---|
| Twitch Helix | Sem conector. Requer credenciais de aplicação e análise dos termos para cada uso do clipe. |
| Kick | Sem conector. Usar somente API oficial/autorizada quando disponível para o caso de uso. |
| YouTube Data API e picos de chat | Sem conector; depende de chave/API e disponibilidade dos dados de chat da live. |
| Download automático com yt-dlp | Desativado. Não baixar lives ou vídeos de terceiros sem autorização e compatibilidade com os termos da plataforma. |
| faster-whisper e filtro de idioma | Ainda não implementados. |
| OpenCV para detectar webcam | Ainda não implementado. |
| Render com webcam em cima, gameplay embaixo e legendas sincronizadas | Ainda não implementado; o MVP usa vídeo centralizado com fundo desfocado. |
| Texto via OpenRouter | O módulo de IA atual aceita endpoint compatível com OpenAI, mas ainda não faz o fluxo de clipe/transcrição descrito acima. |
| Aprovação Telegram | Código opcional disponível; exige bot, chat privado e webhook HTTPS configurados. |
| Buffer | Publicação direta na API GraphQL não implementada. O projeto aceita publicação manual ou um webhook adaptador; validar a API atual antes de conectar. |
| VPS, Docker, Traefik, Nginx e systemd | Não configurados nem implantados. |

## Requisitos locais

- Node.js e dependências do projeto.
- FFmpeg instalado para exportar vídeos. No macOS com Homebrew: `brew install ffmpeg`.
- Mídia enviada pela biblioteca e direitos de uso confirmados.
- Para Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` e endereço público HTTPS apontando para `/api/telegram`.

O bot só envia clipes locais de até 50 MB que tenham permissão ativa registrada. Se a integração falhar ou não estiver configurada, a aprovação continua disponível no painel.

## Próxima sequência recomendada

1. Instalar FFmpeg e testar com um vídeo de gravação própria.
2. Criar as contas de Instagram e TikTok e definir o nome/@ final.
3. Configurar bot Telegram e validar aprovações em ambiente de teste.
4. Implementar coleta de metadados via APIs oficiais, começando por uma plataforma e sem download automático.
5. Adicionar transcrição/detecção de idioma e geração de legendas, com revisão humana.
6. Confirmar permissão, estabilidade e documentação de uma integração Buffer antes de ativar publicação.
7. Só então preparar implantação na VPS com segredos fora do repositório, HTTPS, logs e cópias de segurança.
