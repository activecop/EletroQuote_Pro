import { useEffect, useMemo, useState } from "react";
import { Check, FileText, HardHat, LayoutTemplate, Percent, Plus, Send, TrendingUp, Users, Wallet } from "lucide-react";
import { useStore } from "../store";
import { calcQuote, fmtDate, fmtEUR } from "../calc";
import { STATUS_META, STATUS_ORDER } from "../types";
import type { QuoteStatus } from "../types";
import { Donut, Spark, TrendChart } from "../components/charts";
import type { TrendPoint } from "../components/charts";
import { Button, Card, Segmented, Skeleton, StatusBadge, cn } from "../components/ui";

type Period = "semana" | "mes" | "trimestre" | "ano";

const WON: QuoteStatus[] = ["aprovado", "execucao", "concluido"];

const DONUT_COLOR: Record<QuoteStatus, string> = {
  rascunho: "var(--faint)",
  enviado: "var(--info)",
  negociacao: "var(--warn)",
  aprovado: "var(--ok)",
  recusado: "var(--bad)",
  expirado: "var(--mut)",
  execucao: "var(--volt)",
  concluido: "#4cc38a",
};

function buildBuckets(period: Period): { from: Date; to: Date; label: string }[] {
  const now = new Date();
  const out: { from: Date; to: Date; label: string }[] = [];
  if (period === "semana") {
    for (let i = 6; i >= 0; i--) {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - i);
      const to = new Date(from);
      to.setHours(23, 59, 59, 999);
      out.push({ from, to, label: from.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "") });
    }
  } else if (period === "mes") {
    for (let i = 3; i >= 0; i--) {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (i + 1) * 7 + 1);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      out.push({ from, to, label: `Sem ${4 - i}` });
    }
  } else if (period === "trimestre") {
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (i + 1) * 15 + 1);
      const to = new Date(from);
      to.setDate(to.getDate() + 14);
      to.setHours(23, 59, 59, 999);
      out.push({ from, to, label: from.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).replace(".", "") });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      out.push({ from, to, label: from.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "") });
    }
  }
  return out;
}

