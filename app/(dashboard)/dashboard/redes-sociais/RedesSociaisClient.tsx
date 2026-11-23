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
import { formatDate } from "@/lib/format";

export type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
  name: string;
  connected: boolean;
  createdAt: string | Date;
  _count: { scheduledPosts: number };
};

const PLATFORMS = [
  { value: "X", label: "X (Twitter)" },
  { value: "Instagram", label: "Instagram" },
  { value: "TikTok", label: "TikTok" },
  { value: "YouTube", label: "YouTube" },
  { value: "Facebook", label: "Facebook" },
  { value: "Threads", label: "Threads" },
  { value: "Outro", label: "Outro" },
];

function platformLabel(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

type Props = { accounts: SocialAccount[] };

export default function RedesSociaisClient({ accounts }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SocialAccount | null>(null);
  const [form, setForm] = useState({
    platform: "X",
    handle: "",
    name: "",
    connected: false,
  });

  function open(account?: SocialAccount) {
    setError("");
    if (account) {
      setEditing(account);
      setForm({
        platform: account.platform,
        handle: account.handle,
        name: account.name,
        connected: account.connected,
      });
    } else {
      setEditing(null);
      setForm({ platform: "X", handle: "", name: "", connected: false });
    }
    setModal(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await apiFetch(`/api/social-accounts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch("/api/social-accounts", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleConnected(account: SocialAccount) {
    try {
      await apiFetch(`/api/social-accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ connected: !account.connected }),
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta conta social?")) return;
    try {
      await apiFetch(`/api/social-accounts/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  const connectedCount = accounts.filter((a) => a.connected).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redes sociais"
        description="Registre contas sociais já criadas. O Instagram é o canal escolhido até agora."
        action={<Button onClick={() => open()}>Nova conta</Button>}
      />

      {error && !modal && (
        <p className="text-sm text-brand-red-soft">{error}</p>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title="Nenhuma conta registrada"
          description="Cadastre apenas contas que você já criou. Este cadastro organiza o conteúdo, mas não autentica nem publica automaticamente."
          action={<Button onClick={() => open()}>Nova conta</Button>}
        />
      ) : (
        <>
          <p className="text-sm text-text-soft">
            {connectedCount} de {accounts.length}{" "}
            {accounts.length === 1 ? "conta conectada" : "contas conectadas"}.
          </p>
          <Table
            head={["Plataforma", "Conta", "Nome", "Agendados", "Status", "Ações"]}
          >
            {accounts.map((a) => (
              <Tr key={a.id}>
                <Td className="text-text-soft">{platformLabel(a.platform)}</Td>
                <Td>
                  <p className="font-medium text-text">{a.handle}</p>
                  <p className="text-xs text-text-muted">
                    criada em {formatDate(a.createdAt)}
                  </p>
                </Td>
                <Td className="text-text-soft">{a.name}</Td>
                <Td className="text-text-soft">{a._count.scheduledPosts}</Td>
                <Td>
                  <StatusBadge status={a.connected ? "active" : "inactive"} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleConnected(a)}
                      className="text-xs px-2 py-1 rounded border border-border text-text-soft hover:bg-bg-hover"
                    >
                      {a.connected ? "Desconectar" : "Conectar"}
                    </button>
                    <IconButton
                      icon="edit"
                      label="Editar"
                      onClick={() => open(a)}
                    />
                    <IconButton
                      icon="logout"
                      label="Excluir"
                      tone="danger"
                      onClick={() => remove(a.id)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        </>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Editar conta" : "Nova conta"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy}>
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
          <Field label="Plataforma">
            <select
              className="input w-full"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="@handle">
              <input
                className="input w-full"
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                placeholder="@seu_handle"
              />
            </Field>
            <Field label="Nome">
              <input
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="GTA 6 (provisório)"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-soft">
            <input
              type="checkbox"
              checked={form.connected}
              onChange={(e) => setForm({ ...form, connected: e.target.checked })}
            />
            Conta conectada
          </label>
        </div>
      </Modal>
    </div>
  );
}
