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
    const type = req.nextUrl.searchParams.get("type");
    const assets = await prisma.mediaAsset.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, handle: true } },
        _count: { select: { drafts: true } },
      },
    });
    return NextResponse.json(assets);
  } catch (error) {
    return serverError(error);
  }
}

/** Cria um asset de mídia a partir de uma URL externa (sem upload de arquivo). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const url = toStr(body.url);
    const type = toStr(body.type, "video") as string;
    if (!url) return badRequest("Informe a URL da mídia.");
    if (body.permissionConfirmed !== true) {
      return badRequest(
        "Confirme que você criou o material ou tem autorização para usá-lo."
      );
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        type,
        url,
        storageKey: null,
        creatorId: toStr(body.creatorId),
        durationSec: toInt(body.durationSec, null),
        width: toInt(body.width, null),
        height: toInt(body.height, null),
        permissions: {
          create: {
            granted: true,
            license: "user_attestation",
            restrictions: toStr(body.permissionNotes),
            grantedAt: new Date(),
            creatorId: toStr(body.creatorId),
          },
        },
      },
      include: { creator: { select: { id: true, name: true, handle: true } } },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "MediaAsset",
      entityId: asset.id,
      details: url,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
