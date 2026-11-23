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
  toInt,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) return notFound("Mídia não encontrada.");

    const body = await readJson(req);
    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: {
        type: toStr(body.type, existing.type) as string,
        url: toStr(body.url, existing.url) as string,
        creatorId:
          body.creatorId === undefined
            ? existing.creatorId
            : toStr(body.creatorId),
        durationSec:
          body.durationSec === undefined
            ? existing.durationSec
            : toInt(body.durationSec, null),
        width:
          body.width === undefined ? existing.width : toInt(body.width, null),
        height:
          body.height === undefined ? existing.height : toInt(body.height, null),
      },
      include: { creator: { select: { id: true, name: true, handle: true } } },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "MediaAsset",
      entityId: id,
      details: asset.url,
    });

    return NextResponse.json(asset);
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
    const existing = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { _count: { select: { drafts: true } } },
    });
    if (!existing) return notFound("Mídia não encontrada.");
    if (existing._count.drafts > 0) {
      return badRequest(
        "Não é possível excluir: existem publicações usando esta mídia."
      );
    }
    await prisma.mediaPermission.deleteMany({ where: { mediaAssetId: id } });
    await prisma.mediaAsset.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "MediaAsset",
      entityId: id,
      details: existing.url,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
