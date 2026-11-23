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
    const snapshots = await prisma.metricSnapshot.findMany({
      where: publishedPostId ? { publishedPostId } : {},
      orderBy: { recordedAt: "desc" },
      include: {
        publishedPost: {
          select: {
            id: true,
            url: true,
            scheduledPost: { select: { draft: { select: { title: true } } } },
          },
        },
        experiment: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(snapshots);
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

    const experimentId = toStr(body.experimentId);
    if (experimentId) {
      const experiment = await prisma.experiment.findUnique({
        where: { id: experimentId },
      });
      if (!experiment) return badRequest("Experimento inválido.");
    }

    const snapshot = await prisma.metricSnapshot.create({
      data: {
        publishedPostId,
        views12h: toInt(body.views12h),
        views24h: toInt(body.views24h),
        views72h: toInt(body.views72h),
        followersAtRead: toInt(body.followersAtRead),
        experimentId,
        notes: toStr(body.notes),
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "MetricSnapshot",
      entityId: snapshot.id,
      details: `Publicação ${publishedPostId}`,
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
