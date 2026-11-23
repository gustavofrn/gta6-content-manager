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

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        revisions: { orderBy: { createdAt: "desc" } },
        approvals: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        scheduledPost: {
          include: {
            socialAccount: {
              select: { id: true, platform: true, handle: true, name: true },
            },
            publishedPost: true,
            attempts: { orderBy: { attemptedAt: "desc" } },
          },
        },
        fact: { select: { id: true, title: true } },
        mediaAsset: { select: { id: true, url: true, type: true } },
      },
    });
    if (!draft) return notFound("Publicação não encontrada.");
    return NextResponse.json(draft);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.contentDraft.findUnique({ where: { id } });
    if (!existing) return notFound("Publicação não encontrada.");

    const body = await readJson(req);
    const title = toStr(body.title, existing.title) as string;
    const caption =
      body.caption === undefined ? existing.caption : toStr(body.caption);

    // Registra revisão quando o título ou a legenda mudam.
    if (title !== existing.title || caption !== existing.caption) {
      const changes: Record<string, { from: string | null; to: string | null }> =
        {};
      if (title !== existing.title) {
        changes.title = { from: existing.title, to: title };
      }
      if (caption !== existing.caption) {
        changes.caption = { from: existing.caption, to: caption };
      }
      await prisma.contentRevision.create({
        data: {
          draftId: id,
          title: existing.title,
          caption: existing.caption,
          changes: JSON.stringify(changes),
        },
      });
    }

    const draft = await prisma.contentDraft.update({
      where: { id },
      data: {
        title,
        caption,
        pillar: toStr(body.pillar, existing.pillar) as string,
        hook: body.hook === undefined ? existing.hook : toStr(body.hook),
        factId: body.factId === undefined ? existing.factId : toStr(body.factId),
        mediaAssetId:
          body.mediaAssetId === undefined
            ? existing.mediaAssetId
            : toStr(body.mediaAssetId),
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "ContentDraft",
      entityId: id,
      details: draft.title,
    });

    return NextResponse.json(draft);
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.contentDraft.findUnique({ where: { id } });
    if (!existing) return notFound("Publicação não encontrada.");
    if (existing.status === "scheduled" || existing.status === "published") {
      return badRequest(
        "Não é possível excluir uma publicação agendada ou já publicada."
      );
    }

    await prisma.$transaction([
      prisma.contentRevision.deleteMany({ where: { draftId: id } }),
      prisma.approval.deleteMany({ where: { draftId: id } }),
      prisma.contentDraft.delete({ where: { id } }),
    ]);

    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "ContentDraft",
      entityId: id,
      details: existing.title,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
