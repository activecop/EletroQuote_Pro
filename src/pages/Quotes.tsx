import { useMemo, useState } from "react";
import { ChevronDown, Copy, Eye, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { calcQuote, fmtDate, fmtEUR } from "../calc";
import { STATUS_META, STATUS_ORDER } from "../types";
import type { QuoteStatus } from "../types";
import { Button, Card, Confirm, EmptyState, IconBtn, StatusBadge, cn } from "../components/ui";

type Sort = "recentes" | "antigos" | "valor_desc" | "valor_asc" | "numero";

export default function Quotes() {
  const { db, nav, route, deleteQuote, duplicateQuote, setStatus, toast } = useStore();
  const [query, setQuery] = useState(route.q ?? "");
  const [status, setStatusFilter] = useState<"todos" | QuoteStatus>("todos");
  const [sort, setSort] = useState<Sort>("recentes");
  const [toDelete, setToDelete] = useState<string | null>(null);

  const defIva = db.company.defaultIva;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const clientName = (id: string) => {
      const c = db.clients.find((x) => x.id === id);
      return `${c?.company ?? ""} ${c?.name ?? ""} ${c?.nif ?? ""}`.toLowerCase();
    };
    let list = db.quotes.map((quote) => ({ quote, t: calcQuote(quote, defIva) }));
    if (status !== "todos") list = list.filter((r) => r.quote.status === status);
    if (q)
      list = list.filter(
        (r) =>
          r.quote.number.toLowerCase().includes(q) ||
          r.quote.workName.toLowerCase().includes(q) ||
          clientName(r.quote.clientId).includes(q) ||
          STATUS_META[r.quote.status].label.toLowerCase().includes(q) ||
          r.quote.lines.some((l) => l.description.toLowerCase().includes(q))
      );
    list.sort((a, b) => {
      switch (sort) {
        case "valor_desc":
          return b.t.total - a.t.total;
        case "valor_asc":
          return a.t.total - b.t.total;
        case "numero":
          return b.quote.number.localeCompare(a.quote.number);
        case "antigos":
          return a.quote.createdAt.localeCompare(b.quote.createdAt);
        default:
          return b.quote.updatedAt.localeCompare(a.quote.updatedAt);
      }
    });
    return list;
  }, [db.quotes, db.clients, query, status, sort, defIva]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: db.quotes.length };
    for (const s of STATUS_ORDER) c[s] = db.quotes.filter((q) => q.status === s).length;
    return c;
  }, [db.quotes]);

  const clientName = (id: string) => {
    const c = db.clients.find((x) => x.id === id);
    return c?.company || c?.name || "Cliente removido";
  };

  const filteredTotal = rows.reduce((s, r) => s + r.t.total, 0);

  return (
    <div className="space-y-4">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Orçamentos</h2>
          <p className="text-sm text-mut">
            {rows.length} de {db.quotes.length} propostas · <span className="font-mono font-semibold text-ink tnum">{fmtEUR(filteredTotal)}</span>
          </p>
        </div>
        <Button onClick={() => nav({ page: "editor" })}>
          <Plus className="h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      {/* filtros */}
      <div className="anim-rise flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar número, cliente, obra…"
            className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-volt focus:outline-none focus:ring-2 focus:ring-volt/25"
            aria-label="Pesquisar orçamentos"
          />
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 cursor-pointer appearance-none rounded-lg border border-line bg-card pl-3 pr-8 text-sm font-medium text-ink focus:border-volt focus:outline-none"
            aria-label="Ordenar orçamentos"
          >
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
            <option value="valor_desc">Maior valor</option>
            <option value="valor_asc">Menor valor</option>
            <option value="numero">Número ↓</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        </div>
      </div>

      <div className="anim-rise -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {(["todos", ...STATUS_ORDER] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              status === s
                ? "border-volt bg-volt text-voltink shadow-sm shadow-volt/25"
                : "border-line bg-card text-mut hover:border-faint/60 hover:text-ink"
            )}
            aria-pressed={status === s}
          >
            {s === "todos" ? "Todos" : STATUS_META[s].label}
            <span className={cn("rounded-full px-1.5 font-mono text-[10px]", status === s ? "bg-voltink/15" : "bg-raise")}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title={db.quotes.length === 0 ? "Ainda sem orçamentos" : "Sem resultados"}
            desc={
              db.quotes.length === 0
                ? "Crie o seu primeiro orçamento profissional ou parta de um modelo pronto."
                : "Ajuste a pesquisa ou os filtros de estado para encontrar o que procura."
            }
            action={
              db.quotes.length === 0 ? (
                <Button onClick={() => nav({ page: "editor" })}>
                  <Plus className="h-4 w-4" /> Criar orçamento
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          {/* tabela desktop */}
          <Card className="anim-rise hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-raise/70 text-left text-[11px] font-bold uppercase tracking-wide text-faint">
                  <th className="px-5 py-3">Número</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Obra</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ quote: q, t }) => (
                  <tr key={q.id} className="group border-b border-line transition-colors last:border-0 hover:bg-raise/60">
                    <td className="px-5 py-3">
                      <span className="font-mono text-[13px] font-bold text-ink">{q.number}</span>
                      <span className="ml-1.5 rounded bg-raise px-1 py-0.5 font-mono text-[10px] font-semibold text-mut">V{q.version}</span>
                      <span className="block text-[11px] text-faint">{fmtDate(q.updatedAt)}</span>
                    </td>
                    <td className="max-w-44 truncate px-3 py-3 font-medium text-ink">{clientName(q.clientId)}</td>
                    <td className="max-w-52 px-3 py-3">
                      <span className="block truncate font-medium text-ink">{q.workName || "—"}</span>
                      <span className="text-[11px] text-faint">{q.workType}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative inline-block">
                        <select
                          value={q.status}
                          onChange={(e) => {
                            setStatus(q.id, e.target.value as QuoteStatus);
                            toast(`Estado alterado para “${STATUS_META[e.target.value as QuoteStatus].label}”`, "info");
                          }}
                          className={cn(
                            "cursor-pointer appearance-none rounded-md py-1 pl-2 pr-6 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-volt/40",
                            STATUS_META[q.status].badge
                          )}
                          aria-label={`Alterar estado do orçamento ${q.number}`}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s} className="bg-card text-ink">
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[13px] font-bold text-ink tnum">{fmtEUR(t.total)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <IconBtn label="Pré-visualizar proposta" onClick={() => nav({ page: "preview", id: q.id })}>
                          <Eye className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn label="Editar orçamento" onClick={() => nav({ page: "editor", id: q.id })}>
                          <Pencil className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn label="Duplicar orçamento" onClick={() => duplicateQuote(q.id)}>
                          <Copy className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn label="Eliminar orçamento" className="hover:text-bad" onClick={() => setToDelete(q.id)}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* cartões mobile */}
          <div className="space-y-3 md:hidden">
            {rows.map(({ quote: q, t }) => (
              <Card key={q.id} className="anim-rise p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-ink">
                      {q.number} <span className="rounded bg-raise px-1 py-0.5 text-[10px] font-semibold text-mut">V{q.version}</span>
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{q.workName || "Sem nome de obra"}</p>
                    <p className="text-xs text-mut">{clientName(q.clientId)}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <div>
                    <p className="font-mono text-base font-bold text-ink tnum">{fmtEUR(t.total)}</p>
                    <p className="text-[11px] text-faint">{fmtDate(q.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <IconBtn label="Pré-visualizar" onClick={() => nav({ page: "preview", id: q.id })}>
                      <Eye className="h-4.5 w-4.5" />
                    </IconBtn>
                    <IconBtn label="Editar" onClick={() => nav({ page: "editor", id: q.id })}>
                      <Pencil className="h-4.5 w-4.5" />
                    </IconBtn>
                    <IconBtn label="Duplicar" onClick={() => duplicateQuote(q.id)}>
                      <Copy className="h-4.5 w-4.5" />
                    </IconBtn>
                    <IconBtn label="Eliminar" className="hover:text-bad" onClick={() => setToDelete(q.id)}>
                      <Trash2 className="h-4.5 w-4.5" />
                    </IconBtn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Confirm
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteQuote(toDelete);
            toast("Orçamento eliminado", "info");
          }
        }}
        title="Eliminar orçamento"
        message="Esta ação é irreversível. O orçamento, as suas linhas e o histórico de versões serão removidos permanentemente."
      />
    </div>
  );
}
