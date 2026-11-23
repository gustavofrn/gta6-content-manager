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
    const existing = await prisma.verifiedFact.findUnique({ where: { id } });
    if (!existing) return notFound("Fato não encontrado.");

    const body = await readJson(req);
    const publishedAt =
      body.publishedAt === undefined
        ? existing.publishedAt
        : toStr(body.publishedAt)
          ? new Date(String(body.publishedAt))
          : null;

    const fact = await prisma.verifiedFact.update({
      where: { id },
      data: {
        title: toStr(body.title, existing.title) as string,
        content: toStr(body.content, existing.content) as string,
        url: body.url === undefined ? existing.url : toStr(body.url),
        publishedAt,
        reliability:
          body.reliability === undefined
            ? existing.reliability
            : (toInt(body.reliability, existing.reliability) as number),
        approvalStatus: toStr(
          body.approvalStatus,
          existing.approvalStatus
        ) as string,
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "VerifiedFact",
      entityId: id,
      details: fact.title,
    });

    return NextResponse.json(fact);
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
    const existing = await prisma.verifiedFact.findUnique({
      where: { id },
      include: { _count: { select: { drafts: true } } },
    });
    if (!existing) return notFound("Fato não encontrado.");
    if (existing._count.drafts > 0) {
      return badRequest(
        "Não é possível excluir: existem publicações vinculadas a este fato."
      );
    }
    await prisma.verifiedFact.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "VerifiedFact",
      entityId: id,
      details: existing.title,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
