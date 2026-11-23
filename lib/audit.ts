import { prisma } from "./prisma";

type AuditParams = {
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
};

/** Registra uma entrada no log de auditoria. Nunca lança erro. */
export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        details: params.details ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] falha ao registrar log:", error);
  }
}

type NotifyParams = {
  userId: string;
  type: string;
  title: string;
  message: string;
};

/** Cria uma notificação interna. Nunca lança erro. */
export async function notify(params: NotifyParams) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });
  } catch (error) {
    console.error("[notify] falha ao criar notificação:", error);
  }
}
