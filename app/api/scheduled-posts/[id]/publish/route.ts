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
import { logAudit, notify } from "@/lib/audit";
import { attemptPublish } from "@/lib/publish";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const post = await prisma.scheduledPost.findUnique({
      where: { id },
      include: {
        draft: true,
        socialAccount: true,
        publishedPost: true,
      },
    });
    if (!post) return notFound("Agendamento não encontrado.");
    if (post.publishedPost) {
      return badRequest("Esta publicação já foi registrada como publicada.");
    }

    const body = await readJson(req);
    const url = toStr(body.url);
    const platformPostId = toStr(body.platformPostId);

    const result = await attemptPublish({
      url,
      payload: {
        draftId: post.draftId,
        title: post.draft.title,
        caption: post.draft.caption,
        platform: post.socialAccount.platform,
        handle: post.socialAccount.handle,
        scheduledAt: post.scheduledAt.toISOString(),
      },
    });

    if (result.ok) {
      const publishedPost = await prisma.publishedPost.create({
        data: {
          scheduledPostId: id,
          url,
          platformPostId: platformPostId ?? result.platformPostId ?? null,
          publishedAt: new Date(),
        },
      });

      await prisma.publicationAttempt.create({
        data: { scheduledPostId: id, status: "success" },
      });

      await prisma.scheduledPost.update({
        where: { id },
        data: { status: "published" },
      });

      await prisma.contentDraft.update({
        where: { id: post.draftId },
        data: { status: "published" },
      });

      await notify({
        userId: post.draft.userId,
        type: "publish",
        title: "Publicação registrada",
        message: `"${post.draft.title}" foi publicada em ${post.socialAccount.platform}.`,
      });

      await logAudit({
        userId: user.id,
        action: "publish",
        entity: "PublishedPost",
        entityId: publishedPost.id,
        details: post.draft.title,
      });

      return NextResponse.json({ ok: true, publishedPost });
    }

    await prisma.publicationAttempt.create({
      data: {
        scheduledPostId: id,
        status: "failed",
        errorMessage: result.error ?? "Falha ao publicar.",
      },
    });

    await prisma.scheduledPost.update({
      where: { id },
      data: { status: "failed" },
    });

    await logAudit({
      userId: user.id,
      action: "publish_failed",
      entity: "ScheduledPost",
      entityId: id,
      details: result.error,
    });

    return NextResponse.json(
      { ok: false, error: result.error ?? "Falha ao publicar." },
      { status: 502 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
