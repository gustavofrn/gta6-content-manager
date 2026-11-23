import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api";
import { logAudit, notify } from "@/lib/audit";
import { sendClipForApproval } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        mediaAsset: {
          include: {
            permissions: { select: { granted: true, expiresAt: true } },
          },
        },
      },
    });
    if (!existing) return notFound("Publicação não encontrada.");
    if (
      existing.status === "scheduled" ||
      existing.status === "published" ||
      existing.status === "pending_approval"
    ) {
      return badRequest(
        "Esta publicação já está em revisão, foi agendada ou publicada."
      );
    }

    const validPermission = existing.mediaAsset?.permissions.some(
      (permission) =>
        permission.granted &&
        (!permission.expiresAt || permission.expiresAt > new Date())
    );
    if (existing.mediaAsset && !validPermission) {
      return badRequest(
        "A mídia anexada não tem permissão de uso válida registrada."
      );
    }

    const draft = await prisma.contentDraft.update({
      where: { id },
      data: { status: "pending_approval" },
    });

    await notify({
      userId: existing.userId,
      type: "approval",
      title: "Publicação enviada para aprovação",
      message: `"${draft.title}" aguarda revisão.`,
    });

    await logAudit({
      userId: user.id,
      action: "submit",
      entity: "ContentDraft",
      entityId: id,
      details: draft.title,
    });

    const telegram =
      existing.mediaAsset?.type === "video" &&
      existing.mediaAsset.storageKey &&
      validPermission
        ? await sendClipForApproval({
            draftId: draft.id,
            title: draft.title,
            caption: draft.caption ?? "",
            storageKey: existing.mediaAsset.storageKey,
          })
        : {
            sent: false,
            error:
              "O Telegram exige um vídeo local anexado e com permissão de uso válida.",
          };

    return NextResponse.json({ ...draft, telegram });
  } catch (error) {
    return serverError(error);
  }
}
