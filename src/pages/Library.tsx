import { useMemo, useState } from "react";
import { Calculator, Copy, Package, Pencil, Plus, Search, Star, Tag, Trash2, Truck, Wrench } from "lucide-react";
import { useStore } from "../store";
import { CATEGORIES } from "../data";
import { fmtEUR, fmtNum, uid } from "../calc";
import type { Article, ItemKind } from "../types";
import { IVA_PRESETS, KIND_LABEL, UNITS } from "../types";
import { Button, Card, Confirm, EmptyState, IconBtn, Input, Modal, Select, Textarea, cn } from "../components/ui";

const KIND_ICON: Record<ItemKind, typeof Package> = {
  material: Package,
  mao_obra: Wrench,
  equipamento: Truck,
  servico: Calculator,
  outro: Tag,
};

type Sort = "descricao" | "custo" | "margem" | "recentes";

function blankArticle(defIva: number): Article {
  return {
    id: uid(),
    code: "",
    description: "",
    kind: "material",
    category: "",
    subcategory: "",
    unit: "un",
    manufacturer: "",
    reference: "",
    supplier: "",
    cost: 0,
    price: 0,
    iva: defIva,
    favorite: false,
    notes: "",
  };
}

export default function Library() {
  const { db, saveArticle, deleteArticle, duplicateArticle, toggleFavArticle, toast } = useStore();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"todos" | ItemKind>("todos");
  const [cat, setCat] = useState("todas");
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("descricao");
  const [editing, setEditing] = useState<Article | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<Article | null>(null);
  const [err, setErr] = useState("");

  const catOptions = useMemo(() => {
    const set = new Set<string>(CATEGORIES.map((c) => c.name));
    db.customCategories.forEach((c) => set.add(c.name));
    db.articles.forEach((a) => a.category && set.add(a.category));
    return [...set].sort();
  }, [db.articles, db.customCategories]);

  const num = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...db.articles];
    if (kind !== "todos") list = list.filter((a) => a.kind === kind);
    if (cat !== "todas") list = list.filter((a) => a.category === cat);
    if (favOnly) list = list.filter((a) => a.favorite);
    if (q)
      list = list.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.manufacturer.toLowerCase().includes(q) ||
          a.reference.toLowerCase().includes(q) ||
          a.supplier.toLowerCase().includes(q)
      );
    list.sort((a, b) => {
      switch (sort) {
        case "custo":
          return b.cost - a.cost;
        case "margem": {
          const ma = a.cost > 0 ? (a.price - a.cost) / a.cost : 0;
          const mb = b.cost > 0 ? (b.price - b.cost) / b.cost : 0;
          return mb - ma;
        }
        case "recentes":
          return b.id.localeCompare(a.id);
        default:
          return a.description.localeCompare(b.description);
      }
    });
    return list;
  }, [db.articles, query, kind, cat, favOnly, sort]);

  const submit = () => {
    if (!editing) return;
    if (!editing.description.trim()) {
      setErr("A descrição é obrigatória.");
      return;
    }
    if (editing.cost < 0 || editing.price < 0) {
      setErr("Custo e preço não podem ser negativos.");
      return;
    }
    saveArticle({
      ...editing,
      description: editing.description.trim(),
      code: editing.code.trim() || `ART-${String(db.articles.length + 1).padStart(3, "0")}`,
    });
    setEditing(null);
    setErr("");
    toast(isNew ? "Artigo adicionado à biblioteca" : "Artigo atualizado");
  };

  const marginPct = (a: Article) => (a.cost > 0 ? ((a.price - a.cost) / a.cost) * 100 : 0);

  return (
    <div className="space-y-4">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Biblioteca de Preços</h2>
          <p className="text-sm text-mut">
            {db.articles.length} artigos · {db.articles.filter((a) => a.favorite).length} favoritos
          </p>
        </div>
        <Button
          onClick={() => {
            setIsNew(true);
            setErr("");
            setEditing(blankArticle(db.company.defaultIva));
          }}
        >
          <Plus className="h-4 w-4" /> Novo Artigo
        </Button>
      </div>

      <div className="anim-rise flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisa instantânea…"
            className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-volt focus:outline-none focus:ring-2 focus:ring-volt/25"
            aria-label="Pesquisar artigos"
          />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as "todos" | ItemKind)} className="h-10 cursor-pointer rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink focus:border-volt focus:outline-none" aria-label="Filtrar por tipo">
          <option value="todos">Todos os tipos</option>
          {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 max-w-44 cursor-pointer rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink focus:border-volt focus:outline-none" aria-label="Filtrar por categoria">
          <option value="todas">Todas as categorias</option>
          {catOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setFavOnly(!favOnly)}
          aria-pressed={favOnly}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
            favOnly ? "border-volt bg-volt/12 text-volt" : "border-line bg-card text-mut hover:text-ink"
          )}
        >
          <Star className={cn("h-4 w-4", favOnly && "fill-volt")} /> Favoritos
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 cursor-pointer rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink focus:border-volt focus:outline-none" aria-label="Ordenar artigos">
          <option value="descricao">Descrição A–Z</option>
          <option value="custo">Maior custo</option>
          <option value="margem">Maior margem</option>
          <option value="recentes">Recentes</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={db.articles.length === 0 ? "Biblioteca vazia" : "Sem resultados"}
            desc={db.articles.length === 0 ? "Adicione materiais, mão de obra e equipamentos com os seus preços de custo e venda." : "Ajuste a pesquisa ou os filtros."}
          />
        </Card>
      ) : (
        <>
          <Card className="anim-rise hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-raise/70 text-left text-[11px] font-bold uppercase tracking-wide text-faint">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-3 py-3">Descrição</th>
                  <th className="px-3 py-3">Categoria</th>
                  <th className="px-3 py-3">Un.</th>
                  <th className="px-3 py-3 text-right">Custo</th>
                  <th className="px-3 py-3 text-right">PVP</th>
                  <th className="px-3 py-3 text-right">Margem</th>
                  <th className="px-3 py-3 text-right">IVA</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const Icon = KIND_ICON[a.kind];
                  const m = marginPct(a);
                  return (
                    <tr key={a.id} className="group border-b border-line transition-colors last:border-0 hover:bg-raise/60">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-mut">{a.code}</td>
                      <td className="max-w-64 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-volt/12 text-volt">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{a.description}</span>
                            {(a.manufacturer || a.reference) && (
                              <span className="block truncate text-[11px] text-faint">
                                {[a.manufacturer, a.reference].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium text-ink">{a.category || "—"}</span>
                        <span className="text-[11px] text-faint">{a.subcategory}</span>
                      </td>
                      <td className="px-3 py-3 text-mut">{a.unit}</td>
                      <td className="px-3 py-3 text-right font-mono text-mut tnum">{fmtEUR(a.cost * 100)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-ink tnum">{fmtEUR(a.price * 100)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn("font-mono text-xs font-bold tnum", m >= 30 ? "text-ok" : m > 0 ? "text-warn" : "text-bad")}>{fmtNum(m)}%</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-mut tnum">{a.iva}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                          <IconBtn label={a.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} className={cn(a.favorite && "text-volt")} onClick={() => toggleFavArticle(a.id)}>
                            <Star className={cn("h-4 w-4", a.favorite && "fill-volt")} />
                          </IconBtn>
                          <IconBtn label="Editar artigo" onClick={() => { setIsNew(false); setErr(""); setEditing({ ...a }); }}>
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="Duplicar artigo" onClick={() => { duplicateArticle(a.id); toast("Artigo duplicado"); }}>
                            <Copy className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="Eliminar artigo" className="hover:text-bad" onClick={() => setToDelete(a)}>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 lg:hidden">
            {filtered.map((a) => {
              const Icon = KIND_ICON[a.kind];
              const m = marginPct(a);
              return (
                <Card key={a.id} className="anim-rise p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-volt/12 text-volt">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{a.description}</p>
                      <p className="text-[11px] text-faint">
                        {a.code} · {a.category || "—"} · {a.unit} · IVA {a.iva}%
                      </p>
                    </div>
                    <button aria-label="Favorito" onClick={() => toggleFavArticle(a.id)}>
                      <Star className={cn("h-4.5 w-4.5", a.favorite ? "fill-volt text-volt" : "text-faint")} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <span className="font-mono text-[11px] text-mut tnum">custo {fmtEUR(a.cost * 100)}</span>
                    <span className="font-mono text-sm font-bold text-ink tnum">{fmtEUR(a.price * 100)}</span>
                    <span className={cn("font-mono text-xs font-bold tnum", m >= 30 ? "text-ok" : m > 0 ? "text-warn" : "text-bad")}>{fmtNum(m)}%</span>
                    <div className="flex gap-0.5">
                      <IconBtn label="Editar" className="h-8 w-8" onClick={() => { setIsNew(false); setErr(""); setEditing({ ...a }); }}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label="Duplicar" className="h-8 w-8" onClick={() => { duplicateArticle(a.id); toast("Artigo duplicado"); }}>
                        <Copy className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label="Eliminar" className="h-8 w-8 hover:text-bad" onClick={() => setToDelete(a)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? "Novo artigo" : "Editar artigo"}
        subtitle="Artigos da biblioteca podem ser adicionados a qualquer orçamento com um toque."
        width="max-w-2xl"
        footer={
          <>
            {err && <span className="mr-auto text-xs font-semibold text-bad">{err}</span>}
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Guardar artigo</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Código" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="Ex.: EL-060" />
            <Select label="Tipo" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as ItemKind })}>
              {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
            <Input label="Descrição *" className="sm:col-span-2" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Ex.: Disjuntor magnetotérmico 20A 6kA" />
            <Input label="Categoria" list="lib-cats" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Ex.: Quadros Elétricos" />
            <datalist id="lib-cats">
              {catOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Input label="Subcategoria" value={editing.subcategory} onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })} placeholder="Ex.: Disjuntores" />
            <Select label="Unidade" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            <Select label="IVA" value={editing.iva} onChange={(e) => setEditing({ ...editing, iva: num(e.target.value) })}>
              {[...new Set([...IVA_PRESETS, editing.iva])].sort((a, b) => a - b).map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </Select>
            <Input label="Fabricante" value={editing.manufacturer} onChange={(e) => setEditing({ ...editing, manufacturer: e.target.value })} />
            <Input label="Referência" value={editing.reference} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} />
            <Input label="Fornecedor" value={editing.supplier} onChange={(e) => setEditing({ ...editing, supplier: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Custo (€)" type="number" min={0} step="any" value={editing.cost === 0 ? "" : editing.cost} onChange={(e) => setEditing({ ...editing, cost: num(e.target.value) })} />
              <Input label="Preço venda (€)" type="number" min={0} step="any" value={editing.price === 0 ? "" : editing.price} onChange={(e) => setEditing({ ...editing, price: num(e.target.value) })} />
            </div>
            <div className="flex items-end justify-between rounded-xl border border-line bg-raise px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Margem resultante</p>
                <p className={cn("font-mono text-lg font-bold tnum", marginPct(editing) >= 30 ? "text-ok" : marginPct(editing) > 0 ? "text-warn" : "text-bad")}>
                  {fmtNum(marginPct(editing))}%
                </p>
              </div>
              <button
                onClick={() => setEditing({ ...editing, favorite: !editing.favorite })}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                  editing.favorite ? "border-volt bg-volt/12 text-volt" : "border-line text-mut hover:text-ink"
                )}
                aria-pressed={editing.favorite}
              >
                <Star className={cn("h-4 w-4", editing.favorite && "fill-volt")} /> Favorito
              </button>
            </div>
            <Textarea label="Notas" className="sm:col-span-2" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      <Confirm
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteArticle(toDelete.id);
            toast("Artigo eliminado", "info");
          }
        }}
        title="Eliminar artigo"
        message={`O artigo “${toDelete?.description}” será removido da biblioteca. Os orçamentos que já o utilizam não são afetados.`}
      />
    </div>
  );
}
