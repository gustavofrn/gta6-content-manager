import { NextResponse } from "next/server";
import { auth } from "./auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
};

/**
 * Retorna o usuário autenticado (a partir da sessão JWT) ou null.
 * Use no início de cada route handler / server component protegido.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export const unauthorized = () =>
  NextResponse.json({ error: "Não autenticado" }, { status: 401 });

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const notFound = (message = "Recurso não encontrado") =>
  NextResponse.json({ error: message }, { status: 404 });

export const serverError = (error: unknown) => {
  console.error("[api] erro interno:", error);
  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 }
  );
};

/**
 * Lê e valida um corpo JSON. Lança erro descritivo quando inválido.
 */
export async function readJson<T = Record<string, unknown>>(
  req: Request
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Corpo da requisição inválido (JSON esperado).");
  }
}

export function toInt(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function toStr(value: unknown, fallback: string | null = null) {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length ? s : fallback;
}
