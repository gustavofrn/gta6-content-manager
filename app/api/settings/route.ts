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
    const settings = await prisma.systemSetting.findMany({
      orderBy: { category: "asc" },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return serverError(error);
  }
}

type SettingInput = { key?: unknown; value?: unknown; category?: unknown };

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson<{ settings?: SettingInput[] }>(req);
    const list = Array.isArray(body.settings) ? body.settings : [];
    if (list.length === 0) {
      return badRequest("Nenhuma configuração informada.");
    }

    const updated = [];
    for (const item of list) {
      const key = toStr(item.key);
      if (!key) continue;
      const value =
        item.value === undefined || item.value === null
          ? ""
          : String(item.value);
      const category = toStr(item.category);

      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value, ...(category ? { category } : {}) },
        create: { key, value, category },
      });
      updated.push(setting);
    }

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "SystemSetting",
      details: `Atualizou ${updated.length} configuração(ões)`,
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
