import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  readJson,
  toStr,
  toInt,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const publishedPostId = req.nextUrl.searchParams.get("publishedPostId");
    const records = await prisma.engagementRecord.findMany({
      where: publishedPostId ? { publishedPostId } : {},
      orderBy: { recordedAt: "desc" },
      include: {
        publishedPost: {
          select: {
            id: true,
            url: true,
            publishedAt: true,
            scheduledPost: {
              select: {
                socialAccount: { select: { platform: true, handle: true } },
                draft: { select: { title: true } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json(records);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const publishedPostId = toStr(body.publishedPostId);
    if (!publishedPostId) return badRequest("Selecione a publicação.");

    const post = await prisma.publishedPost.findUnique({
      where: { id: publishedPostId },
    });
    if (!post) return badRequest("Publicação inválida.");

    const record = await prisma.engagementRecord.create({
      data: {
        publishedPostId,
        likes: toInt(body.likes, 0) ?? 0,
        comments: toInt(body.comments, 0) ?? 0,
        shares: toInt(body.shares, 0) ?? 0,
        saves: toInt(body.saves, 0) ?? 0,
        views: toInt(body.views, 0) ?? 0,
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "EngagementRecord",
      entityId: record.id,
      details: `Publicação ${publishedPostId}`,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
