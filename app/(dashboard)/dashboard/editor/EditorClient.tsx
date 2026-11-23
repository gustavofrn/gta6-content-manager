"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";

export type VideoAsset = {
  id: string;
  type: string;
  url: string;
  storageKey: string | null;
  durationSec: number | null;
  createdAt: string | Date;
};

export type Clip = {
  id: string;
  mediaAssetId: string;
  title: string;
  startSec: number;
  endSec: number;
  caption: string | null;
  status: string;
  outputStorageKey: string | null;
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  exporting: "Exportando",
  exported: "Exportado",
  failed: "Falha",
};

type Props = { assets: VideoAsset[] };

export default function EditorClient({ assets }: Props) {
  const [ffmpeg, setFfmpeg] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [startSec, setStartSec] = useState("0");
  const [endSec, setEndSec] = useState("");
  const [caption, setCaption] = useState("");

  const selected = assets.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    apiFetch<{ ffmpeg: boolean }>("/api/editor/status")
      .then((r) => setFfmpeg(r.ffmpeg))
      .catch(() => setFfmpeg(false));
  }, []);

  const loadClips = useCallback(async (assetId: string) => {
    if (!assetId) {
      setClips([]);
      return;
    }
    try {
      const data = await apiFetch<Clip[]>(
        `/api/clips?mediaAssetId=${encodeURIComponent(assetId)}`
      );
      setClips(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar clipes.");
    }
  }, []);

  useEffect(() => {
    void loadClips(selectedId);
  }, [selectedId, loadClips]);

  async function createClip() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/clips", {
        method: "POST",
        body: JSON.stringify({
          mediaAssetId: selectedId,
          title,
          startSec,
          endSec,
          caption,
        }),
      });
      setTitle("");
      setStartSec("0");
      setEndSec("");
      setCaption("");
      await loadClips(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar clipe.");
    } finally {
      setBusy(false);
    }
  }

  async function exportClip(clip: Clip) {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/clips/${clip.id}/export`, { method: "POST" });
      await loadClips(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao exportar clipe.");
    } finally {
      setBusy(false);
    }
  }

  async function removeClip(clip: Clip) {
    if (!confirm("Excluir este clipe?")) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/clips/${clip.id}`, { method: "DELETE" });
      await loadClips(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir clipe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editor de vídeos"
        description="Recorte vídeos que você tem direito de usar e exporte versões verticais 9:16 para revisão."
      />

      {/* Banner de disponibilidade do ffmpeg */}
      {ffmpeg === null ? (
        <div className="card p-3 text-sm text-text-muted">
          Verificando disponibilidade do ffmpeg…
        </div>
      ) : ffmpeg ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-3 text-sm space-y-1">
          <p>ffmpeg disponível — exportação vertical 9:16 habilitada.</p>
          <p className="text-text-soft">
            O vídeo original fica centralizado sobre um fundo desfocado. A
            separação automática de webcam e a transcrição ainda não estão
            disponíveis.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 text-brand-red-soft px-4 py-3 text-sm">
          ffmpeg não está instalado no servidor — a exportação de clipes está
          indisponível.
        </div>
      )}

      {error && (
        <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {assets.length === 0 ? (
        <EmptyState
          title="Nenhum vídeo na biblioteca"
          description="Adicione vídeos na Biblioteca de mídia (upload local ou URL) para começar a criar clipes."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda: seleção + preview + formulário */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-4 space-y-4">
              <Field label="Vídeo de origem">
                <select
                  className="input w-full"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setError("");
                  }}
                >
                  <option value="">Selecione um vídeo…</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.storageKey ?? a.url}
                      {a.durationSec ? ` (${a.durationSec}s)` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {selected && !selected.storageKey && (
                <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  Esta mídia está disponível apenas por URL externa (sem arquivo
                  local). Ela não pode ser exportada — envie o arquivo pela
                  Biblioteca de mídia para habilitar a exportação.
                </p>
              )}

              {selected && (
                <div className="rounded-lg overflow-hidden bg-bg-hover border border-border">
                  <video
                    key={selected.id}
                    src={selected.url}
                    className="w-full aspect-video"
                    controls
                  />
                </div>
              )}
            </div>

            {selected && (
              <div className="card p-4 space-y-4">
                <h2 className="font-semibold text-text">Novo clipe</h2>
                <Field label="Título">
                  <input
                    className="input w-full"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Gancho dos primeiros 15 segundos"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Início (s)">
                    <input
                      type="number"
                      min={0}
                      className="input w-full"
                      value={startSec}
                      onChange={(e) => setStartSec(e.target.value)}
                    />
                  </Field>
                  <Field label="Fim (s)">
                    <input
                      type="number"
                      min={0}
                      className="input w-full"
                      value={endSec}
                      onChange={(e) => setEndSec(e.target.value)}
                      placeholder="Ex.: 15"
                    />
                  </Field>
                </div>
                <Field label="Legenda">
                  <textarea
                    className="input w-full min-h-[70px]"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Texto sugerido para a legenda do clipe."
                  />
                </Field>
                <div className="flex justify-end">
                  <Button
                    onClick={createClip}
                    disabled={busy || !title.trim() || !endSec}
                  >
                    {busy ? "Salvando..." : "Adicionar clipe"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita: lista de clipes */}
          <div className="space-y-3">
            <h2 className="font-semibold text-text">
              Clipes {selected ? `(${clips.length})` : ""}
            </h2>

            {!selected ? (
              <div className="card p-6 text-sm text-text-muted text-center">
                Selecione um vídeo para ver e criar clipes.
              </div>
            ) : clips.length === 0 ? (
              <div className="card p-6 text-sm text-text-muted text-center">
                Nenhum clipe criado ainda para este vídeo.
              </div>
            ) : (
              clips.map((c) => {
                const canExport = !!selected.storageKey && ffmpeg === true;
                return (
                  <div key={c.id} className="card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{c.title}</p>
                        <p className="text-xs text-text-muted">
                          {c.startSec}s → {c.endSec}s
                        </p>
                      </div>
                      <StatusBadge
                        status={c.status}
                        label={STATUS_LABELS[c.status] ?? c.status}
                      />
                    </div>

                    {c.caption && (
                      <p className="text-sm text-text-soft">{c.caption}</p>
                    )}

                    {c.status === "failed" && c.errorMessage && (
                      <p className="text-xs text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded px-2 py-1">
                        {c.errorMessage}
                      </p>
                    )}

                    {c.status === "exported" && c.outputUrl && (
                      <div className="space-y-2">
                        <video
                          key={c.outputUrl}
                          src={c.outputUrl}
                          className="w-full rounded-lg bg-black"
                          controls
                        />
                        <a
                          href={c.outputUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-sm text-brand-purple-soft hover:underline"
                        >
                          Abrir
                        </a>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => exportClip(c)}
                        disabled={busy || !canExport || c.status === "exporting"}
                      >
                        {c.status === "exporting"
                          ? "Exportando..."
                          : c.status === "exported"
                            ? "Reexportar"
                            : "Exportar"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => removeClip(c)}
                        disabled={busy}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
