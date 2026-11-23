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

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const posts = await prisma.scheduledPost.findMany({
      orderBy: { scheduledAt: "asc" },
      include: {
        draft: { select: { id: true, title: true, pillar: true, status: true } },
        socialAccount: {
          select: { id: true, platform: true, handle: true, name: true },
        },
        publishedPost: { select: { id: true, url: true, publishedAt: true } },
      },
    });
    return NextResponse.json(posts);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const draftId = toStr(body.draftId);
    const socialAccountId = toStr(body.socialAccountId);
    const scheduledAtRaw = toStr(body.scheduledAt);
    if (!draftId) return badRequest("Informe a publicação.");
    if (!socialAccountId) return badRequest("Selecione uma conta social.");
    if (!scheduledAtRaw) return badRequest("Informe a data e hora do agendamento.");

    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return badRequest("Data/hora de agendamento inválida.");
    }

    const draft = await prisma.contentDraft.findUnique({
      where: { id: draftId },
      include: { scheduledPost: true },
    });
    if (!draft) return notFound("Publicação não encontrada.");
    if (draft.status !== "approved") {
      return badRequest(
        "Somente publicações aprovadas podem ser agendadas."
      );
    }
    if (draft.scheduledPost) {
      return badRequest("Esta publicação já possui um agendamento.");
    }

    const account = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!account) return badRequest("Conta social inválida.");

    const post = await prisma.scheduledPost.create({
      data: {
        draftId,
        socialAccountId,
        scheduledAt,
        timezone: toStr(body.timezone, "America/Sao_Paulo") as string,
        status: "scheduled",
      },
      include: {
        draft: { select: { id: true, title: true, pillar: true } },
        socialAccount: {
          select: { id: true, platform: true, handle: true, name: true },
        },
      },
    });

    await prisma.contentDraft.update({
      where: { id: draftId },
      data: { status: "scheduled" },
    });

    await logAudit({
      userId: user.id,
      action: "schedule",
      entity: "ScheduledPost",
      entityId: post.id,
      details: draft.title,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
