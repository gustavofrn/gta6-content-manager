"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button, { IconButton } from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDate, truncate } from "@/lib/format";

export type Creator = {
  id: string;
  name: string;
  platform: string;
  handle: string;
  url: string | null;
  canReuse: boolean;
  permissionNotes: string | null;
  createdAt: string | Date;
  _count?: { mediaAssets: number };
};

export type MediaAsset = {
  id: string;
  type: string;
  url: string;
  storageKey: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  createdAt: string | Date;
  creator: { id: string; name: string; handle: string } | null;
};

const MEDIA_TYPES = [
  { value: "video", label: "Vídeo" },
  { value: "image", label: "Imagem" },
  { value: "audio", label: "Áudio" },
];

type Props = { assets: MediaAsset[]; creators: Creator[] };

export default function BibliotecaClient({ assets, creators }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"media" | "creators">("media");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mídia
  const [mediaModal, setMediaModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaAsset | null>(null);
  const [mediaMode, setMediaMode] = useState<"upload" | "url">("upload");
  const [mediaForm, setMediaForm] = useState({
    url: "",
    type: "video",
    creatorId: "",
    durationSec: "",
    width: "",
    height: "",
    permissionConfirmed: false,
    permissionNotes: "",
  });

  // Criador
  const [creatorModal, setCreatorModal] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [creatorForm, setCreatorForm] = useState({
    name: "",
    platform: "",
    handle: "",
    url: "",
    canReuse: false,
    permissionNotes: "",
  });

  function openMedia(asset?: MediaAsset) {
    setError("");
    if (asset) {
      setEditingMedia(asset);
      setMediaMode("url");
      setMediaForm({
        url: asset.url,
        type: asset.type,
        creatorId: asset.creator?.id ?? "",
        durationSec: asset.durationSec ? String(asset.durationSec) : "",
        width: asset.width ? String(asset.width) : "",
        height: asset.height ? String(asset.height) : "",
        permissionConfirmed: false,
        permissionNotes: "",
      });
    } else {
      setEditingMedia(null);
      setMediaMode("upload");
      setMediaForm({
        url: "",
        type: "video",
        creatorId: "",
        durationSec: "",
        width: "",
        height: "",
        permissionConfirmed: false,
        permissionNotes: "",
      });
    }
    setMediaModal(true);
  }

  function openCreator(creator?: Creator) {
    setError("");
    if (creator) {
      setEditingCreator(creator);
      setCreatorForm({
        name: creator.name,
        platform: creator.platform,
        handle: creator.handle,
        url: creator.url ?? "",
        canReuse: creator.canReuse,
        permissionNotes: creator.permissionNotes ?? "",
      });
    } else {
      setEditingCreator(null);
      setCreatorForm({
        name: "",
        platform: "",
        handle: "",
        url: "",
        canReuse: false,
        permissionNotes: "",
      });
    }
    setCreatorModal(true);
  }

  async function saveMedia() {
    setBusy(true);
    setError("");
    try {
      if (!editingMedia && !mediaForm.permissionConfirmed) {
        setError("Confirme os direitos de uso do material para continuar.");
        setBusy(false);
        return;
      }

      if (editingMedia) {
        await apiFetch(`/api/media/${editingMedia.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            url: mediaForm.url,
            type: mediaForm.type,
            creatorId: mediaForm.creatorId || null,
            durationSec: mediaForm.durationSec || null,
            width: mediaForm.width || null,
            height: mediaForm.height || null,
          }),
        });
      } else if (mediaMode === "upload") {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          setError("Selecione um arquivo para enviar.");
          setBusy(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("permissionConfirmed", "true");
        fd.append("permissionNotes", mediaForm.permissionNotes);
        if (mediaForm.creatorId) fd.append("creatorId", mediaForm.creatorId);
        if (mediaForm.durationSec)
          fd.append("durationSec", mediaForm.durationSec);
        await apiFetch("/api/media/upload", { method: "POST", body: fd });
      } else {
        await apiFetch("/api/media", {
          method: "POST",
          body: JSON.stringify({
            url: mediaForm.url,
            type: mediaForm.type,
            creatorId: mediaForm.creatorId || null,
            durationSec: mediaForm.durationSec || null,
            width: mediaForm.width || null,
            height: mediaForm.height || null,
            permissionConfirmed: mediaForm.permissionConfirmed,
            permissionNotes: mediaForm.permissionNotes,
          }),
        });
      }
      setMediaModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCreator() {
    setBusy(true);
    setError("");
    try {
      if (editingCreator) {
        await apiFetch(`/api/creators/${editingCreator.id}`, {
          method: "PATCH",
          body: JSON.stringify(creatorForm),
        });
      } else {
        await apiFetch("/api/creators", {
          method: "POST",
          body: JSON.stringify(creatorForm),
        });
      }
      setCreatorModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(id: string) {
    if (!confirm("Excluir esta mídia?")) return;
    try {
      await apiFetch(`/api/media/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function removeCreator(id: string) {
    if (!confirm("Excluir este criador?")) return;
    try {
      await apiFetch(`/api/creators/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de mídia"
        description="Centralize vídeos, imagens e áudios com controle de créditos e permissões de uso."
        action={
          tab === "media" ? (
            <Button onClick={() => openMedia()}>Adicionar mídia</Button>
          ) : (
            <Button onClick={() => openCreator()}>Novo criador</Button>
          )
        }
      />

      <div className="flex gap-1 border-b border-border">
        {[
          { key: "media" as const, label: `Mídia (${assets.length})` },
          { key: "creators" as const, label: `Criadores (${creators.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setError("");
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-brand-purple text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "media" ? (
        assets.length === 0 ? (
          <EmptyState
            title="Biblioteca vazia"
            description="Envie arquivos ou registre mídias por URL. Sempre registre créditos e permissões."
            action={<Button onClick={() => openMedia()}>Adicionar mídia</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((a) => (
              <div key={a.id} className="card overflow-hidden">
                <div className="aspect-video bg-bg-hover flex items-center justify-center overflow-hidden">
                  {a.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : a.type === "video" ? (
                    <video src={a.url} className="w-full h-full" controls />
                  ) : (
                    <span className="text-text-muted text-sm">Áudio</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge
                      status="active"
                      label={
                        MEDIA_TYPES.find((t) => t.value === a.type)?.label ??
                        a.type
                      }
                    />
                    <span className="text-xs text-text-muted">
                      {formatDate(a.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-text-soft truncate">
                    {a.creator ? `@${a.creator.handle}` : "Sem criador"}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {truncate(a.storageKey ?? a.url, 42)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <IconButton
                      icon="edit"
                      label="Editar"
                      onClick={() => openMedia(a)}
                    />
                    <IconButton
                      icon="logout"
                      label="Excluir"
                      tone="danger"
                      onClick={() => removeMedia(a.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : creators.length === 0 ? (
        <EmptyState
          title="Nenhum criador cadastrado"
          description="Cadastre criadores e defina se o material pode ser reutilizado (com autorização)."
          action={<Button onClick={() => openCreator()}>Novo criador</Button>}
        />
      ) : (
        <Table
          head={["Criador", "Plataforma", "Handle", "Reuso", "Mídias", "Ações"]}
        >
          {creators.map((c) => (
            <Tr key={c.id}>
              <Td>
                <p className="font-medium text-text">{c.name}</p>
                {c.permissionNotes && (
                  <p className="text-xs text-text-muted max-w-xs">
                    {truncate(c.permissionNotes, 80)}
                  </p>
                )}
              </Td>
              <Td className="text-text-soft">{c.platform}</Td>
              <Td className="text-text-soft">@{c.handle}</Td>
              <Td>
                <StatusBadge
                  status={c.canReuse ? "active" : "inactive"}
                  label={c.canReuse ? "Autorizado" : "Não autorizado"}
                />
              </Td>
              <Td className="text-text-soft">{c._count?.mediaAssets ?? 0}</Td>
              <Td>
                <div className="flex gap-2">
                  <IconButton
                    icon="edit"
                    label="Editar"
                    onClick={() => openCreator(c)}
                  />
                  <IconButton
                    icon="logout"
                    label="Excluir"
                    tone="danger"
                    onClick={() => removeCreator(c.id)}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {/* Modal mídia */}
      <Modal
        open={mediaModal}
        onClose={() => setMediaModal(false)}
        title={editingMedia ? "Editar mídia" : "Adicionar mídia"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMediaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveMedia} disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
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

          {!editingMedia && (
            <div className="flex gap-2">
              <button
                onClick={() => setMediaMode("upload")}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  mediaMode === "upload"
                    ? "border-brand-purple text-brand-purple-soft bg-brand-purple/10"
                    : "border-border text-text-soft hover:bg-bg-hover"
                }`}
              >
                Upload de arquivo
              </button>
              <button
                onClick={() => setMediaMode("url")}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  mediaMode === "url"
                    ? "border-brand-purple text-brand-purple-soft bg-brand-purple/10"
                    : "border-border text-text-soft hover:bg-bg-hover"
                }`}
              >
                URL externa
              </button>
            </div>
          )}

          {mediaMode === "upload" && !editingMedia ? (
            <Field label="Arquivo" hint="Vídeo, imagem ou áudio até 200 MB.">
              <input
                ref={fileRef}
                type="file"
                accept="video/*,image/*,audio/*"
                className="input w-full file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-bg-hover file:text-text-soft"
              />
            </Field>
          ) : (
            <Field label="URL da mídia">
              <input
                className="input w-full"
                value={mediaForm.url}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, url: e.target.value })
                }
                placeholder="https://"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select
                className="input w-full"
                value={mediaForm.type}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, type: e.target.value })
                }
              >
                {MEDIA_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Criador">
              <select
                className="input w-full"
                value={mediaForm.creatorId}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, creatorId: e.target.value })
                }
              >
                <option value="">Sem criador</option>
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (@{c.handle})
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {!editingMedia && (
            <>
              <Field
                label="Origem e observações de permissão"
                hint="Indique se é gravação própria ou registre o link/data da autorização."
              >
                <textarea
                  className="input w-full min-h-[70px]"
                  value={mediaForm.permissionNotes}
                  onChange={(e) =>
                    setMediaForm({
                      ...mediaForm,
                      permissionNotes: e.target.value,
                    })
                  }
                />
              </Field>
              <label className="flex items-start gap-2 text-sm text-text-soft">
                <input
                  type="checkbox"
                  checked={mediaForm.permissionConfirmed}
                  onChange={(e) =>
                    setMediaForm({
                      ...mediaForm,
                      permissionConfirmed: e.target.checked,
                    })
                  }
                />
                <span>
                  Confirmo que criei este material ou tenho autorização
                  explícita para editá-lo e publicá-lo.
                </span>
              </label>
            </>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Duração (s)">
              <input
                type="number"
                className="input w-full"
                value={mediaForm.durationSec}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, durationSec: e.target.value })
                }
              />
            </Field>
            <Field label="Largura">
              <input
                type="number"
                className="input w-full"
                value={mediaForm.width}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, width: e.target.value })
                }
              />
            </Field>
            <Field label="Altura">
              <input
                type="number"
                className="input w-full"
                value={mediaForm.height}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, height: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Modal criador */}
      <Modal
        open={creatorModal}
        onClose={() => setCreatorModal(false)}
        title={editingCreator ? "Editar criador" : "Novo criador"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreatorModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCreator} disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
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
              value={creatorForm.name}
              onChange={(e) =>
                setCreatorForm({ ...creatorForm, name: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plataforma">
              <input
                className="input w-full"
                value={creatorForm.platform}
                onChange={(e) =>
                  setCreatorForm({ ...creatorForm, platform: e.target.value })
                }
                placeholder="YouTube, TikTok..."
              />
            </Field>
            <Field label="Handle">
              <input
                className="input w-full"
                value={creatorForm.handle}
                onChange={(e) =>
                  setCreatorForm({ ...creatorForm, handle: e.target.value })
                }
                placeholder="sem @"
              />
            </Field>
          </div>
          <Field label="URL do perfil">
            <input
              className="input w-full"
              value={creatorForm.url}
              onChange={(e) =>
                setCreatorForm({ ...creatorForm, url: e.target.value })
              }
            />
          </Field>
          <Field label="Observações de permissão">
            <textarea
              className="input w-full min-h-[80px]"
              value={creatorForm.permissionNotes}
              onChange={(e) =>
                setCreatorForm({
                  ...creatorForm,
                  permissionNotes: e.target.value,
                })
              }
              placeholder="Ex.: autorizou uso com crédito em DM (data)."
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-text-soft">
            <input
              type="checkbox"
              checked={creatorForm.canReuse}
              onChange={(e) =>
                setCreatorForm({ ...creatorForm, canReuse: e.target.checked })
              }
            />
            Material autorizado para reuso (com crédito)
          </label>
        </div>
      </Modal>
    </div>
  );
}
