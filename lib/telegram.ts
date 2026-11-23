import { readFile } from "fs/promises";
import path from "path";

type TelegramResult = { sent: boolean; error?: string };

const API_BASE = "https://api.telegram.org";
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function credentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  return token && chatId ? { token, chatId } : null;
}

async function telegramCall(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const response = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = (await response.json()) as {
    ok?: boolean;
    description?: string;
  };
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `Telegram HTTP ${response.status}`);
  }
}

function safeMediaPath(storageKey: string) {
  const mediaRoot = path.resolve(process.cwd(), "media");
  const fullPath = path.resolve(mediaRoot, storageKey);
  if (!fullPath.startsWith(`${mediaRoot}${path.sep}`)) {
    throw new Error("Caminho de mídia inválido.");
  }
  return fullPath;
}

export async function sendClipForApproval({
  draftId,
  title,
  caption,
  storageKey,
}: {
  draftId: string;
  title: string;
  caption: string;
  storageKey: string;
}): Promise<TelegramResult> {
  const auth = credentials();
  if (!auth) return { sent: false, error: "Telegram não configurado." };

  try {
    const reviewText = `Revisão de publicação\n${title}\n\n${caption}`;
    if (reviewText.length > 4000) {
      return {
        sent: false,
        error: "Legenda excede o limite de texto do Telegram; reduza antes de enviar.",
      };
    }

    const filePath = safeMediaPath(storageKey);
    const video = await readFile(filePath);
    if (video.byteLength > MAX_VIDEO_BYTES) {
      return {
        sent: false,
        error: "Vídeo excede o limite de 50 MB para envio ao bot.",
      };
    }

    const videoForm = new FormData();
    videoForm.set("chat_id", auth.chatId);
    videoForm.set(
      "video",
      new Blob([new Uint8Array(video)], { type: "video/mp4" }),
      path.basename(filePath)
    );
    const videoResponse = await fetch(
      `${API_BASE}/bot${auth.token}/sendVideo`,
      {
        method: "POST",
        body: videoForm,
        signal: AbortSignal.timeout(30000),
      }
    );
    const videoResult = (await videoResponse.json()) as {
      ok?: boolean;
      description?: string;
    };
    if (!videoResponse.ok || !videoResult.ok) {
      throw new Error(
        videoResult.description ?? `Telegram HTTP ${videoResponse.status}`
      );
    }

    await telegramCall(auth.token, "sendMessage", {
      chat_id: auth.chatId,
      text: reviewText,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Aprovar",
              callback_data: `approval:${draftId}:approve`,
            },
            {
              text: "Rejeitar",
              callback_data: `approval:${draftId}:reject`,
            },
          ],
        ],
      },
    });
    return { sent: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao enviar para o Telegram.";
    return { sent: false, error: message };
  }
}

export async function answerTelegramCallback({
  callbackQueryId,
  text,
  chatId,
  messageId,
}: {
  callbackQueryId: string;
  text: string;
  chatId?: number;
  messageId?: number;
}) {
  const auth = credentials();
  if (!auth) return;

  try {
    await telegramCall(auth.token, "answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    });
    if (chatId !== undefined && messageId !== undefined) {
      await telegramCall(auth.token, "editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      });
    }
  } catch (error) {
    console.error("[telegram] falha ao responder callback:", error);
  }
}
