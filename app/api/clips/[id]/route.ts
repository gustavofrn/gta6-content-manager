import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
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
import { mediaAbsolutePath } from "@/lib/video";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const mediaAssetSelect = {
  select: { id: true, type: true, url: true, durationSec: true },
} as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.mediaClip.findUnique({ where: { id } });
    if (!existing) return notFound("Clipe não encontrado.");

    const body = await readJson(req);
    const startSec =
      body.startSec === undefined
        ? existing.startSec
        : (toInt(body.startSec, existing.startSec) ?? existing.startSec);
    const endSec =
      body.endSec === undefined
        ? existing.endSec
        : (toInt(body.endSec, existing.endSec) ?? existing.endSec);

    if (startSec < 0)
      return badRequest("O tempo inicial não pode ser negativo.");
    if (endSec <= startSec)
      return badRequest("O tempo final deve ser maior que o inicial.");

    const clip = await prisma.mediaClip.update({
      where: { id },
      data: {
        title: toStr(body.title, existing.title) as string,
        startSec,
        endSec,
        caption:
          body.caption === undefined ? existing.caption : toStr(body.caption),
      },
      include: { mediaAsset: mediaAssetSelect },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "MediaClip",
      entityId: id,
      details: clip.title,
    });

    return NextResponse.json(clip);
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
    const existing = await prisma.mediaClip.findUnique({ where: { id } });
    if (!existing) return notFound("Clipe não encontrado.");

    if (existing.outputStorageKey) {
      try {
        await unlink(mediaAbsolutePath(existing.outputStorageKey));
      } catch {
        // o arquivo exportado pode já não existir — ignora.
      }
    }

    await prisma.mediaClip.delete({ where: { id } });

    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "MediaClip",
      entityId: id,
      details: existing.title,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
