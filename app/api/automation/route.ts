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

const AUTOMATION_TYPES = [
  "approval_reminder",
  "source_check",
  "news_detection",
  "metrics_collection",
];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const jobs = await prisma.automationJob.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(jobs);
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
    const type = toStr(body.type);
    if (!name) return badRequest("Informe o nome da automação.");
    if (!type || !AUTOMATION_TYPES.includes(type)) {
      return badRequest("Informe um tipo de automação válido.");
    }

    const job = await prisma.automationJob.create({
      data: {
        name,
        type,
        schedule: toStr(body.schedule),
        enabled: body.enabled === undefined ? false : Boolean(body.enabled),
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "AutomationJob",
      entityId: job.id,
      details: name,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
