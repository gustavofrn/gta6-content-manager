import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  readJson,
  toStr,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

const LEARNING_TYPES = ["win", "loss", "rule", "change"];

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const type = req.nextUrl.searchParams.get("type");
    const records = await prisma.learningRecord.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: "desc" },
      include: { experiment: { select: { id: true, name: true } } },
    });
    return NextResponse.json(records);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const type = toStr(body.type);
    const title = toStr(body.title);
    const description = toStr(body.description);
    if (!type || !LEARNING_TYPES.includes(type)) {
      return badRequest("Tipo de aprendizado inválido.");
    }
    if (!title) return badRequest("Informe o título.");
    if (!description) return badRequest("Informe a descrição.");

    const experimentId = toStr(body.experimentId);
    if (experimentId) {
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

    const learning = await prisma.learningRecord.create({
      data: { type, title, description, experimentId },
      include: { experiment: { select: { id: true, name: true } } },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "LearningRecord",
      entityId: learning.id,
      details: title,
    });

    return NextResponse.json(learning, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
