"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/format";

export type AuditLog = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string | Date;
  user: { id: string; name: string; email: string };
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string | Date;
};

const ACTIONS = [
  { value: "", label: "Todas as ações" },
  { value: "create", label: "Criar" },
  { value: "update", label: "Atualizar" },
  { value: "delete", label: "Excluir" },
  { value: "run", label: "Executar" },
  { value: "read", label: "Ler" },
  { value: "unread", label: "Marcar não lida" },
  { value: "read_all", label: "Ler todas" },
];

const LIMITS = ["50", "100", "200", "500"];

type Props = {
  initialLogs: AuditLog[];
  initialNotifications: Notification[];
};

export default function LogsClient({ initialLogs, initialNotifications }: Props) {
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [notifications, setNotifications] = useState<Notification[]>(
    initialNotifications
  );

  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [limit, setLimit] = useState("100");
  const [search, setSearch] = useState("");

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    params.set("limit", limit);

    apiFetch<AuditLog[]>(`/api/logs?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar logs.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entity, action, limit]);

  async function loadNotifications(onlyUnread: boolean) {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<Notification[]>(
        `/api/notifications${onlyUnread ? "?unread=1" : ""}`
      );
      setNotifications(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar notificações.");
    } finally {
      setLoading(false);
    }
  }

  function toggleUnread() {
    const next = !unreadOnly;
    setUnreadOnly(next);
    loadNotifications(next);
  }

  async function markRead(id: string, read: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ read }),
      });
      if (unreadOnly && read) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read } : n))
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      if (unreadOnly) {
        setNotifications([]);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao marcar como lidas.");
    } finally {
      setBusy(false);
    }
  }

  const term = search.trim().toLowerCase();
  const filteredLogs = term
    ? logs.filter((l) =>
        [l.user?.name, l.user?.email, l.action, l.entity, l.details]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      )
    : logs;

  const unreadCount = initialNotifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs e notificações"
        description="Histórico de auditoria das operações e notificações internas do sistema."
      />

      {error && <p className="text-sm text-brand-red-soft">{error}</p>}

      {/* Filtros */}
      <section className="card p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-text-soft mb-1">
              Entidade
            </span>
            <input
              className="input w-full"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="Ex.: AutomationJob"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-text-soft mb-1">
              Ação
            </span>
            <select
              className="input w-full"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-text-soft mb-1">
              Limite
            </span>
            <select
              className="input w-full"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l} registros
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-text-soft mb-1">
              Busca
            </span>
            <input
              className="input w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Usuário, ação, detalhes..."
            />
          </label>
        </div>
      </section>

      {/* Tabela de logs */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Nenhum log encontrado"
          description="Ajuste os filtros ou realize operações no sistema para gerar registros de auditoria."
        />
      ) : (
        <Table
          head={["Data", "Usuário", "Ação", "Entidade", "Detalhes"]}
        >
          {filteredLogs.map((log) => (
            <Tr key={log.id}>
              <Td className="text-text-soft whitespace-nowrap">
                {formatDateTime(log.createdAt)}
              </Td>
              <Td>
                <p className="text-text">{log.user?.name ?? "—"}</p>
                <p className="text-xs text-text-muted">
                  {log.user?.email ?? ""}
                </p>
              </Td>
              <Td>
                <span className="badge border border-border bg-bg-hover text-text-soft">
                  {log.action}
                </span>
              </Td>
              <Td className="text-text-soft">
                {log.entity ?? "—"}
                {log.entityId && (
                  <span className="block text-xs text-text-muted">
                    {log.entityId}
                  </span>
                )}
              </Td>
              <Td className="text-text-soft max-w-md">{log.details ?? "—"}</Td>
            </Tr>
          ))}
        </Table>
      )}

      {/* Notificações */}
      <section className="space-y-4">
        <PageHeader
          title="Notificações"
          description={
            unreadCount > 0
              ? `${unreadCount} notificação(ões) não lida(s).`
              : "Você está em dia."
          }
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={toggleUnread}
                disabled={loading}
              >
                {unreadOnly ? "Ver todas" : "Apenas não lidas"}
              </Button>
              <Button onClick={markAllRead} disabled={busy}>
                Marcar todas como lidas
              </Button>
            </div>
          }
        />

        {notifications.length === 0 ? (
          <EmptyState
            title="Nenhuma notificação"
            description="Notificações geradas pelas automações aparecerão aqui."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`card p-4 flex items-start justify-between gap-4 ${
                  n.read ? "" : "border-brand-purple/40"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-purple-soft shrink-0" />
                    )}
                    <p className="font-medium text-text truncate">{n.title}</p>
                  </div>
                  <p className="text-sm text-text-soft mt-1">{n.message}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {formatDateTime(n.createdAt)} · {n.type}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="!py-1 !px-3 text-xs shrink-0"
                  disabled={busy || n.read}
                  onClick={() => markRead(n.id, true)}
                >
                  {n.read ? "Lida" : "Marcar como lida"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
