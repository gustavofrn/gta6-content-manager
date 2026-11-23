import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { checkFfmpeg, exportClip, mediaAbsolutePath } from "@/lib/video";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const mediaAssetSelect = {
  select: { id: true, type: true, url: true, durationSec: true },
} as const;

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const clip = await prisma.mediaClip.findUnique({
      where: { id },
      include: {
        mediaAsset: {
          include: {
            permissions: {
              select: {
                granted: true,
                expiresAt: true,
                license: true,
                restrictions: true,
                grantedAt: true,
                creatorId: true,
              },
            },
          },
        },
      },
    });
    if (!clip) return notFound("Clipe não encontrado.");

    const hasValidPermission = clip.mediaAsset.permissions.some(
      (permission) =>
        permission.granted &&
        (!permission.expiresAt || permission.expiresAt > new Date())
    );
    if (!hasValidPermission) {
      return badRequest(
        "Registre a autorização de uso desta mídia antes de exportar."
      );
    }

    if (!clip.mediaAsset.storageKey) {
      return badRequest(
        "Mídia de origem não está disponível localmente (apenas URL externa)."
      );
    }

    if (!(await checkFfmpeg())) {
      return badRequest("ffmpeg não está instalado no servidor.");
    }

    await prisma.mediaClip.update({
      where: { id },
      data: { status: "exporting", errorMessage: null },
    });

    const outputStorageKey = `library/clip-${id}.mp4`;
    const outputPath = mediaAbsolutePath(outputStorageKey);
    const inputPath = mediaAbsolutePath(clip.mediaAsset.storageKey);

    try {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await exportClip({
        inputPath,
        outputPath,
        startSec: clip.startSec,
        endSec: clip.endSec,
      });

      const sourcePermission = clip.mediaAsset.permissions.find(
        (permission) =>
          permission.granted &&
          (!permission.expiresAt || permission.expiresAt > new Date())
      );
      if (!sourcePermission) {
        throw new Error("A permissão da mídia de origem expirou.");
      }

      const outputUrl = `/api/clips/${id}/file`;
      const outputPermission = {
        granted: true,
        license: "derived_from_authorized_source",
        restrictions: [
          `Derivado da mídia ${clip.mediaAsset.id}.`,
          sourcePermission.restrictions,
        ]
          .filter(Boolean)
          .join(" "),
        grantedAt: new Date(),
        expiresAt: sourcePermission.expiresAt,
        creatorId:
          clip.mediaAsset.creatorId ?? sourcePermission.creatorId ?? null,
      };
      const existingOutput = await prisma.mediaAsset.findFirst({
        where: { url: outputUrl },
      });
      if (existingOutput) {
        await prisma.mediaPermission.deleteMany({
          where: { mediaAssetId: existingOutput.id },
        });
        await prisma.mediaAsset.update({
          where: { id: existingOutput.id },
          data: {
            storageKey: outputStorageKey,
            durationSec: clip.endSec - clip.startSec,
            width: 1080,
            height: 1920,
            permissions: { create: outputPermission },
          },
        });
      } else {
        await prisma.mediaAsset.create({
          data: {
            id: randomUUID(),
            type: "video",
            url: outputUrl,
            storageKey: outputStorageKey,
            creatorId: clip.mediaAsset.creatorId,
            durationSec: clip.endSec - clip.startSec,
            width: 1080,
            height: 1920,
            permissions: { create: outputPermission },
          },
        });
      }

      const updated = await prisma.mediaClip.update({
        where: { id },
        data: {
          status: "exported",
          outputStorageKey,
          outputUrl,
          errorMessage: null,
        },
        include: { mediaAsset: mediaAssetSelect },
      });

      await logAudit({
        userId: user.id,
        action: "export",
        entity: "MediaClip",
        entityId: id,
        details: outputStorageKey,
      });

      return NextResponse.json(updated);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao exportar o clipe.";
      const failed = await prisma.mediaClip.update({
        where: { id },
        data: { status: "failed", errorMessage: message },
        include: { mediaAsset: mediaAssetSelect },
      });

      await logAudit({
        userId: user.id,
        action: "export_failed",
        entity: "MediaClip",
        entityId: id,
        details: message,
      });

      return NextResponse.json(failed);
    }
  } catch (error) {
    return serverError(error);
  }
}
