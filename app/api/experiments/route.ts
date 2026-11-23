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

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const experiments = await prisma.experiment.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        _count: { select: { metrics: true } },
        learning: true,
      },
    });
    return NextResponse.json(experiments);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const name = toStr(body.name);
    const variable = toStr(body.variable);
    if (!name) return badRequest("Informe o nome do experimento.");
    if (!variable) return badRequest("Informe a variável testada.");

    const experiment = await prisma.experiment.create({
      data: {
        name,
        variable,
        hypothesis: toStr(body.hypothesis),
        status: "running",
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "Experiment",
      entityId: experiment.id,
      details: name,
    });

    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
