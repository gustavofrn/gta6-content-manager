import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  readJson,
  toStr,
} from "@/lib/api";
import { improveCaption } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const text = toStr(body.text);
    const platform = toStr(body.platform);

    if (!text) return badRequest("Informe o texto para melhorar.");

    const { text: improved, provider } = await improveCaption(text, platform);

    return NextResponse.json({ text: improved, provider });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
