import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  Cable,
  Copy,
  Cylinder,
  Eye,
  FileDown,
  History,
  LayoutTemplate,
  Lightbulb,
  Network,
  Package,
  Percent,
  Plug,
  Plus,
  Save,
  Share2,
  Tag,
  ToggleLeft,
  Trash2,
  Truck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useStore } from "../store";
import { CATEGORIES, blankClient, blankLine, blankQuote } from "../data";
import type { CategoryDef } from "../data";
import { calcQuote, clamp, fmtEUR, fmtNum, fmtDateTime, nowIso, sanitizeLine, uid, validNif } from "../calc";
import type { Article, Client, CustomCategory, ItemKind, Quote, QuoteLine, QuoteStatus } from "../types";
import { IVA_PRESETS, KIND_LABEL, STATUS_META, STATUS_ORDER, UNITS, WORK_TYPES } from "../types";
import { buildPdf, summaryText } from "../pdf";
import { Button, Card, Confirm, IconBtn, Input, Modal, Segmented, Select, Sheet, StatusBadge, Textarea, cn } from "../components/ui";

const KIND_ICON: Record<ItemKind, typeof Package> = {
  material: Package,
  mao_obra: Wrench,
  equipamento: Truck,
  servico: Calculator,
  outro: Tag,
};

const KIND_TONE: Record<ItemKind, string> = {
  material: "bg-info/12 text-info",
  mao_obra: "bg-warn/12 text-warn",
  equipamento: "bg-volt/18 text-warn",
  servico: "bg-ok/12 text-ok",
  outro: "bg-faint/15 text-mut",
};

const CAT_ICON: Record<string, typeof Zap> = {
  zap: Zap,
  plug: Plug,
  bulb: Lightbulb,
  network: Network,
  cable: Cable,
  cylinder: Cylinder,
  toggle: ToggleLeft,
  wrench: Wrench,
  truck: Truck,
  tag: Tag,
};

const num = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const cellInput =
  "h-8 w-full rounded-md border border-line bg-raise px-2 text-[13px] text-ink placeholder:text-faint focus:border-volt focus:outline-none focus:ring-2 focus:ring-volt/25";

