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
    const existing = await prisma.contentSource.findUnique({ where: { id } });
    if (!existing) return notFound("Fonte não encontrada.");

    const body = await readJson(req);
    const source = await prisma.contentSource.update({
      where: { id },
      data: {
        name: toStr(body.name, existing.name) as string,
        type: toStr(body.type, existing.type) as string,
        url: body.url === undefined ? existing.url : toStr(body.url),
        platform:
          body.platform === undefined ? existing.platform : toStr(body.platform),
        reliability:
          body.reliability === undefined
            ? existing.reliability
            : (toInt(body.reliability, existing.reliability) as number),
        active:
          body.active === undefined ? existing.active : Boolean(body.active),
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "ContentSource",
      entityId: id,
      details: source.name,
    });

    return NextResponse.json(source);
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
    const existing = await prisma.contentSource.findUnique({
      where: { id },
      include: { _count: { select: { facts: true } } },
    });
    if (!existing) return notFound("Fonte não encontrada.");
    if (existing._count.facts > 0) {
      return badRequest(
        "Não é possível excluir: existem fatos vinculados a esta fonte."
      );
    }

    await prisma.contentSource.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "ContentSource",
      entityId: id,
      details: existing.name,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
