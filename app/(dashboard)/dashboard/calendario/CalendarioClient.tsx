"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDateTime, toDateTimeInput } from "@/lib/format";

export type ScheduledPostItem = {
  id: string;
  draftId: string;
  scheduledAt: string | Date;
  timezone: string;
  status: string;
  draft: { id: string; title: string; pillar: string };
  socialAccount: {
    id: string;
    platform: string;
    handle: string;
    name: string;
  };
  publishedPost: {
    id: string;
    url: string | null;
    publishedAt: string | Date;
  } | null;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = { posts: ScheduledPostItem[] };

export default function CalendarioClient({ posts }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const [selected, setSelected] = useState<ScheduledPostItem | null>(null);
  const [modal, setModal] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [publishUrl, setPublishUrl] = useState("");

  const byDay = useMemo(() => {
    const map: Record<string, ScheduledPostItem[]> = {};
    for (const p of posts) {
      const key = dayKey(new Date(p.scheduledAt));
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [posts]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    setCursor((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 }
    );
  }

  function nextMonth() {
    setCursor((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 }
    );
  }

  function openPost(post: ScheduledPostItem) {
    setError("");
    setSelected(post);
    setRescheduleAt(toDateTimeInput(post.scheduledAt));
    setPublishUrl(post.publishedPost?.url ?? "");
    setModal(true);
  }

  async function reschedule() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/scheduled-posts/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: rescheduleAt }),
      });
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao reagendar.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/scheduled-posts/${selected.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ url: publishUrl || null }),
      });
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao publicar.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!selected) return;
    if (!confirm("Cancelar este agendamento?")) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/scheduled-posts/${selected.id}`, {
        method: "DELETE",
      });
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setBusy(false);
    }
  }

  const future = posts.filter(
    (p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() >= now.getTime()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário editorial"
        description="Visualize os agendamentos por dia, reagende e registre publicações."
      />

      {error && !modal && (
        <p className="text-sm text-brand-red-soft">{error}</p>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 rounded-lg border border-border text-text-soft hover:bg-bg-hover"
          >
            ← Anterior
          </button>
          <h2 className="font-semibold text-text">
            {MONTHS[cursor.month]} de {cursor.year}
          </h2>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 rounded-lg border border-border text-text-soft hover:bg-bg-hover"
          >
            Próximo →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-center text-xs font-medium text-text-muted py-1"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${i}`}
                  className="min-h-[90px] rounded-lg bg-bg-soft/40"
                />
              );
            }
            const key = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
            const items = byDay[key] ?? [];
            const isToday =
              key === dayKey(new Date());
            return (
              <div
                key={key}
                className={`min-h-[90px] rounded-lg border p-1.5 ${
                  isToday
                    ? "border-brand-purple/50 bg-brand-purple/5"
                    : "border-border bg-bg-card"
                }`}
              >
                <p className="text-xs text-text-muted mb-1">{day}</p>
                <div className="space-y-1">
                  {items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPost(p)}
                      className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded bg-brand-purple/15 text-brand-purple-soft hover:bg-brand-purple/25 truncate"
                      title={p.draft.title}
                    >
                      {p.socialAccount.platform} · {p.draft.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">
          Próximos agendamentos ({future.length})
        </h2>
        {future.length === 0 ? (
          <EmptyState
            title="Nenhum agendamento futuro"
            description="Aprove publicações e agende-as para aparecerem aqui."
          />
        ) : (
          <div className="card divide-y divide-border">
            {future.map((p) => (
              <button
                key={p.id}
                onClick={() => openPost(p)}
                className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-bg-hover/40"
              >
                <div>
                  <p className="font-medium text-text">{p.draft.title}</p>
                  <p className="text-xs text-text-muted">
                    {p.socialAccount.platform} · {p.socialAccount.handle}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-soft">
                    {formatDateTime(p.scheduledAt)}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Agendamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Fechar
            </Button>
            <Button variant="secondary" onClick={cancel} disabled={busy}>
              Cancelar agendamento
            </Button>
            <Button onClick={reschedule} disabled={busy}>
              {busy ? "Salvando..." : "Reagendar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {selected && (
            <>
              <div>
                <p className="font-medium text-text">{selected.draft.title}</p>
                <p className="text-xs text-text-muted">
                  {selected.socialAccount.platform} ·{" "}
                  {selected.socialAccount.handle}
                </p>
                <div className="mt-1">
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <Field label="Reagendar para" hint="Horário em America/Sao_Paulo.">
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={rescheduleAt}
                  onChange={(e) => setRescheduleAt(e.target.value)}
                />
              </Field>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-medium text-text-soft">
                  Registrar publicação
                </p>
                <Field
                  label="URL da publicação (opcional)"
                  hint="Deixe vazio em publicações manuais sem link."
                >
                  <input
                    className="input w-full"
                    value={publishUrl}
                    onChange={(e) => setPublishUrl(e.target.value)}
                    placeholder="https://"
                  />
                </Field>
                <Button onClick={publish} disabled={busy || !!selected.publishedPost}>
                  {selected.publishedPost ? "Já publicada" : "Publicar agora"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
