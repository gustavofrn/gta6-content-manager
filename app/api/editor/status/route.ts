import { NextResponse } from "next/server";
import { getSessionUser, unauthorized, serverError } from "@/lib/api";
import { checkFfmpeg } from "@/lib/video";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const ffmpeg = await checkFfmpeg();
    return NextResponse.json({ ffmpeg });
  } catch (error) {
    return serverError(error);
  }
}
