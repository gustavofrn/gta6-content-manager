import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, notFound, serverError } from "@/lib/api";
import { readMediaFile, mimeForExt } from "@/lib/media-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const clip = await prisma.mediaClip.findUnique({ where: { id } });
    if (!clip || !clip.outputStorageKey)
      return notFound("Arquivo não encontrado.");

    const filename = path.basename(clip.outputStorageKey);
    const buffer = await readMediaFile(filename);
    const mime = mimeForExt(path.extname(filename));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
