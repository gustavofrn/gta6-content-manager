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
import { generateIdeas, isPillar } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const pillar = toStr(body.pillar, "news") as string;
    const count = toInt(body.count, 5) ?? 5;

    if (!isPillar(pillar)) return badRequest("Pilar inválido.");

    const { ideas, provider } = await generateIdeas(pillar, count);

    const created = await prisma.$transaction(
      ideas.map((idea) =>
        prisma.contentIdea.create({
          data: {
            title: idea.title,
            description: idea.description,
            pillar,
            userId: user.id,
            status: "idea",
          },
        })
      )
    );

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "ContentIdea",
      details: `${created.length} ideia(s) geradas para o pilar ${pillar}.`,
    });

    return NextResponse.json({ ideas: created, provider }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
