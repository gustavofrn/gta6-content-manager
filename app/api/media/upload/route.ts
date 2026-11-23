import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  toStr,
  toInt,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";
import {
  extensionFor,
  mediaTypeFor,
  saveMediaBuffer,
} from "@/lib/media-store";

export const runtime = "nodejs";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return badRequest("Envie um arquivo no campo 'file'.");
    }
    if (file.size > MAX_BYTES) {
      return badRequest("Arquivo excede o limite de 200 MB.");
    }
    if (form.get("permissionConfirmed") !== "true") {
      return badRequest(
        "Confirme que você criou o material ou tem autorização para usá-lo."
      );
    }

    const ext = extensionFor(file.type, file.name);
    const id = randomUUID();
    const filename = `${id}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveMediaBuffer(filename, buffer);

    const storageKey = `library/${filename}`;
    const type = mediaTypeFor(file.type);

    const asset = await prisma.mediaAsset.create({
      data: {
        id,
        type: type === "other" ? toStr(form.get("type"), "video")! : type,
        url: `/api/media/file/${id}`,
        storageKey,
        creatorId: toStr(form.get("creatorId")),
        durationSec: toInt(form.get("durationSec"), null),
        width: toInt(form.get("width"), null),
        height: toInt(form.get("height"), null),
        permissions: {
          create: {
            granted: true,
            license: "user_attestation",
            restrictions: toStr(form.get("permissionNotes")),
            grantedAt: new Date(),
            creatorId: toStr(form.get("creatorId")),
          },
        },
      },
      include: { creator: { select: { id: true, name: true, handle: true } } },
    });

    await logAudit({
      userId: user.id,
      action: "upload",
      entity: "MediaAsset",
      entityId: asset.id,
      details: file.name,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