function SectionTitle({ n, title, desc, right }: { n: string; title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-volt font-display text-[13px] font-bold text-voltink">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
        {desc && <p className="text-xs text-mut">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

function initDraft(db: ReturnType<typeof useStore>["db"], route: { id?: string; templateId?: string }): Quote {
  if (route.id) {
    const q = db.quotes.find((x) => x.id === route.id);
    if (q) return JSON.parse(JSON.stringify(q)) as Quote;
  }
  const q = blankQuote(db.company);
  if (route.templateId) {
    const t = db.templates.find((x) => x.id === route.templateId);
    if (t) {
      q.lines = t.lines.map((l) => ({ ...l, id: uid() }));
      q.extras = t.extras.map((e) => ({ ...e, id: uid() }));
      q.workType = t.workType;
    }
  }
  return q;
}

export default function EditorPage() {
  const store = useStore();
  const { db, route, nav, toast, saveQuote, saveClient, saveTemplate, saveCustomCategory } = store;

  const [draft, setDraft] = useState<Quote>(() => initDraft(db, route));
  const [clientMode, setClientMode] = useState<"existing" | "new">(() => {
    const q = db.quotes.find((x) => x.id === route.id);
    return q?.clientId ? "existing" : "new";
  });
  const [newClient, setNewClient] = useState<Client>(() => blankClient());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catOpen, setCatOpen] = useState(false);
  const [catSelected, setCatSelected] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({ name: "", kind: "material" as ItemKind, subs: "" });
  const [libOpen, setLibOpen] = useState(false);
  const [libQuery, setLibQuery] = useState("");
  const [libKind, setLibKind] = useState<"todos" | ItemKind>("todos");
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [backConfirm, setBackConfirm] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [globalMargin, setGlobalMargin] = useState("");

  useEffect(() => {
    const h = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) {
        setClientMode("existing");
        setDraft((d) => ({ ...d, clientId: id }));
      }
    };
    window.addEventListener("eqp:preselect-client", h);
    return () => window.removeEventListener("eqp:preselect-client", h);
  }, []);

  const totals = useMemo(() => calcQuote(draft, db.company.defaultIva), [draft, db.company.defaultIva]);

  const patch = (p: Partial<Quote>) => setDraft((d) => ({ ...d, ...p }));
  const patchLine = (id: string, p: Partial<QuoteLine>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) }));

  const addLine = (partial?: Partial<QuoteLine>) =>
    setDraft((d) => ({ ...d, lines: [...d.lines, { ...blankLine("material", db.company.defaultIva), ...partial }] }));

  const removeLine = (id: string) => setDraft((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== id) }));
  const dupLine = (id: string) =>
    setDraft((d) => {
      const i = d.lines.findIndex((l) => l.id === id);
      if (i < 0) return d;
      const copy = { ...d.lines[i], id: uid() };
      const lines = [...d.lines];
      lines.splice(i + 1, 0, copy);
      return { ...d, lines };
    });

  const allCats: (CategoryDef | CustomCategory)[] = useMemo(
    () => [...CATEGORIES, ...db.customCategories.map((c) => ({ name: c.name, icon: "tag", kind: c.kind, subs: c.subs }))],
    [db.customCategories]
  );

  const addFromCategory = (cat: CategoryDef | CustomCategory, sub: string) => {
    addLine({ kind: cat.kind, category: cat.name, subcategory: sub, description: sub });
    setCatOpen(false);
    toast(`Linha adicionada: ${sub}`, "ok");
  };

  const addFromArticle = (a: Article) => {
    const margin = a.cost > 0 ? Math.max(0, Math.round(((a.price - a.cost) / a.cost) * 100)) : 0;
    addLine({
      kind: a.kind,
      category: a.category,
      subcategory: a.subcategory,
      description: a.description,
      unit: a.unit,
      unitCost: a.cost,
      marginPct: margin,
      ivaPct: a.iva,
    });
    toast(`${a.code} adicionado ao orçamento`, "ok");
  };

  /* ------------------------------- guardar ------------------------------- */

  const doSave = (): Quote | null => {
    const errs: Record<string, string> = {};
    let clientId = draft.clientId;
    if (clientMode === "new") {
      if (!newClient.name.trim() && !newClient.company.trim()) errs.client = "Indique o nome ou a empresa do cliente.";
      else if (!validNif(newClient.nif)) errs.client = "NIF inválido — deve ter 9 dígitos.";
      if (Object.keys(errs).length) {
        setErrors(errs);
        toast("Verifique os dados do cliente", "bad");
        return null;
      }
      saveClient({ ...newClient, name: newClient.name.trim() });
      clientId = newClient.id;
    } else if (!clientId) {
      setErrors({ client: "Selecione um cliente existente ou crie um novo." });
      toast("Selecione um cliente", "bad");
      return null;
    }
    if (!draft.workName.trim()) {
      setErrors((e) => ({ ...e, work: "Indique o nome da obra." }));
      toast("Indique o nome da obra", "bad");
      return null;
    }
    if (draft.lines.length === 0) {
      toast("Adicione pelo menos um trabalho ao orçamento", "bad");
      return null;
    }
    const clean: Quote = {
      ...draft,
      clientId,
      lines: draft.lines.map(sanitizeLine),
      extras: draft.extras.map((e) => ({ ...e, value: Math.max(0, Number(e.value) || 0) })),
      globalDiscountPct: clamp(Number(draft.globalDiscountPct) || 0, 0, 100),
      globalDiscountAbs: Math.max(0, Number(draft.globalDiscountAbs) || 0),
      validityDays: clamp(Number(draft.validityDays) || 30, 1, 365),
    };
    const saved = saveQuote(clean);
    setDraft(saved);
    if (clientMode === "new") {
      setClientMode("existing");
      setNewClient(blankClient());
    }
    setErrors({});
    toast(`Orçamento ${saved.number} · V${saved.version} guardado`);
    return saved;
  };

  const goPreview = () => {
    const saved = draft.number ? (saveQuote(draft), draft) : doSave();
    if (!saved) return;
    nav({ page: "preview", id: saved.id });
  };

  const requireSaved = (): boolean => {
    if (!draft.number) {
      toast("Guarde o orçamento antes de exportar ou partilhar", "bad");
      return false;
    }
    return true;
  };

  const getPdf = () => {
    const client = db.clients.find((c) => c.id === draft.clientId);
    return buildPdf(draft, client, db.company, totals);
  };

  const onPdf = () => {
    if (!requireSaved()) return;
    getPdf().save(`${draft.number}_V${draft.version}.pdf`);
    toast("PDF exportado com sucesso");
  };

  const onCopySummary = async () => {
    const client = db.clients.find((c) => c.id === draft.clientId);
    const text = summaryText(draft, client, db.company, totals);
    try {
      await navigator.clipboard.writeText(text);
      toast("Resumo copiado para a área de transferência");
    } catch {
      toast("Não foi possível copiar automaticamente", "bad");
    }
  };

  const shareFile = async () => {
    if (!requireSaved()) return;
    try {
      const blob = getPdf().output("blob");
      const file = new File([blob], `${draft.number}_V${draft.version}.pdf`, { type: "application/pdf" });
      const nav2 = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav2.canShare && nav2.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Orçamento ${draft.number}`, text: summaryText(draft, db.clients.find((c) => c.id === draft.clientId), db.company, totals) });
        setShareOpen(false);
      } else {
        toast("A partilha de ficheiros não é suportada neste dispositivo", "info");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast("Partilha cancelada ou indisponível", "info");
    }
  };

  const newVersion = () => {
    if (!requireSaved()) return;
    const next: Quote = {
      ...draft,
      history: [...draft.history, { version: draft.version, date: draft.updatedAt || nowIso(), total: totals.total, status: draft.status }],
      version: draft.version + 1,
    };
    const saved = saveQuote(next);
    setDraft(saved);
    toast(`Nova versão criada: ${saved.number} — V${saved.version}`, "info");
  };

  const submitTemplate = () => {
    if (draft.lines.length === 0) {
      toast("Adicione trabalhos antes de guardar como modelo", "bad");
      return;
    }
    const name = tplName.trim() || draft.workName || "Novo modelo";
    saveTemplate({
      id: uid(),
      name,
      description: tplDesc.trim(),
      workType: draft.workType,
      lines: draft.lines.map((l) => ({ ...l, id: uid() })),
      extras: draft.extras.map((e) => ({ ...e, id: uid() })),
      createdAt: nowIso(),
    });
    setTplOpen(false);
    setTplName("");
    setTplDesc("");
    toast(`Modelo “${name}” guardado`);
  };

  const canShareFiles = typeof navigator !== "undefined" && "share" in navigator;

  const selClient = db.clients.find((c) => c.id === draft.clientId);

  const filteredLib = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    return db.articles
      .filter((a) => (libKind === "todos" ? true : a.kind === libKind))
      .filter((a) => !q || a.description.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
      .sort((a, b) => a.description.localeCompare(b.description));
  }, [db.articles, libQuery, libKind]);

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="space-y-5">
      {/* cabeçalho */}
      <div className="anim-rise flex flex-wrap items-center gap-3">
        <IconBtn label="Voltar aos orçamentos" onClick={() => (draft.number || draft.lines.length === 0 ? nav({ page: "quotes" }) : setBackConfirm(true))} className="border border-line bg-card">
          <ArrowLeft className="h-4.5 w-4.5" />
        </IconBtn>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-bold tracking-tight text-ink">{draft.number || "Novo orçamento"}</h2>
            {draft.number && (
              <span className="rounded-md bg-raise px-1.5 py-0.5 font-mono text-[11px] font-bold text-mut">V{draft.version}</span>
            )}
            <StatusBadge status={draft.status} />
          </div>
          <p className="text-xs text-faint">
            {draft.number ? `Atualizado ${fmtDateTime(draft.updatedAt)}` : `Será atribuído o número ${store.peekNumber()} ao guardar`}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Button variant="soft" onClick={goPreview}>
            <Eye className="h-4 w-4" /> Pré-visualizar
          </Button>
          <Button onClick={doSave}>
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* 1 — cliente */}
          <Card className="anim-rise p-5">
            <SectionTitle
              n="1"
              title="Cliente"
              desc="Quem vai receber a proposta"
              right={
                <Segmented<"existing" | "new">
                  value={clientMode}
                  onChange={(v) => {
                    setClientMode(v);
                    setErrors((e) => ({ ...e, client: "" }));
                  }}
                  options={[
                    { value: "existing", label: "Existente" },
                    { value: "new", label: "Novo" },
                  ]}
                />
              }
            />
            {errors.client && <p className="mb-3 rounded-lg border border-bad/30 bg-bad/8 px-3 py-2 text-xs font-semibold text-bad">{errors.client}</p>}
            {clientMode === "existing" ? (
              <div className="space-y-3">
                <Select label="Cliente" id="ed-client" value={draft.clientId} onChange={(e) => patch({ clientId: e.target.value })}>
                  <option value="">— Selecionar cliente —</option>
                  {db.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name}
                      {c.nif ? ` · ${c.nif}` : ""}
                    </option>
                  ))}
                </Select>
                {selClient && (
                  <div className="rounded-xl border border-line bg-raise px-4 py-3 text-xs text-mut">
                    <p className="text-sm font-semibold text-ink">{selClient.company || selClient.name}</p>
                    {selClient.company && <p>{selClient.name}</p>}
                    {selClient.nif && <p>NIF {selClient.nif}</p>}
                    {(selClient.address || selClient.locality) && (
                      <p>
                        {selClient.address}, {selClient.postal} {selClient.locality}
                      </p>
                    )}
                    {(selClient.phone || selClient.email) && (
                      <p>
                        {selClient.phone} {selClient.email && `· ${selClient.email}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Input label="Nome / contacto *" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Ex.: Marisa Tavares" />
                <Input label="Empresa" value={newClient.company} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} />
                <Input label="NIF" inputMode="numeric" value={newClient.nif} onChange={(e) => setNewClient({ ...newClient, nif: e.target.value })} placeholder="9 dígitos" />
                <Input label="Telefone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                <Input label="Morada" className="sm:col-span-2" value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
                <Input label="Código postal" value={newClient.postal} onChange={(e) => setNewClient({ ...newClient, postal: e.target.value })} />
                <Input label="Localidade" value={newClient.locality} onChange={(e) => setNewClient({ ...newClient, locality: e.target.value })} />
                <Input label="Email" type="email" className="sm:col-span-2" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                <Textarea label="Observações" className="sm:col-span-2" value={newClient.notes} onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })} />
              </div>
            )}
          </Card>

          {/* 2 — obra */}
          <Card className="anim-rise p-5">
            <SectionTitle n="2" title="Dados da obra" desc="Local e contexto da empreitada" />
            {errors.work && <p className="mb-3 rounded-lg border border-bad/30 bg-bad/8 px-3 py-2 text-xs font-semibold text-bad">{errors.work}</p>}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Nome da obra *" value={draft.workName} onChange={(e) => { patch({ workName: e.target.value }); setErrors((er) => ({ ...er, work: "" })); }} placeholder="Ex.: Moradia T3 — instalação elétrica completa" />
              <Select label="Tipo de obra" value={draft.workType} onChange={(e) => patch({ workType: e.target.value })}>
                {WORK_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
              <Input label="Morada da obra" value={draft.workAddress} onChange={(e) => patch({ workAddress: e.target.value })} />
              <div className="grid grid-cols-2 gap-3.5">
                <Input label="Cód. postal" value={draft.workPostal} onChange={(e) => patch({ workPostal: e.target.value })} />
                <Input label="Localidade" value={draft.workLocality} onChange={(e) => patch({ workLocality: e.target.value })} />
              </div>
              <Input label="Início previsto" type="date" value={draft.startDate ? draft.startDate.slice(0, 10) : ""} onChange={(e) => patch({ startDate: e.target.value })} />
              <Input label="Conclusão prevista" type="date" value={draft.endDate ? draft.endDate.slice(0, 10) : ""} onChange={(e) => patch({ endDate: e.target.value })} />
              <Input label="Responsável" value={draft.manager} onChange={(e) => patch({ manager: e.target.value })} className="sm:col-span-2" />
              <Textarea label="Observações da obra" className="sm:col-span-2" value={draft.workNotes} onChange={(e) => patch({ workNotes: e.target.value })} />
            </div>
          </Card>

          {/* 3 — trabalhos */}
          <Card className="anim-rise p-5">
            <SectionTitle n="3" title="Trabalhos" desc={`${draft.lines.length} linha${draft.lines.length === 1 ? "" : "s"} no orçamento`} />
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <Button key={k} variant="soft" size="sm" onClick={() => addLine({ kind: k })}>
                    <Icon className="h-3.5 w-3.5" /> {KIND_LABEL[k]}
                  </Button>
                );
              })}
              <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
              <Button variant="outline" size="sm" onClick={() => { setCatSelected(null); setCatOpen(true); }}>
                <Zap className="h-3.5 w-3.5 text-volt" /> Por categoria
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLibOpen(true)}>
                <Package className="h-3.5 w-3.5 text-volt" /> Da biblioteca
              </Button>
            </div>

            {draft.lines.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-line bg-raise/50 px-6 py-10 text-center">
                <Zap className="mx-auto mb-2 h-7 w-7 text-faint" />
                <p className="text-sm font-semibold text-ink">O orçamento está vazio</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-mut">
                  Adicione linhas por tipo, escolha da biblioteca de categorias elétricas ou importe artigos da sua biblioteca de preços.
                </p>
              </div>
            ) : (
              <>
                {/* tabela desktop */}
                <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
                  <table className="w-full min-w-[1080px] border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-raise text-left text-[10px] font-bold uppercase tracking-wider text-faint">
                        <th className="px-2 py-2.5 pl-3">Categoria</th>
                        <th className="px-2 py-2.5">Descrição</th>
                        <th className="px-1 py-2.5">Un.</th>
                        <th className="px-1 py-2.5 text-right">Qtd.</th>
                        <th className="px-1 py-2.5 text-right">Desp.%</th>
                        <th className="px-1 py-2.5 text-right">Custo €</th>
                        <th className="px-1 py-2.5 text-right">Marg.%</th>
                        <th className="px-1 py-2.5 text-right">Desc.%</th>
                        <th className="px-1 py-2.5">IVA</th>
                        <th className="px-1 py-2.5 text-right">Total</th>
                        <th className="px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lines.map((l) => {
                        const lc = totals.lines.find((x) => x.line.id === l.id);
                        const cat = allCats.find((c) => c.name === l.category);
                        const Icon = KIND_ICON[l.kind];
                        return (
                          <tr key={l.id} className="group border-b border-line align-top transition-colors last:border-0 hover:bg-raise/50">
                            <td className="w-48 px-2 py-2 pl-3">
                              <span className={cn("mb-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold", KIND_TONE[l.kind])}>
                                <Icon className="h-3 w-3" /> {KIND_LABEL[l.kind]}
                              </span>
                              <select
                                value={l.category}
                                onChange={(e) => patchLine(l.id, { category: e.target.value, subcategory: "" })}
                                className={cn(cellInput, "mb-1 cursor-pointer")}
                                aria-label="Categoria"
                              >
                                <option value="">— Categoria —</option>
                                {allCats.map((c) => (
                                  <option key={c.name} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={l.subcategory}
                                onChange={(e) => patchLine(l.id, { subcategory: e.target.value })}
                                className={cn(cellInput, "cursor-pointer")}
                                aria-label="Subcategoria"
                              >
                                <option value="">— Subcategoria —</option>
                                {cat?.subs.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                                {l.subcategory && !cat?.subs.includes(l.subcategory) && <option value={l.subcategory}>{l.subcategory}</option>}
                              </select>
                            </td>
                            <td className="min-w-52 px-2 py-2">
                              <input value={l.description} onChange={(e) => patchLine(l.id, { description: e.target.value })} placeholder="Descrição do trabalho…" className={cellInput} aria-label="Descrição" />
                            </td>
                            <td className="w-24 px-1 py-2">
                              <select value={l.unit} onChange={(e) => patchLine(l.id, { unit: e.target.value })} className={cn(cellInput, "cursor-pointer")} aria-label="Unidade">
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="w-20 px-1 py-2">
                              <input type="number" min={0} step="any" value={l.qty === 0 ? "" : l.qty} onChange={(e) => patchLine(l.id, { qty: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} aria-label="Quantidade" />
                              {l.wastePct > 0 && lc && (
                                <p className="mt-0.5 text-right font-mono text-[10px] text-warn" title="Quantidade com desperdício">
                                  → {fmtNum(lc.qtyEff)} {l.unit}
                                </p>
                              )}
                            </td>
                            <td className="w-16 px-1 py-2">
                              <input type="number" min={0} max={100} step="any" value={l.wastePct === 0 ? "" : l.wastePct} onChange={(e) => patchLine(l.id, { wastePct: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} aria-label="Desperdício percentual" />
                            </td>
                            <td className="w-24 px-1 py-2">
                              <input type="number" min={0} step="any" value={l.unitCost === 0 ? "" : l.unitCost} onChange={(e) => patchLine(l.id, { unitCost: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} aria-label="Custo unitário" />
                            </td>
                            <td className="w-20 px-1 py-2">
                              <input type="number" min={0} step="any" value={l.marginPct === 0 ? "" : l.marginPct} onChange={(e) => patchLine(l.id, { marginPct: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} aria-label="Margem percentual" />
                            </td>
                            <td className="w-16 px-1 py-2">
                              <input type="number" min={0} max={100} step="any" value={l.discountPct === 0 ? "" : l.discountPct} onChange={(e) => patchLine(l.id, { discountPct: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} aria-label="Desconto percentual" />
                            </td>
                            <td className="w-20 px-1 py-2">
                              <select value={l.ivaPct} onChange={(e) => patchLine(l.id, { ivaPct: num(e.target.value) })} className={cn(cellInput, "cursor-pointer font-mono")} aria-label="IVA">
                                {[...new Set([...IVA_PRESETS, l.ivaPct])].sort((a, b) => a - b).map((r) => (
                                  <option key={r} value={r}>
                                    {r}%
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="w-28 px-1 py-2 text-right">
                              <p className="font-mono text-[13px] font-bold text-ink tnum">{fmtEUR(lc?.net ?? 0)}</p>
                              <p className="font-mono text-[10px] text-faint tnum">custo {fmtEUR(lc?.cost ?? 0)}</p>
                            </td>
                            <td className="w-16 px-2 py-2">
                              <div className="flex items-center justify-end gap-0.5 opacity-40 transition-opacity group-hover:opacity-100">
                                <IconBtn label="Duplicar linha" className="h-7 w-7" onClick={() => dupLine(l.id)}>
                                  <Copy className="h-3.5 w-3.5" />
                                </IconBtn>
                                <IconBtn label="Remover linha" className="h-7 w-7 hover:text-bad" onClick={() => removeLine(l.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </IconBtn>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* cartões mobile */}
                <div className="space-y-3 md:hidden">
                  {draft.lines.map((l, i) => {
                    const lc = totals.lines.find((x) => x.line.id === l.id);
                    const Icon = KIND_ICON[l.kind];
                    return (
                      <div key={l.id} className="rounded-xl border border-line bg-raise/50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold", KIND_TONE[l.kind])}>
                            <Icon className="h-3 w-3" /> {KIND_LABEL[l.kind]} · {i + 1}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <IconBtn label="Duplicar linha" className="h-7 w-7" onClick={() => dupLine(l.id)}>
                              <Copy className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn label="Remover linha" className="h-7 w-7 hover:text-bad" onClick={() => removeLine(l.id)}>
                              <X className="h-3.5 w-3.5" />
                            </IconBtn>
                          </div>
                        </div>
                        <input value={l.description} onChange={(e) => patchLine(l.id, { description: e.target.value })} placeholder="Descrição…" className={cn(cellInput, "mb-2")} />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase text-faint">Qtd.</p>
                            <input type="number" min={0} step="any" value={l.qty === 0 ? "" : l.qty} onChange={(e) => patchLine(l.id, { qty: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} />
                          </div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase text-faint">Un.</p>
                            <select value={l.unit} onChange={(e) => patchLine(l.id, { unit: e.target.value })} className={cn(cellInput, "cursor-pointer")}>
                              {UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase text-faint">Desp.%</p>
                            <input type="number" min={0} max={100} value={l.wastePct === 0 ? "" : l.wastePct} onChange={(e) => patchLine(l.id, { wastePct: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} />
                          </div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase text-faint">Custo €</p>
                            <input type="number" min={0} step="any" value={l.unitCost === 0 ? "" : l.unitCost} onChange={(e) => patchLine(l.id, { unitCost: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} />
                          </div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase text-faint">Marg.%</p>
                            <input type="number" min={0} value={l.marginPct === 0 ? "" : l.marginPct} onChange={(e) => patchLine(l.id, { marginPct: num(e.target.value) })} className={cn(cellInput, "text-right font-mono")} />
                          </div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase text-faint">IVA</p>
                            <select value={l.ivaPct} onChange={(e) => patchLine(l.id, { ivaPct: num(e.target.value) })} className={cn(cellInput, "cursor-pointer font-mono")}>
                              {[...new Set([...IVA_PRESETS, l.ivaPct])].sort((a, b) => a - b).map((r) => (
                                <option key={r} value={r}>
                                  {r}%
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                          <span className="text-[11px] text-mut">
                            Desc. <input type="number" min={0} max={100} value={l.discountPct === 0 ? "" : l.discountPct} onChange={(e) => patchLine(l.id, { discountPct: num(e.target.value) })} className="mx-1 inline-block h-7 w-14 rounded-md border border-line bg-raise px-1.5 text-center font-mono text-xs focus:border-volt focus:outline-none" />
                            %
                            {l.wastePct > 0 && lc && <span className="ml-2 text-warn">→ {fmtNum(lc.qtyEff)} {l.unit}</span>}
                          </span>
                          <span className="font-mono text-sm font-bold text-ink tnum">{fmtEUR(lc?.net ?? 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          {/* 4 — margens e custos */}
          <Card className="anim-rise p-5">
            <SectionTitle n="4" title="Margens, descontos e despesas" desc="Ajuste global e custos adicionais da empreitada" />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-line bg-raise/60 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mut">
                  <Percent className="h-3.5 w-3.5 text-volt" /> Margem global
                </p>
                <div className="flex gap-2">
                  <input type="number" min={0} value={globalMargin} onChange={(e) => setGlobalMargin(e.target.value)} placeholder="25" className={cn(cellInput, "h-9 text-right font-mono")} aria-label="Margem global a aplicar" />
                  <Button
                    variant="soft"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      const m = num(globalMargin);
                      setDraft((d) => ({ ...d, lines: d.lines.map((l) => ({ ...l, marginPct: m })) }));
                      toast(`Margem de ${fmtNum(m)}% aplicada a todas as linhas`, "info");
                    }}
                  >
                    Aplicar a tudo
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-faint">Substitui a margem individual de cada linha.</p>
              </div>
              <div className="rounded-xl border border-line bg-raise/60 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mut">
                  <Tag className="h-3.5 w-3.5 text-volt" /> Desconto global
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-faint">Percentagem</p>
                    <input type="number" min={0} max={100} value={draft.globalDiscountPct === 0 ? "" : draft.globalDiscountPct} onChange={(e) => patch({ globalDiscountPct: num(e.target.value) })} className={cn(cellInput, "h-9 text-right font-mono")} aria-label="Desconto global em percentagem" />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-faint">Valor (€)</p>
                    <input type="number" min={0} value={draft.globalDiscountAbs === 0 ? "" : draft.globalDiscountAbs} onChange={(e) => patch({ globalDiscountAbs: num(e.target.value) })} className={cn(cellInput, "h-9 text-right font-mono")} aria-label="Desconto global em euros" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-faint">
                  Aplicado: <strong className="font-mono text-bad">− {fmtEUR(totals.globalDiscount)}</strong>
                </p>
              </div>
              <div className="rounded-xl border border-line bg-raise/60 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mut">
                  <Truck className="h-3.5 w-3.5 text-volt" /> Despesa rápida
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Deslocação", "Transporte", "Aluguer de equipamento", "Consumíveis", "Logística", "Projeto", "Taxas"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDraft((d) => ({ ...d, extras: [...d.extras, { id: uid(), label: s, type: "fixo", value: 0, ivaPct: db.company.defaultIva }] }))}
                      className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-mut transition-colors hover:border-volt hover:text-ink"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* lista de custos adicionais */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-mut">Despesas adicionais ({draft.extras.length})</h4>
                <Button variant="soft" size="sm" onClick={() => setDraft((d) => ({ ...d, extras: [...d.extras, { id: uid(), label: "Novo custo", type: "fixo", value: 0, ivaPct: db.company.defaultIva }] }))}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
              {draft.extras.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-4 text-center text-xs text-faint">
                  Sem despesas adicionais — deslocação, transporte, alugueres, consumíveis…
                </p>
              ) : (
                <ul className="space-y-2">
                  {draft.extras.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
                      <input value={e.label} onChange={(ev) => setDraft((d) => ({ ...d, extras: d.extras.map((x) => (x.id === e.id ? { ...x, label: ev.target.value } : x)) }))} className={cn(cellInput, "min-w-40 flex-1")} aria-label="Designação da despesa" />
                      <select value={e.type} onChange={(ev) => setDraft((d) => ({ ...d, extras: d.extras.map((x) => (x.id === e.id ? { ...x, type: ev.target.value as "fixo" | "pct" } : x)) }))} className={cn(cellInput, "w-36 cursor-pointer")} aria-label="Tipo de despesa">
                        <option value="fixo">Valor fixo (€)</option>
                        <option value="pct">Percentagem (%)</option>
                      </select>
                      <input type="number" min={0} step="any" value={e.value === 0 ? "" : e.value} onChange={(ev) => setDraft((d) => ({ ...d, extras: d.extras.map((x) => (x.id === e.id ? { ...x, value: num(ev.target.value) } : x)) }))} className={cn(cellInput, "w-24 text-right font-mono")} aria-label="Valor da despesa" />
                      <select value={e.ivaPct} onChange={(ev) => setDraft((d) => ({ ...d, extras: d.extras.map((x) => (x.id === e.id ? { ...x, ivaPct: num(ev.target.value) } : x)) }))} className={cn(cellInput, "w-20 cursor-pointer font-mono")} aria-label="IVA da despesa">
                        {[...new Set([...IVA_PRESETS, e.ivaPct])].sort((a, b) => a - b).map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                      <span className="w-20 text-right font-mono text-xs font-bold text-ink tnum">
                        {fmtEUR(totals.extras.find((x) => x.e.id === e.id)?.value ?? 0)}
                      </span>
                      <IconBtn label="Remover despesa" className="h-8 w-8 hover:text-bad" onClick={() => setDraft((d) => ({ ...d, extras: d.extras.filter((x) => x.id !== e.id) }))}>
                        <X className="h-4 w-4" />
                      </IconBtn>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* 5 — condições */}
          <Card className="anim-rise p-5">
            <SectionTitle n="5" title="Condições e observações" desc="Aparecem na proposta impressa e no PDF" />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Textarea label="Observações para o cliente" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Ex.: materiais certificados CE, garantia de 24 meses…" className="sm:col-span-2" />
              <Textarea label="Condições de pagamento" value={draft.conditions} onChange={(e) => patch({ conditions: e.target.value })} className="sm:col-span-2" />
              <Input label="Validade da proposta (dias)" type="number" min={1} value={draft.validityDays} onChange={(e) => patch({ validityDays: num(e.target.value) })} />
              <Select label="Estado do orçamento" value={draft.status} onChange={(e) => patch({ status: e.target.value as QuoteStatus })}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
          </Card>
        </div>

        {/* painel resumo (desktop) */}
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <SummaryPanel draft={draft} totals={totals} patch={patch} onPreview={goPreview} onPdf={onPdf} onShare={() => requireSaved() && setShareOpen(true)} onVersion={newVersion} onTemplate={() => setTplOpen(true)} />
          </div>
        </aside>
      </div>

      {/* barra mobile */}
      <div className="fixed inset-x-3 bottom-[calc(68px+env(safe-area-inset-bottom))] z-40 xl:hidden">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3 shadow-2xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Total c/ IVA</p>
            <p className="font-mono text-lg font-bold leading-tight text-ink tnum">{fmtEUR(totals.total)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => setSummaryOpen(true)}>
              Resumo
            </Button>
            <Button onClick={doSave}>
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} title="Resumo financeiro">
        <SummaryPanel draft={draft} totals={totals} patch={patch} onPreview={() => { setSummaryOpen(false); goPreview(); }} onPdf={onPdf} onShare={() => { if (requireSaved()) { setSummaryOpen(false); setShareOpen(true); } }} onVersion={newVersion} onTemplate={() => { setSummaryOpen(false); setTplOpen(true); }} />
      </Sheet>

      {/* seletor de categorias */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Biblioteca de categorias" subtitle="Categorias elétricas profissionais — escolha a subcategoria para adicionar a linha" width="max-w-2xl">
        {catSelected === null ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allCats.map((c) => {
                const Icon = CAT_ICON[(c as CategoryDef).icon ?? "tag"] ?? Tag;
                return (
                  <button key={c.name} onClick={() => setCatSelected(c.name)} className="flex flex-col items-start gap-2 rounded-xl border border-line bg-raise p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-volt/60 hover:bg-card">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt/14 text-volt">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold text-ink">{c.name}</span>
                      <span className="text-[11px] text-faint">{c.subs.length} subcategorias</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-line bg-raise/50 p-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mut">Criar categoria personalizada</p>
              <div className="flex flex-wrap gap-2">
                <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Nome da categoria" className={cn(cellInput, "h-9 min-w-36 flex-1")} />
                <select value={newCat.kind} onChange={(e) => setNewCat({ ...newCat, kind: e.target.value as ItemKind })} className={cn(cellInput, "h-9 w-36 cursor-pointer")}>
                  {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <Button
                  variant="soft"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (!newCat.name.trim()) {
                      toast("Indique o nome da categoria", "bad");
                      return;
                    }
                    saveCustomCategory({ id: uid(), name: newCat.name.trim(), kind: newCat.kind, subs: newCat.subs.split(",").map((s) => s.trim()).filter(Boolean) });
                    setNewCat({ name: "", kind: "material", subs: "" });
                    toast("Categoria criada");
                  }}
                >
                  Criar
                </Button>
              </div>
              <input value={newCat.subs} onChange={(e) => setNewCat({ ...newCat, subs: e.target.value })} placeholder="Subcategorias separadas por vírgula (opcional)" className={cn(cellInput, "mt-2 h-9")} />
            </div>
          </>
        ) : (
          (() => {
            const cat = allCats.find((c) => c.name === catSelected);
            return (
              <div>
                <Button variant="ghost" size="sm" className="mb-3" onClick={() => setCatSelected(null)}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Todas as categorias
                </Button>
                <p className="mb-3 font-display text-sm font-bold text-ink">{catSelected}</p>
                <div className="flex flex-wrap gap-2">
                  {cat?.subs.map((s) => (
                    <button key={s} onClick={() => cat && addFromCategory(cat, s)} className="rounded-lg border border-line bg-raise px-3 py-2 text-[13px] font-semibold text-ink transition-all duration-150 hover:border-volt hover:bg-volt/10 active:scale-95">
                      {s}
                    </button>
                  ))}
                  {(!cat || cat.subs.length === 0) && <p className="text-xs text-faint">Esta categoria ainda não tem subcategorias.</p>}
                </div>
              </div>
            );
          })()
        )}
      </Modal>

      {/* seletor da biblioteca de preços */}
      <Modal open={libOpen} onClose={() => setLibOpen(false)} title="Biblioteca de preços" subtitle="Toque em + para adicionar o artigo ao orçamento com o custo e margem preenchidos" width="max-w-2xl">
        <div className="mb-3 flex flex-wrap gap-2">
          <input value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="Pesquisar artigos…" className={cn(cellInput, "h-9 min-w-44 flex-1")} autoFocus />
          <select value={libKind} onChange={(e) => setLibKind(e.target.value as "todos" | ItemKind)} className={cn(cellInput, "h-9 w-40 cursor-pointer")}>
            <option value="todos">Todos os tipos</option>
            {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        {filteredLib.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-faint">Sem artigos correspondentes. Adicione artigos na página Biblioteca de Preços.</p>
        ) : (
          <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {filteredLib.map((a) => {
              const Icon = KIND_ICON[a.kind];
              const margin = a.cost > 0 ? Math.round(((a.price - a.cost) / a.cost) * 100) : 0;
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5 transition-colors hover:border-volt/50">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", KIND_TONE[a.kind])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{a.description}</span>
                    <span className="block text-[11px] text-faint">
                      {a.code} · {a.category} · {a.unit}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-xs font-bold text-ink tnum">{fmtEUR(a.price * 100)}</span>
                    <span className="font-mono text-[10px] text-ok tnum">margem {margin}%</span>
                  </span>
                  <IconBtn label={`Adicionar ${a.description}`} className="bg-volt/12 text-volt hover:bg-volt hover:text-voltink" onClick={() => addFromArticle(a)}>
                    <Plus className="h-4 w-4" />
                  </IconBtn>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      {/* guardar como modelo */}
      <Modal
        open={tplOpen}
        onClose={() => setTplOpen(false)}
        title="Guardar como modelo"
        subtitle="Reutilize esta empreitada noutros orçamentos"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTplOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitTemplate}>
              <LayoutTemplate className="h-4 w-4" /> Guardar modelo
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nome do modelo" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder={draft.workName || "Ex.: Moradia T3 standard"} />
          <Textarea label="Descrição" value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} placeholder="O que este modelo inclui…" />
          <p className="text-xs text-mut">
            Serão guardadas <strong className="text-ink">{draft.lines.length} linhas</strong> e <strong className="text-ink">{draft.extras.length} despesas</strong> com os custos e margens atuais.
          </p>
        </div>
      </Modal>

      {/* partilha */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Partilhar orçamento" subtitle={`${draft.number} · V${draft.version}`} width="max-w-md">
        <div className="space-y-2">
          {canShareFiles && (
            <ShareRow icon={<Share2 className="h-4.5 w-4.5" />} label="Partilhar PDF…" desc="Usa a partilha nativa do dispositivo (WhatsApp, AirDrop…)" onClick={shareFile} />
          )}
          <ShareRow icon={<FileDown className="h-4.5 w-4.5" />} label="Transferir PDF" desc="Documento A4 profissional" onClick={() => { onPdf(); setShareOpen(false); }} />
          <ShareRow icon={<Copy className="h-4.5 w-4.5" />} label="Copiar resumo" desc="Valores essenciais em texto" onClick={() => { void onCopySummary(); setShareOpen(false); }} />
          <ShareRow
            icon={<span className="font-mono text-sm font-bold">@</span>}
            label="Enviar por email"
            desc="Abre o cliente de email com o resumo"
            onClick={() => {
              const client = db.clients.find((c) => c.id === draft.clientId);
              const text = summaryText(draft, client, db.company, totals);
              window.location.href = `mailto:${client?.email ?? ""}?subject=${encodeURIComponent(`Orçamento ${draft.number} — ${draft.workName}`)}&body=${encodeURIComponent(text)}`;
              setShareOpen(false);
            }}
          />
          <ShareRow
            icon={<span className="font-mono text-sm font-bold">W</span>}
            label="WhatsApp"
            desc="Abre a partilha via WhatsApp"
            onClick={() => {
              const client = db.clients.find((c) => c.id === draft.clientId);
              window.open(`https://wa.me/?text=${encodeURIComponent(summaryText(draft, client, db.company, totals))}`, "_blank", "noopener");
              setShareOpen(false);
            }}
          />
        </div>
      </Modal>

      <Confirm
        open={backConfirm}
        onClose={() => setBackConfirm(false)}
        onConfirm={() => nav({ page: "quotes" })}
        title="Descartar orçamento?"
        message="Este orçamento ainda não foi guardado. Se sair agora, as linhas e os dados introduzidos serão perdidos."
        confirmLabel="Descartar"
      />
    </div>
  );
}

function ShareRow({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-line bg-raise px-4 py-3 text-left transition-all duration-150 hover:border-volt/60 hover:bg-card active:scale-[.98]">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/14 text-volt">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="text-xs text-mut">{desc}</span>
      </span>
    </button>
  );
}

function SummaryPanel({
  draft,
  totals,
  patch,
  onPreview,
  onPdf,
  onShare,
  onVersion,
  onTemplate,
}: {
  draft: Quote;
  totals: ReturnType<typeof calcQuote>;
  patch: (p: Partial<Quote>) => void;
  onPreview: () => void;
  onPdf: () => void;
  onShare: () => void;
  onVersion: () => void;
  onTemplate: () => void;
}) {
  const kinds: { k: ItemKind; label: string }[] = [
    { k: "material", label: "Custo de materiais" },
    { k: "mao_obra", label: "Mão de obra" },
    { k: "equipamento", label: "Equipamentos" },
    { k: "servico", label: "Serviços" },
    { k: "outro", label: "Outros custos" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="font-display text-sm font-bold text-ink">Resumo</h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
          <span className="anim-blink h-1.5 w-1.5 rounded-full bg-volt" /> tempo real
        </span>
      </div>
      <div className="space-y-1.5 px-4 py-3 text-[13px]">
        {kinds.map(({ k, label }) => (
          <div key={k} className="flex items-center justify-between text-mut">
            <span>{label}</span>
            <span className="font-mono font-semibold text-ink tnum">{fmtEUR(totals.costByKind[k])}</span>
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-line" />
        <div className="flex items-center justify-between text-mut">
          <span>Custo total</span>
          <span className="font-mono font-semibold text-ink tnum">{fmtEUR(totals.totalCost)}</span>
        </div>
        <div className="flex items-center justify-between text-mut">
          <span>Lucro</span>
          <span className={cn("font-mono font-bold tnum", totals.profit >= 0 ? "text-ok" : "text-bad")}>{fmtEUR(totals.profit)}</span>
        </div>
        <div className="flex items-center justify-between text-mut">
          <span>Margem</span>
          <span className={cn("font-mono font-bold tnum", totals.margin >= 25 ? "text-ok" : totals.margin > 0 ? "text-warn" : "text-bad")}>
            {fmtNum(totals.margin)}%
          </span>
        </div>
        <div className="my-2 border-t border-dashed border-line" />
        <div className="flex items-center justify-between text-mut">
          <span>Subtotal</span>
          <span className="font-mono font-semibold text-ink tnum">{fmtEUR(totals.subtotal)}</span>
        </div>
        {(totals.globalDiscount > 0 || totals.lineDiscounts > 0) && (
          <div className="flex items-center justify-between text-bad">
            <span>Descontos</span>
            <span className="font-mono font-semibold tnum">− {fmtEUR(totals.lineDiscounts + totals.globalDiscount)}</span>
          </div>
        )}
        {totals.extras.map((ex) => (
          <div key={ex.e.id} className="flex items-center justify-between text-mut">
            <span className="truncate pr-2">{ex.e.label}</span>
            <span className="font-mono font-semibold text-ink tnum">{fmtEUR(ex.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-mut">
          <span className="font-semibold text-ink">Total sem IVA</span>
          <span className="font-mono font-bold text-ink tnum">{fmtEUR(totals.totalNet)}</span>
        </div>
        {Object.entries(totals.vatByRate)
          .filter(([, v]) => v > 0)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([r, v]) => (
            <div key={r} className="flex items-center justify-between text-mut">
              <span>IVA {r.replace(".", ",")}%</span>
              <span className="font-mono font-semibold text-ink tnum">{fmtEUR(v)}</span>
            </div>
          ))}
      </div>
      <div className="mx-4 mb-4 rounded-xl bg-volt px-4 py-3 shadow-md shadow-volt/25">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-voltink/70">Total com IVA</p>
        <p className="font-display text-2xl font-bold text-voltink tnum">{fmtEUR(totals.total)}</p>
      </div>

      <div className="space-y-3 border-t border-line px-4 py-4">
        <Select label="Estado" value={draft.status} onChange={(e) => patch({ status: e.target.value as QuoteStatus })}>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>

        {draft.history.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">
              <History className="h-3.5 w-3.5" /> Histórico de versões
            </p>
            <ul className="max-h-24 space-y-1 overflow-y-auto">
              {[...draft.history].reverse().map((h) => (
                <li key={h.version} className="flex items-center justify-between rounded-md bg-raise px-2.5 py-1.5 text-[11px]">
                  <span className="font-mono font-bold text-ink">V{h.version}</span>
                  <span className="text-faint">{new Date(h.date).toLocaleDateString("pt-PT")}</span>
                  <span className="font-mono font-semibold text-mut tnum">{fmtEUR(h.total)}</span>
                  <StatusBadge status={h.status} withDot={false} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" size="sm" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" /> Proposta
          </Button>
          <Button variant="soft" size="sm" onClick={onPdf}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="soft" size="sm" onClick={onShare}>
            <Share2 className="h-3.5 w-3.5" /> Partilhar
          </Button>
          <Button variant="soft" size="sm" onClick={onVersion}>
            <History className="h-3.5 w-3.5" /> V{draft.version + 1}
          </Button>
          <Button variant="outline" size="sm" className="col-span-2" onClick={onTemplate}>
            <LayoutTemplate className="h-3.5 w-3.5" /> Guardar como modelo
          </Button>
        </div>
      </div>
    </Card>
  );
}
