import { useMemo, useState } from "react";
import { FileText, Mail, Pencil, Phone, Plus, Search, Trash2, User, X } from "lucide-react";
import { useStore } from "../store";
import { blankClient } from "../data";
import { calcQuote, fmtDate, fmtEUR, validNif } from "../calc";
import type { Client } from "../types";
import { STATUS_META } from "../types";
import { Button, Card, Confirm, EmptyState, IconBtn, Input, Modal, StatusBadge, Textarea, cn } from "../components/ui";

const WON = ["aprovado", "execucao", "concluido"];

function initials(name: string, company: string): string {
  const src = company || name || "?";
  const parts = src.split(/[\s—-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function Clients() {
  const { db, saveClient, deleteClient, toast, nav } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const defIva = db.company.defaultIva;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...db.clients].sort((a, b) => (b.company || b.name).localeCompare(a.company || a.name));
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.nif.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [db.clients, query]);

  const statsFor = useMemo(() => {
    const map: Record<string, { count: number; won: number }> = {};
    for (const c of db.clients) map[c.id] = { count: 0, won: 0 };
    for (const q of db.quotes) {
      if (!map[q.clientId]) map[q.clientId] = { count: 0, won: 0 };
      map[q.clientId].count += 1;
      if (WON.includes(q.status)) map[q.clientId].won += calcQuote(q, defIva).total;
    }
    return map;
  }, [db.clients, db.quotes, defIva]);

  const openNew = () => {
    setErrors({});
    setEditing(blankClient());
  };

  const submit = () => {
    if (!editing) return;
    const errs: Record<string, string> = {};
    if (!editing.name.trim() && !editing.company.trim()) errs.name = "Indique o nome ou a empresa.";
    if (!validNif(editing.nif)) errs.nif = "O NIF deve ter 9 dígitos.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const exists = db.clients.some((c) => c.id === editing.id);
    saveClient({ ...editing, name: editing.name.trim() });
    setEditing(null);
    toast(exists ? "Cliente atualizado" : "Cliente criado");
  };

  const viewingLive = viewing ? db.clients.find((c) => c.id === viewing.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Clientes</h2>
          <p className="text-sm text-mut">{db.clients.length} clientes na carteira</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <div className="anim-rise relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por nome, empresa, NIF…"
          className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-volt focus:outline-none focus:ring-2 focus:ring-volt/25"
          aria-label="Pesquisar clientes"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<User className="h-6 w-6" />}
            title={db.clients.length === 0 ? "Ainda sem clientes" : "Sem resultados"}
            desc={db.clients.length === 0 ? "Adicione o primeiro cliente para começar a orçamentar." : "Tente outro termo de pesquisa."}
            action={
              db.clients.length === 0 ? (
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> Adicionar cliente
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const st = statsFor[c.id] ?? { count: 0, won: 0 };
            return (
              <Card key={c.id} className="anim-rise group flex flex-col p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-volt/50">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-volt/15 font-display text-sm font-bold text-volt">
                    {initials(c.name, c.company)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-bold text-ink">{c.company || c.name}</p>
                    <p className="truncate text-xs text-mut">
                      {c.company ? c.name : "Cliente particular"}
                      {c.nif && ` · NIF ${c.nif}`}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn label="Editar cliente" onClick={() => setEditing({ ...c })}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Eliminar cliente" className="hover:text-bad" onClick={() => setToDelete(c)}>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-mut">
                  {c.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-faint" /> {c.phone}
                    </p>
                  )}
                  {c.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-faint" /> {c.email}
                    </p>
                  )}
                  {c.locality && <p className="text-faint">{c.postal} {c.locality}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[11px] font-semibold text-mut">
                    <span className="font-mono text-ink">{st.count}</span> orçamento{st.count === 1 ? "" : "s"}
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm font-bold text-ink tnum">{fmtEUR(st.won)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-faint">contratado</span>
                  </span>
                </div>
                <Button variant="soft" size="sm" className="mt-3 w-full" onClick={() => setViewing(c)}>
                  <FileText className="h-3.5 w-3.5" /> Ver histórico
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* editar/criar */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={db.clients.some((c) => c.id === editing?.id) ? "Editar cliente" : "Novo cliente"}
        subtitle="Os dados aparecem automaticamente nas propostas e nos PDFs."
        width="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Guardar cliente</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome / contacto"
              id="cl-name"
              value={editing.name}
              error={errors.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Ex.: Eng.º Rui Alpuim"
            />
            <Input
              label="Empresa"
              id="cl-company"
              value={editing.company}
              onChange={(e) => setEditing({ ...editing, company: e.target.value })}
              placeholder="Ex.: Construtora Alvora, Lda."
            />
            <Input
              label="NIF"
              id="cl-nif"
              value={editing.nif}
              error={errors.nif}
              inputMode="numeric"
              onChange={(e) => setEditing({ ...editing, nif: e.target.value })}
              placeholder="9 dígitos"
            />
            <Input
              label="Telefone"
              id="cl-phone"
              value={editing.phone}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              placeholder="+351 …"
            />
            <Input
              label="Morada"
              id="cl-address"
              value={editing.address}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })}
              className="sm:col-span-2"
            />
            <Input label="Código postal" id="cl-postal" value={editing.postal} onChange={(e) => setEditing({ ...editing, postal: e.target.value })} />
            <Input label="Localidade" id="cl-locality" value={editing.locality} onChange={(e) => setEditing({ ...editing, locality: e.target.value })} />
            <Input
              label="Email"
              id="cl-email"
              type="email"
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              className="sm:col-span-2"
            />
            <Textarea
              label="Observações"
              id="cl-notes"
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              className="sm:col-span-2"
            />
          </div>
        )}
      </Modal>

      {/* detalhe / histórico */}
      <Modal
        open={viewingLive !== null}
        onClose={() => setViewing(null)}
        title={viewingLive?.company || viewingLive?.name || "Cliente"}
        subtitle={viewingLive ? `${viewingLive.company ? viewingLive.name + " · " : ""}NIF ${viewingLive.nif || "—"}` : undefined}
        width="max-w-xl"
        footer={
          <>
            <Button
              variant="soft"
              onClick={() => {
                if (viewingLive) {
                  setEditing({ ...viewingLive });
                  setViewing(null);
                }
              }}
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button
              onClick={() => {
                if (viewingLive) {
                  nav({ page: "editor" });
                  window.setTimeout(() => {
                    const evt = new CustomEvent("eqp:preselect-client", { detail: viewingLive.id });
                    window.dispatchEvent(evt);
                  }, 60);
                  setViewing(null);
                }
              }}
            >
              <Plus className="h-4 w-4" /> Novo orçamento
            </Button>
          </>
        }
      >
        {viewingLive && (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-xl border border-line bg-raise p-4 text-xs text-mut sm:grid-cols-2">
              {viewingLive.phone && <p><span className="font-semibold text-ink">Telefone:</span> {viewingLive.phone}</p>}
              {viewingLive.email && <p><span className="font-semibold text-ink">Email:</span> {viewingLive.email}</p>}
              {viewingLive.address && (
                <p className="sm:col-span-2">
                  <span className="font-semibold text-ink">Morada:</span> {viewingLive.address}, {viewingLive.postal} {viewingLive.locality}
                </p>
              )}
              {viewingLive.notes && <p className="sm:col-span-2 italic">{viewingLive.notes}</p>}
            </div>
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">Histórico de orçamentos</h3>
              {db.quotes.filter((q) => q.clientId === viewingLive.id).length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-faint">
                  Sem orçamentos para este cliente.
                </p>
              ) : (
                <ul className="space-y-2">
                  {db.quotes
                    .filter((q) => q.clientId === viewingLive.id)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((q) => {
                      const t = calcQuote(q, defIva);
                      return (
                        <li key={q.id}>
                          <button
                            onClick={() => {
                              nav({ page: "editor", id: q.id });
                              setViewing(null);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-card px-3.5 py-2.5 text-left transition-colors hover:border-volt/50"
                          >
                            <span>
                              <span className="block font-mono text-[13px] font-semibold text-ink">{q.number}</span>
                              <span className="block truncate text-xs text-mut">{q.workName || "—"} · {fmtDate(q.createdAt)}</span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              <span className="font-mono text-xs font-bold text-ink tnum">{fmtEUR(t.total)}</span>
                              <StatusBadge status={q.status} withDot={false} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-volt/12 px-4 py-3">
              <span className="text-sm font-semibold text-ink">Total contratado</span>
              <span className="font-mono text-lg font-bold text-ink tnum">
                {fmtEUR(
                  db.quotes
                    .filter((q) => q.clientId === viewingLive.id && WON.includes(q.status))
                    .reduce((s, q) => s + calcQuote(q, defIva).total, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteClient(toDelete.id);
            toast("Cliente eliminado", "info");
          }
        }}
        title="Eliminar cliente"
        message={`Os orçamentos existentes de “${toDelete?.company || toDelete?.name}” serão mantidos, mas deixarão de estar associados a uma ficha de cliente.`}
      />
    </div>
  );
}
