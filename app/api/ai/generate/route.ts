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
import { logAudit, notify } from "@/lib/audit";
import { generateDraftContent, isPillar } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const factId = toStr(body.factId);
    const pillar = toStr(body.pillar, "news") as string;
    const platform = toStr(body.platform);

    if (!factId) return badRequest("Selecione um fato.");
    if (!isPillar(pillar)) return badRequest("Pilar inválido.");

    const fact = await prisma.verifiedFact.findUnique({
      where: { id: factId },
      include: { source: { select: { name: true } } },
    });
    if (!fact) return notFound("Fato não encontrado.");

    const { draft, provider } = await generateDraftContent(
      {
        title: fact.title,
        content: fact.content,
        source: fact.source?.name ?? null,
        url: fact.url,
      },
      { pillar, platform }
    );

    const created = await prisma.contentDraft.create({
      data: {
        title: draft.title,
        caption: draft.caption,
        hook: draft.hook,
        pillar,
        factId: fact.id,
        userId: user.id,
        status: "draft",
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "ContentDraft",
      entityId: created.id,
      details: created.title,
    });

    await notify({
      userId: user.id,
      type: "draft_created",
      title: "Rascunho gerado",
      message: `Novo rascunho criado a partir de "${fact.title}".`,
    });

    return NextResponse.json({ draft: created, provider }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
