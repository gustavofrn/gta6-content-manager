import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  readJson,
  toStr,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.scheduledPost.findUnique({ where: { id } });
    if (!existing) return notFound("Agendamento não encontrado.");

    const body = await readJson(req);
    let scheduledAt = existing.scheduledAt;
    if (body.scheduledAt !== undefined) {
      const parsed = new Date(String(body.scheduledAt));
      if (Number.isNaN(parsed.getTime())) {
        return badRequest("Data/hora de agendamento inválida.");
      }
      scheduledAt = parsed;
    }

    const post = await prisma.scheduledPost.update({
      where: { id },
      data: {
        scheduledAt,
        status: toStr(body.status, existing.status) as string,
      },
      include: {
        draft: { select: { id: true, title: true, pillar: true } },
        socialAccount: {
          select: { id: true, platform: true, handle: true, name: true },
        },
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "ScheduledPost",
      entityId: id,
      details: post.draft.title,
    });

    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

/** Cancelar agendamento: marco como "cancelled" e devolvo a publicação para "approved". */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.scheduledPost.findUnique({ where: { id } });
    if (!existing) return notFound("Agendamento não encontrado.");

    const post = await prisma.scheduledPost.update({
      where: { id },
      data: { status: "cancelled" },
    });

    await prisma.contentDraft.update({
      where: { id: existing.draftId },
      data: { status: "approved" },
    });

    await logAudit({
      userId: user.id,
      action: "cancel_schedule",
      entity: "ScheduledPost",
      entityId: id,
      details: post.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
