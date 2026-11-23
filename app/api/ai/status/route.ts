import { NextResponse } from "next/server";
import { getSessionUser, unauthorized, serverError } from "@/lib/api";
import { getAiProviderInfo } from "@/lib/ai";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(getAiProviderInfo());
  } catch (error) {
    return serverError(error);
  }
}
