import type { ExtraCost, ItemKind, Quote, QuoteLine } from "./types";

/* ---------- dinheiro em cêntimos (inteiros) para evitar erros de arredondamento ---------- */

export const r2 = (n: number) => Math.round(n + Number.EPSILON);
export const toCents = (eur: number) => r2((eur || 0) * 100);
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const eurFmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eurFmt0 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function fmtEUR(cents: number, compact = false): string {
  if (compact) return eurFmt0.format(cents / 100);
  return eurFmt.format(cents / 100);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(n);
}

export function fmtPct(n: number): string {
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(n)}%`;
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

export function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-PT")} ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
}

export const nowIso = () => new Date().toISOString();
export const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
export const dateOnly = (iso: string) => (iso ? iso.slice(0, 10) : "");

let uidCounter = 0;
export function uid(): string {
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------- cálculo por linha ------------------------------- */

export interface LineCalc {
  qtyEff: number; // quantidade com desperdício
  cost: number; // cents — custo interno
  gross: number; // cents — venda bruta (custo + margem)
  disc: number; // cents — desconto de linha
  net: number; // cents — venda líquida
  unitSale: number; // cents — preço unitário de venda (antes de desconto)
}

export function calcLine(l: QuoteLine): LineCalc {
  const qtyEff = (l.qty || 0) * (1 + (l.wastePct || 0) / 100);
  const cost = r2(qtyEff * (l.unitCost || 0) * 100);
  const gross = r2(cost * (1 + (l.marginPct || 0) / 100));
  const disc = r2(gross * clamp(l.discountPct || 0, 0, 100) / 100);
  const unitSale = qtyEff > 0 ? r2(gross / qtyEff) : gross;
  return { qtyEff, cost, gross, disc, net: gross - disc, unitSale };
}

/* ------------------------------ cálculo do orçamento ------------------------------ */

export interface ExtraCalc {
  e: ExtraCost;
  value: number; // cents
  vat: number; // cents
}

export interface QuoteTotals {
  lines: (LineCalc & { line: QuoteLine })[];
  costByKind: Record<ItemKind, number>;
  netByKind: Record<ItemKind, number>;
  subtotal: number; // cents (soma das linhas líquidas)
  lineDiscounts: number; // cents
  globalDiscount: number; // cents
  afterDiscount: number; // cents
  extras: ExtraCalc[];
  extrasTotal: number; // cents
  totalNet: number; // cents — TOTAL SEM IVA
  vat: number; // cents
  vatByRate: Record<string, number>;
  total: number; // cents — TOTAL COM IVA
  totalCost: number; // cents
  profit: number; // cents
  margin: number; // %
}

const ZERO_KINDS = (): Record<ItemKind, number> => ({
  material: 0,
  mao_obra: 0,
  equipamento: 0,
  servico: 0,
  outro: 0,
});

export function calcQuote(
  q: Pick<Quote, "lines" | "extras" | "globalDiscountPct" | "globalDiscountAbs">,
  defaultIva: number
): QuoteTotals {
  const lines = (q.lines || []).map((line) => ({ line, ...calcLine(line) }));

  const costByKind = ZERO_KINDS();
  const netByKind = ZERO_KINDS();
  let subtotal = 0;
  let grossSum = 0;
  for (const lc of lines) {
    costByKind[lc.line.kind] += lc.cost;
    netByKind[lc.line.kind] += lc.net;
    subtotal += lc.net;
    grossSum += lc.gross;
  }

  const gdPct = r2(subtotal * clamp(q.globalDiscountPct || 0, 0, 100) / 100);
  const gdAbs = toCents(clamp(q.globalDiscountAbs || 0, 0, 1e9));
  const globalDiscount = Math.min(subtotal, gdPct + gdAbs);
  const afterDiscount = subtotal - globalDiscount;
  const factor = subtotal > 0 ? afterDiscount / subtotal : 0;

  const vatByRate: Record<string, number> = {};
  let vat = 0;
  for (const lc of lines) {
    const base = r2(lc.net * factor);
    const v = r2((base * (lc.line.ivaPct || 0)) / 100);
    vat += v;
    const key = String(lc.line.ivaPct || 0);
    vatByRate[key] = (vatByRate[key] || 0) + v;
  }

  const extras: ExtraCalc[] = (q.extras || []).map((e) => {
    const value = e.type === "pct" ? r2((afterDiscount * clamp(e.value, 0, 100)) / 100) : toCents(e.value);
    const rate = e.ivaPct ?? defaultIva;
    return { e, value, vat: r2((value * rate) / 100) };
  });
  for (const ex of extras) {
    const rate = ex.e.ivaPct ?? defaultIva;
    const key = String(rate);
    vatByRate[key] = (vatByRate[key] || 0) + ex.vat;
    vat += ex.vat;
  }

  const extrasTotal = extras.reduce((s, x) => s + x.value, 0);
  const totalNet = afterDiscount + extrasTotal;
  const totalCost = lines.reduce((s, lc) => s + lc.cost, 0) + extrasTotal;
  const profit = totalNet - totalCost;
  const margin = totalNet > 0 ? (profit / totalNet) * 100 : 0;

  return {
    lines,
    costByKind,
    netByKind,
    subtotal,
    lineDiscounts: grossSum - subtotal,
    globalDiscount,
    afterDiscount,
    extras,
    extrasTotal,
    totalNet,
    vat,
    vatByRate,
    total: totalNet + vat,
    totalCost,
    profit,
    margin,
  };
}

/* ------------------------------- validação ligeira ------------------------------- */

export function sanitizeLine(l: QuoteLine): QuoteLine {
  return {
    ...l,
    qty: clamp(Number(l.qty) || 0, 0, 1e9),
    wastePct: clamp(Number(l.wastePct) || 0, 0, 100),
    unitCost: clamp(Number(l.unitCost) || 0, 0, 1e9),
    marginPct: clamp(Number(l.marginPct) || 0, 0, 900),
    discountPct: clamp(Number(l.discountPct) || 0, 0, 100),
    ivaPct: clamp(Number(l.ivaPct) || 0, 0, 100),
  };
}

export function validNif(nif: string): boolean {
  const s = (nif || "").replace(/\s/g, "");
  return s === "" || /^\d{9}$/.test(s);
}

/* --------------------------------- utilitários --------------------------------- */

export function downloadFile(name: string, content: string | Blob, mime = "application/octet-stream") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(";")).join("\r\n");
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
