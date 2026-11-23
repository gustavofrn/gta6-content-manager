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

const VALID_TYPES = ["win", "loss", "rule", "change"];

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.learningRecord.findUnique({ where: { id } });
    if (!existing) return notFound("Aprendizado não encontrado.");

    const body = await readJson(req);
    const type = toStr(body.type, existing.type) as string;
    if (!VALID_TYPES.includes(type)) {
      return badRequest("Tipo de aprendizado inválido.");
    }

    const experimentId =
      body.experimentId === undefined
        ? existing.experimentId
        : toStr(body.experimentId);
    if (experimentId && experimentId !== existing.experimentId) {
      const experiment = await prisma.experiment.findUnique({
        where: { id: experimentId },
        include: { learning: true },
      });
      if (!experiment) return badRequest("Experimento inválido.");
      if (experiment.learning) {
        return badRequest(
          "Este experimento já possui um aprendizado vinculado."
        );
      }
    }

    const learning = await prisma.learningRecord.update({
      where: { id },
      data: {
        type,
        title: toStr(body.title, existing.title) as string,
        description: toStr(body.description, existing.description) as string,
        experimentId,
      },
      include: { experiment: { select: { id: true, name: true } } },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "LearningRecord",
      entityId: id,
      details: learning.title,
    });

    return NextResponse.json(learning);
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
    const existing = await prisma.learningRecord.findUnique({ where: { id } });
    if (!existing) return notFound("Aprendizado não encontrado.");

    await prisma.learningRecord.delete({ where: { id } });

    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "LearningRecord",
      entityId: id,
      details: existing.title,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
