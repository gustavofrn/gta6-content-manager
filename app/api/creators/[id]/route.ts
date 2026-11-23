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
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.creator.findUnique({ where: { id } });
    if (!existing) return notFound("Criador não encontrado.");

    const body = await readJson(req);
    const creator = await prisma.creator.update({
      where: { id },
      data: {
        name: toStr(body.name, existing.name) as string,
        platform: toStr(body.platform, existing.platform) as string,
        handle: toStr(body.handle, existing.handle) as string,
        url: body.url === undefined ? existing.url : toStr(body.url),
        canReuse:
          body.canReuse === undefined
            ? existing.canReuse
            : Boolean(body.canReuse),
        permissionNotes:
          body.permissionNotes === undefined
            ? existing.permissionNotes
            : toStr(body.permissionNotes),
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "Creator",
      entityId: id,
      details: creator.name,
    });

    return NextResponse.json(creator);
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
    const existing = await prisma.creator.findUnique({
      where: { id },
      include: { _count: { select: { mediaAssets: true } } },
    });
    if (!existing) return notFound("Criador não encontrado.");
    if (existing._count.mediaAssets > 0) {
      return badRequest(
        "Não é possível excluir: existem mídias vinculadas a este criador."
      );
    }
    await prisma.creator.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "Creator",
      entityId: id,
      details: existing.name,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
