"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button, { IconButton } from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/format";

export type Setting = {
  id: string;
  key: string;
  value: string;
  category: string | null;
  updatedAt: string | Date;
};

export type AutomationJob = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  schedule: string | null;
  lastRunAt: string | Date | null;
  nextRunAt: string | Date | null;
  lastStatus: string | null;
  lastError: string | null;
  createdAt: string | Date;
};

type Integrations = {
  ai: boolean;
  publishing: boolean;
  telegram: boolean;
};

const AUTOMATION_TYPES = [
  { value: "approval_reminder", label: "Lembrete de aprovação" },
  { value: "source_check", label: "Verificação de fontes" },
  { value: "news_detection", label: "Detecção de notícias" },
  { value: "metrics_collection", label: "Coleta de métricas" },
];

function typeLabel(value: string) {
  return AUTOMATION_TYPES.find((t) => t.value === value)?.label ?? value;
}

type Props = {
  settings: Setting[];
  jobs: AutomationJob[];
  integrations: Integrations;
};

export default function ConfiguracoesClient({
  settings,
  jobs,
  integrations,
}: Props) {
  const router = useRouter();

  const valueOf = (key: string) =>
    settings.find((s) => s.key === key)?.value ?? "";

  const [form, setForm] = useState({
    page_name: valueOf("page_name"),
    page_handle: valueOf("page_handle"),
    voice_tone: valueOf("voice_tone"),
    timezone: valueOf("timezone"),
    language: valueOf("language"),
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const [jobModal, setJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<AutomationJob | null>(null);
  const [jobForm, setJobForm] = useState({
    name: "",
    type: "approval_reminder",
    schedule: "",
    enabled: true,
  });
  const [runMsg, setRunMsg] = useState<{ id: string; text: string; error: boolean } | null>(
    null
  );
  const [runningId, setRunningId] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          settings: [
            { key: "page_name", value: form.page_name, category: "identity" },
            { key: "page_handle", value: form.page_handle, category: "identity" },
            { key: "voice_tone", value: form.voice_tone, category: "identity" },
            { key: "timezone", value: form.timezone, category: "general" },
            { key: "language", value: form.language, category: "general" },
          ],
        }),
      });
      setSavedMsg("Configurações salvas com sucesso.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function openJob(job?: AutomationJob) {
    setError("");
    if (job) {
      setEditingJob(job);
      setJobForm({
        name: job.name,
        type: job.type,
        schedule: job.schedule ?? "",
        enabled: job.enabled,
      });
    } else {
      setEditingJob(null);
      setJobForm({
        name: "",
        type: "approval_reminder",
        schedule: "",
        enabled: true,
      });
    }
    setJobModal(true);
  }

  async function saveJob() {
    setSaving(true);
    setError("");
    try {
      if (editingJob) {
        await apiFetch(`/api/automation/${editingJob.id}`, {
          method: "PATCH",
          body: JSON.stringify(jobForm),
        });
      } else {
        await apiFetch("/api/automation", {
          method: "POST",
          body: JSON.stringify(jobForm),
        });
      }
      setJobModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar automação.");
    } finally {
      setSaving(false);
    }
  }

  async function removeJob(id: string) {
    if (!confirm("Excluir esta automação?")) return;
    try {
      await apiFetch(`/api/automation/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function runJob(job: AutomationJob) {
    setRunningId(job.id);
    setRunMsg(null);
    try {
      const res = await apiFetch<{ count: number }>(
        `/api/automation/${job.id}/run`,
        { method: "POST" }
      );
      setRunMsg({
        id: job.id,
        text: `Executado com sucesso. ${res.count} rascunho(s) pendente(s).`,
        error: false,
      });
    } catch (e) {
      setRunMsg({
        id: job.id,
        text: e instanceof Error ? e.message : "Erro ao executar.",
        error: true,
      });
    } finally {
      setRunningId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Identidade da página, preferências gerais, integrações e automações."
        action={
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        }
      />

      {(error && !jobModal) || savedMsg ? (
        <p
          className={`text-sm ${
            error ? "text-brand-red-soft" : "text-emerald-400"
          }`}
        >
          {error || savedMsg}
        </p>
      ) : null}

      {/* Identidade */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-text">Identidade</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome da página">
            <input
              className="input w-full"
              value={form.page_name}
              onChange={(e) => setForm({ ...form, page_name: e.target.value })}
              placeholder="GTA 6 (provisório)"
            />
          </Field>
          <Field label="Handle">
            <input
              className="input w-full"
              value={form.page_handle}
              onChange={(e) => setForm({ ...form, page_handle: e.target.value })}
              placeholder="A definir"
            />
          </Field>
        </div>
        <Field
          label="Tom de voz"
          hint="Como a página se comunica com o público."
        >
          <input
            className="input w-full"
            value={form.voice_tone}
            onChange={(e) => setForm({ ...form, voice_tone: e.target.value })}
            placeholder="hype mas limpo"
          />
        </Field>
      </section>

      {/* Geral */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-text">Geral</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Fuso horário">
            <input
              className="input w-full"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              placeholder="A definir (ex.: America/Sao_Paulo)"
            />
          </Field>
          <Field label="Idioma">
            <input
              className="input w-full"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              placeholder="pt-BR"
            />
          </Field>
        </div>
      </section>

      {/* Integrações externas */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold text-text">Integrações externas</h2>
        <p className="text-sm text-text-soft">
          Definidas por variáveis de ambiente no servidor.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center justify-between gap-4 flex-1 rounded-lg border border-border bg-bg-soft px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text">IA (geração de conteúdo)</p>
              <p className="text-xs text-text-muted">AI_API_KEY / OPENAI_API_KEY</p>
            </div>
            <StatusBadge status={integrations.ai ? "active" : "inactive"} />
          </div>
          <div className="flex items-center justify-between gap-4 flex-1 rounded-lg border border-border bg-bg-soft px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text">Publicação</p>
              <p className="text-xs text-text-muted">PUBLISH_WEBHOOK_URL</p>
            </div>
            <StatusBadge status={integrations.publishing ? "active" : "inactive"} />
          </div>
          <div className="flex items-center justify-between gap-4 flex-1 rounded-lg border border-border bg-bg-soft px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text">Aprovação no Telegram</p>
              <p className="text-xs text-text-muted">
                TELEGRAM_BOT_TOKEN / CHAT_ID / WEBHOOK_SECRET
              </p>
            </div>
            <StatusBadge status={integrations.telegram ? "active" : "inactive"} />
          </div>
        </div>
      </section>

      {/* Automações */}
      <section className="space-y-4">
        <PageHeader
          title="Automações"
          description="Agende rotinas e execute verificações manuais."
          action={<Button onClick={() => openJob()}>Nova automação</Button>}
        />

        {jobs.length === 0 ? (
          <EmptyState
            title="Nenhuma automação configurada"
            description="Crie rotinas como lembrete de aprovação, verificação de fontes ou coleta de métricas."
            action={<Button onClick={() => openJob()}>Nova automação</Button>}
          />
        ) : (
          <Table
            head={["Nome", "Tipo", "Agendamento", "Status", "Última execução", "Ações"]}
          >
            {jobs.map((job) => (
              <Tr key={job.id}>
                <Td className="font-medium text-text">{job.name}</Td>
                <Td className="text-text-soft">{typeLabel(job.type)}</Td>
                <Td className="text-text-soft">{job.schedule || "—"}</Td>
                <Td>
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge status={job.enabled ? "active" : "inactive"} />
                    {job.lastStatus && (
                      <StatusBadge status={job.lastStatus} />
                    )}
                  </div>
                  {job.lastError && (
                    <p className="text-xs text-brand-red-soft mt-1 max-w-xs">
                      {job.lastError}
                    </p>
                  )}
                </Td>
                <Td className="text-text-soft">
                  {formatDateTime(job.lastRunAt)}
                </Td>
                <Td>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="!py-1 !px-3 text-xs"
                        onClick={() => runJob(job)}
                        disabled={runningId === job.id}
                      >
                        {runningId === job.id ? "Executando..." : "Executar agora"}
                      </Button>
                      <IconButton
                        icon="edit"
                        label="Editar"
                        onClick={() => openJob(job)}
                      />
                      <IconButton
                        icon="logout"
                        label="Excluir"
                        tone="danger"
                        onClick={() => removeJob(job.id)}
                      />
                    </div>
                    {runMsg?.id === job.id && (
                      <p
                        className={`text-xs ${
                          runMsg.error ? "text-brand-red-soft" : "text-emerald-400"
                        }`}
                      >
                        {runMsg.text}
                      </p>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>

      {/* Modal Automação */}
      <Modal
        open={jobModal}
        onClose={() => setJobModal(false)}
        title={editingJob ? "Editar automação" : "Nova automação"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setJobModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveJob} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
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
          <Field label="Nome">
            <input
              className="input w-full"
              value={jobForm.name}
              onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
              placeholder="Lembrete diário de aprovação"
            />
          </Field>
          <Field label="Tipo">
            <select
              className="input w-full"
              value={jobForm.type}
              onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
            >
              {AUTOMATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Agendamento (cron)"
            hint="Opcional. Ex.: 0 9 * * * para todos os dias às 09:00."
          >
            <input
              className="input w-full"
              value={jobForm.schedule}
              onChange={(e) =>
                setJobForm({ ...jobForm, schedule: e.target.value })
              }
              placeholder="0 9 * * *"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-text-soft">
            <input
              type="checkbox"
              checked={jobForm.enabled}
              onChange={(e) =>
                setJobForm({ ...jobForm, enabled: e.target.checked })
              }
            />
            Automação ativa
          </label>
        </div>
      </Modal>
    </div>
  );
}
