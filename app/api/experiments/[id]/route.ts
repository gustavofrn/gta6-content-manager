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

const VALID_STATUS = ["running", "completed", "cancelled"];

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.experiment.findUnique({ where: { id } });
    if (!existing) return notFound("Experimento não encontrado.");

    const body = await readJson(req);
    const status = toStr(body.status, existing.status) as string;
    if (!VALID_STATUS.includes(status)) {
      return badRequest("Status inválido.");
    }

    let endedAt = existing.endedAt;
    if (status === "completed" || status === "cancelled") {
      endedAt = existing.endedAt ?? new Date();
    } else if (status === "running") {
      endedAt = null;
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: {
        name: toStr(body.name, existing.name) as string,
        hypothesis:
          body.hypothesis === undefined
            ? existing.hypothesis
            : toStr(body.hypothesis),
        status,
        endedAt,
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "Experiment",
      entityId: id,
      details: experiment.name,
    });

    return NextResponse.json(experiment);
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
    const existing = await prisma.experiment.findUnique({ where: { id } });
    if (!existing) return notFound("Experimento não encontrado.");

    await prisma.experiment.delete({ where: { id } });

    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "Experiment",
      entityId: id,
      details: existing.name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
