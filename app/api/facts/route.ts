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
    const status = req.nextUrl.searchParams.get("status");
    const sourceId = req.nextUrl.searchParams.get("sourceId");
    const facts = await prisma.verifiedFact.findMany({
      where: {
        ...(status ? { approvalStatus: status } : {}),
        ...(sourceId ? { sourceId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { source: { select: { id: true, name: true } } },
    });
    return NextResponse.json(facts);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const title = toStr(body.title);
    const content = toStr(body.content);
    const sourceId = toStr(body.sourceId);
    if (!title) return badRequest("Informe o título do fato.");
    if (!content) return badRequest("Informe o conteúdo do fato.");
    if (!sourceId) return badRequest("Selecione uma fonte.");

    const source = await prisma.contentSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) return badRequest("Fonte inválida.");

    const publishedAt = toStr(body.publishedAt);

    const fact = await prisma.verifiedFact.create({
      data: {
        title,
        content,
        sourceId,
        url: toStr(body.url),
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        reliability: toInt(body.reliability, source.reliability) ?? 0,
        approvalStatus: toStr(body.approvalStatus, "pending") as string,
      },
      include: { source: { select: { id: true, name: true } } },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "VerifiedFact",
      entityId: fact.id,
      details: title,
    });

    return NextResponse.json(fact, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
