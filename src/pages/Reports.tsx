import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useStore } from "../store";
import { calcQuote, downloadFile, fmtDate, fmtEUR, toCsv } from "../calc";
import type { QuoteStatus } from "../types";
import { STATUS_META } from "../types";
import { Donut, HBarList, TrendChart } from "../components/charts";
import type { TrendPoint } from "../components/charts";
import { Button, Card, Segmented, cn } from "../components/ui";

type Period = "semana" | "mes" | "trimestre" | "ano" | "custom";

const WON: QuoteStatus[] = ["aprovado", "execucao", "concluido"];

function rangeFor(period: Period, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  switch (period) {
    case "semana":
      from.setDate(from.getDate() - 6);
      break;
    case "mes":
      from.setDate(from.getDate() - 29);
      break;
    case "trimestre":
      from.setDate(from.getDate() - 89);
      break;
    case "ano":
      from.setFullYear(from.getFullYear() - 1);
      from.setDate(from.getDate() + 1);
      break;
    case "custom": {
      const f = customFrom ? new Date(customFrom) : new Date(0);
      const t = customTo ? new Date(customTo) : new Date();
      f.setHours(0, 0, 0, 0);
      t.setHours(23, 59, 59, 999);
      return { from: f, to: t };
    }
  }
  return { from, to };
}

function bucketsFor(period: Period, from: Date, to: Date): { from: Date; to: Date; label: string }[] {
  const out: { from: Date; to: Date; label: string }[] = [];
  if (period === "semana") {
    for (let i = 6; i >= 0; i--) {
      const f = new Date(to);
      f.setHours(0, 0, 0, 0);
      f.setDate(f.getDate() - i);
      const t = new Date(f);
      t.setHours(23, 59, 59, 999);
      out.push({ from: f, to: t, label: f.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "") });
    }
    return out;
  }
  if (period === "ano") {
    const end = new Date(to);
    for (let i = 11; i >= 0; i--) {
      const f = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const t = new Date(end.getFullYear(), end.getMonth() - i + 1, 0, 23, 59, 59);
      out.push({ from: f, to: t, label: f.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "") });
    }
    return out;
  }
  const days = Math.max(2, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const n = period === "mes" ? 4 : 6;
  const size = Math.ceil(days / n);
  for (let i = 0; i < n; i++) {
    const f = new Date(from);
    f.setDate(f.getDate() + i * size);
    const t = new Date(f);
    t.setDate(t.getDate() + size - 1);
    t.setHours(23, 59, 59, 999);
    if (f > to) break;
    out.push({ from: f, to: t, label: f.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).replace(".", "") });
  }
  return out;
}

