"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDateTime, truncate } from "@/lib/format";

export type ApprovalRecord = {
  id: string;
  decision: string;
  comment: string | null;
  createdAt: string | Date;
  user: { id: string; name: string; email: string };
};

export type PendingDraft = {
  id: string;
  title: string;
  caption: string | null;
  pillar: string;
  hook: string | null;
  status: string;
  updatedAt: string | Date;
  fact: { id: string; title: string } | null;
  mediaAsset: { id: string; url: string; type: string } | null;
  approvals: ApprovalRecord[];
};

export type HistoryItem = ApprovalRecord & {
  draft: { id: string; title: string; status: string };
};

const DECISION_LABEL: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Rejeitado",
  change_requested: "Alteração solicitada",
};

type Props = { drafts: PendingDraft[]; history: HistoryItem[] };

export default function AprovacoesClient({ drafts, history }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState(false);
  const [target, setTarget] = useState<PendingDraft | null>(null);
  const [decision, setDecision] = useState<
    "approved" | "rejected" | "change_requested"
  >("approved");
  const [comment, setComment] = useState("");

  function open(draft: PendingDraft, initialDecision: typeof decision) {
    setError("");
    setTarget(draft);
    setDecision(initialDecision);
    setComment("");
    setModal(true);
  }

  async function decide() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/approvals", {
        method: "POST",
        body: JSON.stringify({
          draftId: target.id,
          decision,
          comment: comment || null,
        }),
      });
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar decisão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Aprovações"
        description="Revise, aprove, rejeite ou solicite alterações antes de agendar."
      />

      {error && !modal && (
        <p className="text-sm text-brand-red-soft">{error}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">
          Aguardando aprovação ({drafts.length})
        </h2>
        {drafts.length === 0 ? (
          <EmptyState
            title="Nenhuma publicação pendente"
            description="Quando um rascunho for enviado para aprovação, ele aparecerá aqui."
          />
        ) : (
          drafts.map((d) => (
            <div key={d.id} className="card p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text">{d.title}</p>
                  <p className="text-xs text-text-muted">
                    Atualizado em {formatDateTime(d.updatedAt)}
                    {d.fact && ` · Fato: ${d.fact.title}`}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {d.caption && (
                <p className="text-sm text-text-soft whitespace-pre-wrap">
                  {truncate(d.caption, 400)}
                </p>
              )}
              {d.hook && (
                <p className="text-xs text-text-muted">Hook: {d.hook}</p>
              )}
              {d.approvals.length > 0 && (
                <div className="text-xs text-text-muted space-y-1 border-t border-border pt-2">
                  {d.approvals.map((a) => (
                    <p key={a.id}>
                      {formatDateTime(a.createdAt)} — {a.user.name}:{" "}
                      {DECISION_LABEL[a.decision] ?? a.decision}
                      {a.comment ? ` — ${a.comment}` : ""}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => open(d, "approved")}>Aprovar</Button>
                <Button
                  variant="secondary"
                  onClick={() => open(d, "change_requested")}
                >
                  Solicitar alteração
                </Button>
                <Button variant="danger" onClick={() => open(d, "rejected")}>
                  Rejeitar
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">
          Histórico de aprovações
        </h2>
        {history.length === 0 ? (
          <EmptyState
            title="Sem histórico"
            description="As decisões de aprovação aparecerão aqui."
          />
        ) : (
          <Table head={["Publicação", "Decisão", "Responsável", "Comentário", "Quando"]}>
            {history.map((h) => (
              <Tr key={h.id}>
                <Td>
                  <p className="font-medium text-text">{h.draft.title}</p>
                  <StatusBadge status={h.draft.status} />
                </Td>
                <Td className="text-text-soft">
                  {DECISION_LABEL[h.decision] ?? h.decision}
                </Td>
                <Td className="text-text-soft">{h.user.name}</Td>
                <Td className="text-text-soft max-w-xs">
                  {h.comment ? truncate(h.comment, 120) : "—"}
                </Td>
                <Td className="text-text-soft">{formatDateTime(h.createdAt)}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Registrar decisão"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={decide} disabled={busy}>
              {busy ? "Salvando..." : "Confirmar"}
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
          {target && (
            <p className="text-sm text-text-soft">
              Publicação:{" "}
              <span className="text-text font-medium">{target.title}</span>
            </p>
          )}
          <Field label="Decisão">
            <select
              className="input w-full"
              value={decision}
              onChange={(e) =>
                setDecision(e.target.value as typeof decision)
              }
            >
              <option value="approved">Aprovar</option>
              <option value="change_requested">Solicitar alteração</option>
              <option value="rejected">Rejeitar</option>
            </select>
          </Field>
          <Field label="Comentário (opcional)">
            <textarea
              className="input w-full min-h-[90px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