export default function Dashboard() {
  const { db, nav } = useStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("mes");

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 550);
    return () => window.clearTimeout(t);
  }, []);

  const defIva = db.company.defaultIva;

  const rows = useMemo(() => db.quotes.map((q) => ({ q, t: calcQuote(q, defIva) })), [db.quotes, defIva]);

  const kpi = useMemo(() => {
    const now = new Date();
    const nonDraft = rows.filter((r) => r.q.status !== "rascunho");
    const won = rows.filter((r) => WON.includes(r.q.status));
    const open = rows.filter((r) => r.q.status === "enviado" || r.q.status === "negociacao");
    const totalQuoted = nonDraft.reduce((s, r) => s + r.t.total, 0);
    const totalWon = won.reduce((s, r) => s + r.t.total, 0);
    const netSum = nonDraft.reduce((s, r) => s + r.t.totalNet, 0);
    const profitSum = nonDraft.reduce((s, r) => s + r.t.profit, 0);
    return {
      thisMonth: rows.filter((r) => {
        const d = new Date(r.q.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length,
      open: open.length,
      approved: won.length,
      totalQuoted,
      totalWon,
      margin: netSum > 0 ? (profitSum / netSum) * 100 : 0,
      executing: rows.filter((r) => r.q.status === "execucao").length,
      openValue: open.reduce((s, r) => s + r.t.total, 0),
    };
  }, [rows]);

  const trend: TrendPoint[] = useMemo(() => {
    const buckets = buildBuckets(period);
    return buckets.map((b) => {
      let a = 0;
      let c = 0;
      for (const r of rows) {
        const d = new Date(r.q.createdAt);
        if (d >= b.from && d <= b.to && r.q.status !== "rascunho") {
          a += r.t.total;
          if (WON.includes(r.q.status)) c += r.t.total;
        }
      }
      return { label: b.label, a, b: c };
    });
  }, [rows, period]);

  const sparkPoints = useMemo(() => trend.map((p) => p.a), [trend]);

  const statusSlices = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        label: STATUS_META[s].label,
        value: db.quotes.filter((q) => q.status === s).length,
        color: DONUT_COLOR[s],
      })).filter((s) => s.value > 0),
    [db.quotes]
  );

  const recent = useMemo(
    () => [...rows].sort((x, y) => y.q.updatedAt.localeCompare(x.q.updatedAt)).slice(0, 5),
    [rows]
  );

  const clientName = (id: string) => {
    const c = db.clients.find((x) => x.id === id);
    return c?.company || c?.name || "Cliente removido";
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* saudação */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Olá, {db.company.name.split("—")[0].trim()}</h2>
          <p className="mt-1 text-sm text-mut">
            {kpi.open} orçamentos em aberto no valor de <strong className="font-semibold text-ink">{fmtEUR(kpi.openValue)}</strong> à espera de resposta.
          </p>
        </div>
        <Button onClick={() => nav({ page: "editor" })} className="sm:hidden">
          <Plus className="h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Orçamentos este mês", value: String(kpi.thisMonth), sub: "criados no mês corrente", icon: FileText, spark: true },
          { label: "Em aberto", value: String(kpi.open), sub: "enviados + em negociação", icon: Send },
          { label: "Aprovados", value: String(kpi.approved), sub: "inclui execução e concluídos", icon: Check },
          { label: "Valor ganho", value: fmtEUR(kpi.totalWon, true), sub: "adjudicado à empresa", icon: Wallet },
          { label: "Valor orçamentado", value: fmtEUR(kpi.totalQuoted, true), sub: "todas as propostas ativas", icon: TrendingUp },
          { label: "Margem média", value: `${kpi.margin.toFixed(1).replace(".", ",")}%`, sub: "lucro / venda sem IVA", icon: Percent },
          { label: "Obras em execução", value: String(kpi.executing), sub: "empreitadas no terreno", icon: HardHat },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <Card key={i} className={cn("anim-rise group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-volt/50")} >
              <div className="flex items-start justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt/14 text-volt">
                  <Icon className="h-4 w-4" />
                </span>
                {"spark" in k && k.spark && (
                  <div className="w-16 opacity-70">
                    <Spark points={sparkPoints} />
                  </div>
                )}
              </div>
              <p className="mt-3 font-display text-[22px] font-bold leading-none text-ink tnum">{k.value}</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-mut">{k.label}</p>
              <p className="text-[11px] text-faint">{k.sub}</p>
            </Card>
          );
        })}
        <button
          onClick={() => nav({ page: "editor" })}
          className="anim-rise group flex min-h-32 flex-col justify-between rounded-xl bg-volt p-4 text-left shadow-lg shadow-volt/25 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[.98]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-voltink/10 text-voltink">
            <Plus className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="block font-display text-[15px] font-bold leading-tight text-voltink">Novo Orçamento</span>
            <span className="text-[11px] font-medium text-voltink/70">do primeiro ponto ao orçamento final</span>
          </span>
        </button>
      </div>

      {/* gráficos */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="anim-rise p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[15px] font-bold text-ink">Evolução dos orçamentos</h3>
              <p className="text-xs text-mut">Valor proposto vs. valor adjudicado</p>
            </div>
            <Segmented<Period>
              value={period}
              onChange={setPeriod}
              options={[
                { value: "semana", label: "Semana" },
                { value: "mes", label: "Mês" },
                { value: "trimestre", label: "Trimestre" },
                { value: "ano", label: "Ano" },
              ]}
            />
          </div>
          <TrendChart data={trend} />
        </Card>

        <Card className="anim-rise p-5">
          <h3 className="font-display text-[15px] font-bold text-ink">Estado dos orçamentos</h3>
          <p className="mb-4 text-xs text-mut">Distribuição por estado atual</p>
          {statusSlices.length === 0 ? (
            <p className="py-10 text-center text-xs text-faint">Ainda sem orçamentos.</p>
          ) : (
            <Donut slices={statusSlices} centerValue={String(db.quotes.length)} centerLabel="orçamentos" />
          )}
        </Card>
      </div>

      {/* recentes */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="anim-rise lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-[15px] font-bold text-ink">Orçamentos recentes</h3>
            <Button variant="ghost" size="sm" onClick={() => nav({ page: "quotes" })}>
              Ver todos
            </Button>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-faint">Sem orçamentos — crie o primeiro com “Novo Orçamento”.</p>
          ) : (
            <ul>
              {recent.map(({ q, t }, i) => (
                <li key={q.id}>
                  <button
                    onClick={() => nav({ page: "editor", id: q.id })}
                    className={cn(
                      "flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-raise",
                      i > 0 && "border-t border-line"
                    )}
                  >
                    <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raise font-mono text-[11px] font-bold text-mut sm:flex">
                      V{q.version}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-ink">{q.number}</span>
                        <StatusBadge status={q.status} withDot={false} />
                      </span>
                      <span className="block truncate text-xs text-mut">
                        {clientName(q.clientId)} · {q.workName || "sem nome de obra"}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm font-bold text-ink tnum">{fmtEUR(t.total)}</span>
                      <span className="text-[11px] text-faint">{fmtDate(q.updatedAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="anim-rise p-5">
          <h3 className="font-display text-[15px] font-bold text-ink">Atalhos</h3>
          <p className="mb-3 text-xs text-mut">Fluxos rápidos do dia a dia</p>
          <div className="space-y-2">
            {[
              { icon: Plus, label: "Novo orçamento", desc: "Cliente, obra e trabalhos", go: () => nav({ page: "editor" }) },
              { icon: LayoutTemplate, label: "Usar um modelo", desc: "Moradia T3, ITED, Wallbox…", go: () => nav({ page: "templates" }) },
              { icon: Users, label: "Novo cliente", desc: "Adicionar à carteira", go: () => nav({ page: "clients" }) },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <button
                  key={i}
                  onClick={a.go}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-raise px-4 py-3 text-left transition-all duration-150 hover:border-volt/60 hover:bg-card active:scale-[.98]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/14 text-volt">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{a.label}</span>
                    <span className="text-xs text-mut">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-line bg-raise/60 p-3.5">
            <p className="text-[11px] leading-relaxed text-mut">
              <strong className="font-semibold text-ink">Dica:</strong> prima <kbd className="rounded border border-line bg-card px-1 font-mono text-[10px]">⌘K</kbd> para pesquisar em
              orçamentos, clientes e artigos a partir de qualquer ecrã.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
