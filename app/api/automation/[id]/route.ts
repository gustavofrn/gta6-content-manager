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

const AUTOMATION_TYPES = [
  "approval_reminder",
  "source_check",
  "news_detection",
  "metrics_collection",
];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.automationJob.findUnique({ where: { id } });
    if (!existing) return notFound("Automação não encontrada.");

    const body = await readJson(req);
    const type =
      body.type === undefined ? existing.type : (toStr(body.type) as string);
    if (!type || !AUTOMATION_TYPES.includes(type)) {
      return badRequest("Informe um tipo de automação válido.");
    }

    const job = await prisma.automationJob.update({
      where: { id },
      data: {
        name: toStr(body.name, existing.name) as string,
        type,
        schedule: body.schedule === undefined ? existing.schedule : toStr(body.schedule),
        enabled:
          body.enabled === undefined ? existing.enabled : Boolean(body.enabled),
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "AutomationJob",
      entityId: id,
      details: job.name,
    });

    return NextResponse.json(job);
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
    const existing = await prisma.automationJob.findUnique({ where: { id } });
    if (!existing) return notFound("Automação não encontrada.");

    await prisma.automationJob.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "AutomationJob",
      entityId: id,
      details: existing.name,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