export default function Reports() {
  const { db, toast } = useStore();
  const [period, setPeriod] = useState<Period>("trimestre");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const defIva = db.company.defaultIva;

  const { from, to } = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo]);

  const rows = useMemo(() => {
    return db.quotes
      .filter((q) => {
        const d = new Date(q.createdAt);
        return d >= from && d <= to;
      })
      .map((q) => ({ q, t: calcQuote(q, defIva) }));
  }, [db.quotes, from, to, defIva]);

  const kpi = useMemo(() => {
    const nonDraft = rows.filter((r) => r.q.status !== "rascunho");
    const quoted = nonDraft.reduce((s, r) => s + r.t.total, 0);
    const won = rows.filter((r) => WON.includes(r.q.status));
    const wonValue = won.reduce((s, r) => s + r.t.total, 0);
    const refusedValue = rows.filter((r) => r.q.status === "recusado").reduce((s, r) => s + r.t.total, 0);
    const profit = nonDraft.reduce((s, r) => s + r.t.profit, 0);
    const costs = nonDraft.reduce((s, r) => s + r.t.totalCost, 0);
    const netSum = nonDraft.reduce((s, r) => s + r.t.totalNet, 0);
    const decided = rows.filter((r) => WON.includes(r.q.status) || r.q.status === "recusado").length;
    return {
      quoted,
      wonValue,
      refusedValue,
      profit,
      costs,
      margin: netSum > 0 ? (profit / netSum) * 100 : 0,
      proposals: nonDraft.length,
      approvalRate: decided > 0 ? (won.length / decided) * 100 : 0,
      wonCount: won.length,
      decided,
    };
  }, [rows]);

  const trend: TrendPoint[] = useMemo(() => {
    return bucketsFor(period, from, to).map((b) => {
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
  }, [rows, period, from, to]);

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (!WON.includes(r.q.status)) continue;
      map.set(r.q.clientId, (map.get(r.q.clientId) ?? 0) + r.t.total);
    }
    return [...map.entries()]
      .map(([id, value]) => {
        const c = db.clients.find((x) => x.id === id);
        return { label: c?.company || c?.name || "Cliente removido", value, display: fmtEUR(value) };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rows, db.clients]);

  const exportCsv = () => {
    const header = ["Número", "Versão", "Estado", "Data", "Cliente", "Obra", "Tipo", "Subtotal", "Desconto", "IVA", "Total"];
    const body = rows.map(({ q, t }) => {
      const c = db.clients.find((x) => x.id === q.clientId);
      return [
        q.number,
        `V${q.version}`,
        STATUS_META[q.status].label,
        fmtDate(q.createdAt),
        c?.company || c?.name || "",
        q.workName,
        q.workType,
        (t.subtotal / 100).toFixed(2),
        ((t.lineDiscounts + t.globalDiscount) / 100).toFixed(2),
        (t.vat / 100).toFixed(2),
        (t.total / 100).toFixed(2),
      ];
    });
    const copyright = ["© 2026 Luís Garcês — Todos os Direitos Reservados · Electro-Cotação Pro"];
    downloadFile(`relatorio-orcamentos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...body, [], copyright]), "text/csv");
    toast("Relatório CSV exportado");
  };

  const kpis = [
    { label: "Valor orçamentado", value: fmtEUR(kpi.quoted, true) },
    { label: "Faturação estimada", value: fmtEUR(kpi.wonValue, true), tone: "text-ok" },
    { label: "Valor recusado", value: fmtEUR(kpi.refusedValue, true), tone: "text-bad" },
    { label: "Custos internos", value: fmtEUR(kpi.costs, true) },
    { label: "Lucro estimado", value: fmtEUR(kpi.profit, true), tone: kpi.profit >= 0 ? "text-ok" : "text-bad" },
    { label: "Margem média", value: `${kpi.margin.toFixed(1).replace(".", ",")}%` },
    { label: "Propostas", value: String(kpi.proposals) },
    { label: "Taxa de aprovação", value: `${kpi.approvalRate.toFixed(0)}%`, tone: kpi.approvalRate >= 50 ? "text-ok" : "text-warn" },
  ];

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Relatórios</h2>
          <p className="text-sm text-mut">
            {fmtDate(from.toISOString())} — {fmtDate(to.toISOString())}
          </p>
        </div>
        <Button variant="soft" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="anim-rise flex flex-wrap items-center gap-2">
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mês" },
            { value: "trimestre", label: "Trimestre" },
            { value: "ano", label: "Ano" },
            { value: "custom", label: "Personalizado" },
          ]}
        />
        {period === "custom" && (
          <div className="anim-fade flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-volt focus:outline-none" aria-label="Data de início" />
            <span className="text-xs text-faint">até</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-volt focus:outline-none" aria-label="Data de fim" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={i} className="anim-rise p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">{k.label}</p>
            <p className={cn("mt-2 font-display text-xl font-bold text-ink tnum", k.tone)}>{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="anim-rise p-5 lg:col-span-2">
          <h3 className="font-display text-[15px] font-bold text-ink">Volume de propostas</h3>
          <p className="mb-4 text-xs text-mut">Orçamentado vs. adjudicado no período</p>
          <TrendChart data={trend} aLabel="Orçamentado" bLabel="Adjudicado" />
        </Card>
        <Card className="anim-rise p-5">
          <h3 className="font-display text-[15px] font-bold text-ink">Desfecho das propostas</h3>
          <p className="mb-4 text-xs text-mut">Aprovadas vs. recusadas vs. pendentes</p>
          <Donut
            slices={[
              { label: "Aprovadas", value: kpi.wonCount, color: "var(--ok)" },
              { label: "Recusadas", value: rows.filter((r) => r.q.status === "recusado").length, color: "var(--bad)" },
              { label: "Pendentes", value: Math.max(0, kpi.proposals - kpi.wonCount - rows.filter((r) => r.q.status === "recusado").length), color: "var(--faint)" },
            ]}
            centerValue={`${kpi.approvalRate.toFixed(0)}%`}
            centerLabel="aprovação"
          />
        </Card>
      </div>

      <Card className="anim-rise p-5">
        <h3 className="font-display text-[15px] font-bold text-ink">Melhores clientes do período</h3>
        <p className="mb-4 text-xs text-mut">Valor adjudicado por cliente</p>
        {topClients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-faint">Sem adjudicações neste período.</p>
        ) : (
          <div className="max-w-2xl">
            <HBarList rows={topClients} />
          </div>
        )}
      </Card>
    </div>
  );
}
