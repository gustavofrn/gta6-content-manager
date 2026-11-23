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

const mediaAssetSelect = {
  select: { id: true, type: true, url: true, durationSec: true },
} as const;

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const mediaAssetId = req.nextUrl.searchParams.get("mediaAssetId");
    const clips = await prisma.mediaClip.findMany({
      where: mediaAssetId ? { mediaAssetId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { mediaAsset: mediaAssetSelect },
    });
    return NextResponse.json(clips);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const mediaAssetId = toStr(body.mediaAssetId);
    const title = toStr(body.title);
    const startSec = toInt(body.startSec, 0) ?? 0;
    const endSec = toInt(body.endSec, null);
    const caption = toStr(body.caption);

    if (!mediaAssetId) return badRequest("Selecione a mídia de origem.");
    if (!title) return badRequest("Informe o título do clipe.");
    if (endSec === null) return badRequest("Informe o tempo final do clipe (s).");
    if (startSec < 0)
      return badRequest("O tempo inicial não pode ser negativo.");
    if (endSec <= startSec)
      return badRequest("O tempo final deve ser maior que o inicial.");

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      select: { id: true },
    });
    if (!asset) return badRequest("Mídia de origem não encontrada.");

    const clip = await prisma.mediaClip.create({
      data: {
        mediaAssetId,
        title,
        startSec,
        endSec,
        caption,
        status: "planned",
      },
      include: { mediaAsset: mediaAssetSelect },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "MediaClip",
      entityId: clip.id,
      details: `${title} (${startSec}s–${endSec}s)`,
    });

    return NextResponse.json(clip, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
