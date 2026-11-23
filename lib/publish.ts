/**
 * Publicação real de conteúdo.
 *
 * Nenhuma publicação é automática: só "publicamos" quando o usuário solicita.
 * - Modo "webhook": existe um PUBLISH_WEBHOOK_URL configurado e o conteúdo é
 *   entregue via POST a esse endpoint.
 * - Modo "manual": sem webhook, a publicação é apenas registrada manualmente
 *   pelo operador (com URL opcional).
 */

export type PublishMode = "webhook" | "manual";

export function publishMode(): PublishMode {
  return process.env.PUBLISH_WEBHOOK_URL ? "webhook" : "manual";
}

export type PublishPayload = {
  draftId?: string;
  title?: string;
  caption?: string | null;
  platform?: string;
  handle?: string;
  scheduledAt?: string;
  [key: string]: unknown;
};

export type PublishResult = {
  ok: boolean;
  error?: string;
  platformPostId?: string;
};

/**
 * Tenta publicar o conteúdo. Em modo webhook faz o POST (timeout de 20s);
 * em modo manual apenas confirma o registro.
 */
export async function attemptPublish({
  url,
  payload,
}: {
  url?: string | null;
  payload: PublishPayload;
}): Promise<PublishResult> {
  const webhookUrl = process.env.PUBLISH_WEBHOOK_URL;
  if (!webhookUrl) {
    // Publicação manual: o operador registra o resultado.
    return { ok: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url ?? null, ...payload }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, error: `Webhook respondeu com HTTP ${res.status}.` };
    }

    let data: { ok?: boolean; id?: string; error?: string } | null = null;
    try {
      data = (await res.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };
    } catch {
      // Resposta sem corpo JSON: sucesso se o HTTP foi 2xx.
      return { ok: true };
    }

    if (data && data.ok === false) {
      return { ok: false, error: data.error ?? "Webhook retornou falha." };
    }

    return { ok: true, platformPostId: data?.id };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Tempo limite excedido ao contatar o webhook de publicação."
          : error.message
        : "Erro desconhecido ao publicar.";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
