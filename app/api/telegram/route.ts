import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit, notify } from "@/lib/audit";
import { answerTelegramCallback } from "@/lib/telegram";

export const runtime = "nodejs";

type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
};

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Webhook do Telegram não configurado." },
      { status: 503 }
    );
  }
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const update = (await req.json()) as TelegramUpdate;
    const callback = update.callback_query;
    if (!callback) return NextResponse.json({ ok: true });

    const configuredChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    const message = callback.message;
    if (
      !configuredChatId ||
      !message ||
      String(message.chat.id) !== configuredChatId
    ) {
      return NextResponse.json({ error: "Chat não autorizado." }, { status: 403 });
    }

    const match = callback.data?.match(
      /^approval:([A-Za-z0-9_-]{1,50}):(approve|reject)$/
    );
    if (!match) {
      await answerTelegramCallback({
        callbackQueryId: callback.id,
        text: "Ação inválida.",
        chatId: message.chat.id,
        messageId: message.message_id,
      });
      return NextResponse.json({ ok: true });
    }

    const [, draftId, action] = match;
    const admin = await prisma.user.findFirst({
      where: { active: true, role: { name: "admin" } },
      select: { id: true },
    });
    if (!admin) {
      await answerTelegramCallback({
        callbackQueryId: callback.id,
        text: "Nenhum administrador ativo foi encontrado.",
        chatId: message.chat.id,
        messageId: message.message_id,
      });
      return NextResponse.json({ ok: true });
    }

    const decision = action === "approve" ? "approved" : "rejected";
    const result = await prisma.$transaction(async (tx) => {
      const draft = await tx.contentDraft.findUnique({
        where: { id: draftId },
      });
      if (!draft) return { status: "missing" as const };
      if (draft.status !== "pending_approval") {
        return { status: "stale" as const };
      }

      await tx.approval.create({
        data: {
          draftId,
          userId: admin.id,
          decision,
          comment: "Decisão registrada pelo bot do Telegram.",
        },
      });
      await tx.contentDraft.update({
        where: { id: draftId },
        data: { status: decision },
      });
      return { status: "updated" as const, draft };
    });

    if (result.status !== "updated") {
      await answerTelegramCallback({
        callbackQueryId: callback.id,
        text:
          result.status === "missing"
            ? "Publicação não encontrada."
            : "Esta revisão já foi resolvida.",
        chatId: message.chat.id,
        messageId: message.message_id,
      });
      return NextResponse.json({ ok: true });
    }

    const approved = decision === "approved";
    await notify({
      userId: result.draft.userId,
      type: "approval",
      title: approved ? "Publicação aprovada" : "Publicação rejeitada",
      message: `"${result.draft.title}" foi ${
        approved ? "aprovada" : "rejeitada"
      } pelo Telegram.`,
    });
    await logAudit({
      userId: admin.id,
      action: decision,
      entity: "ContentDraft",
      entityId: draftId,
      details: `${result.draft.title} via Telegram`,
    });
    await answerTelegramCallback({
      callbackQueryId: callback.id,
      text: approved ? "Aprovada." : "Rejeitada.",
      chatId: message.chat.id,
      messageId: message.message_id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram] falha ao processar webhook:", error);
    return NextResponse.json({ error: "Falha ao processar atualização." }, { status: 500 });
  }
}
