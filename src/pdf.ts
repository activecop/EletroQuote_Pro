import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";
import type { Client, Company, ItemKind, Quote } from "./types";
import { KIND_LABEL } from "./types";
import type { QuoteTotals } from "./calc";
import { fmtDate, fmtEUR, fmtNum } from "./calc";

const VOLT: [number, number, number] = [255, 198, 26];
const NAVY: [number, number, number] = [11, 17, 32];
const INKC: [number, number, number] = [19, 26, 39];
const MUT: [number, number, number] = [105, 115, 133];
const LINE: [number, number, number] = [226, 230, 236];
const SOFT: [number, number, number] = [247, 248, 250];

const KIND_ORDER: ItemKind[] = ["material", "mao_obra", "equipamento", "servico", "outro"];

function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

function drawBoltLogo(doc: jsPDF, x: number, y: number, s: number) {
  doc.setFillColor(...VOLT);
  doc.roundedRect(x, y, s, s, s * 0.22, s * 0.22, "F");
  doc.setFillColor(...NAVY);
  const k = s / 20;
  // raio (relâmpago) em coordenadas relativas
  doc.lines(
    [
      [-8.5 * k, 10 * k],
      [4.5 * k, 0],
      [-2.5 * k, 6.5 * k],
      [8.5 * k, -10 * k],
      [-4.7 * k, 0],
    ],
    x + 12.5 * k,
    y + 3.5 * k,
    [1, 1],
    "F",
    true
  );
}

export function buildPdf(quote: Quote, client: Client | undefined, company: Company, t: QuoteTotals): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: `Orçamento ${quote.number || "novo"}`, author: company.name });

  const W = 210;
  const M = 14;
  const TP = "{total_pages_count_string}";

  /* ------------------------------- cabeçalho ------------------------------- */
  let logoDone = false;
  if (company.logo) {
    try {
      const fmt = company.logo.startsWith("data:image/png") ? "PNG" : company.logo.startsWith("data:image/jpeg") ? "JPEG" : "";
      if (fmt) {
        doc.addImage(company.logo, fmt, M, 11, 21, 21);
        logoDone = true;
      }
    } catch {
      logoDone = false;
    }
  }
  if (!logoDone) drawBoltLogo(doc, M, 11, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INKC);
  doc.text(company.name, M + 26, 16.5, { maxWidth: 92 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUT);
  doc.text(`NIF ${company.nif}  ·  ${company.address}, ${company.postal} ${company.locality}`, M + 26, 21);
  doc.text(`${company.phone}  ·  ${company.email}`, M + 26, 24.7);
  doc.text(company.website, M + 26, 28.4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INKC);
  doc.text("ORÇAMENTO", W - M, 17, { align: "right" });
  doc.setFontSize(11);
  doc.text(`${quote.number || "—"}  ·  V${quote.version}`, W - M, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUT);
  doc.text(`Data: ${fmtDate(quote.updatedAt || quote.createdAt)}`, W - M, 29, { align: "right" });
  doc.text(`Validade: ${fmtDate(addDays(quote.createdAt, quote.validityDays).toISOString())} (${quote.validityDays} dias)`, W - M, 33, {
    align: "right",
  });

  doc.setDrawColor(...VOLT);
  doc.setLineWidth(0.9);
  doc.line(M, 39, W - M, 39);

  /* --------------------------- cliente / obra --------------------------- */
  const boxW = (W - 2 * M - 6) / 2;
  const boxY = 44;
  const boxH = 32;

  doc.setFillColor(...SOFT);
  doc.roundedRect(M, boxY, boxW, boxH, 1.5, 1.5, "F");
  doc.roundedRect(M + boxW + 6, boxY, boxW, boxH, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...MUT);
  doc.text("CLIENTE", M + 4, boxY + 5.5);
  doc.text("DADOS DA OBRA", M + boxW + 10, boxY + 5.5);

  doc.setFontSize(9.5);
  doc.setTextColor(...INKC);
  doc.text(client ? client.company || client.name : "—", M + 4, boxY + 11, { maxWidth: boxW - 8 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUT);
  if (client) {
    if (client.company) doc.text(client.name, M + 4, boxY + 15.5, { maxWidth: boxW - 8 });
    doc.text(client.nif ? `NIF ${client.nif}` : "", M + 4, boxY + 20);
    doc.text(`${client.address}${client.address ? ", " : ""}${client.postal} ${client.locality}` || "—", M + 4, boxY + 24.5, {
      maxWidth: boxW - 8,
    });
    doc.text([client.phone, client.email].filter(Boolean).join("  ·  "), M + 4, boxY + 29, { maxWidth: boxW - 8 });
  }

  const ox = M + boxW + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INKC);
  doc.text(quote.workName || "—", ox, boxY + 11, { maxWidth: boxW - 8 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUT);
  doc.text(`${quote.workType}${quote.workLocality ? " · " + quote.workLocality : ""}`, ox, boxY + 15.5, { maxWidth: boxW - 8 });
  if (quote.workAddress) doc.text(`${quote.workAddress}, ${quote.workPostal} ${quote.workLocality}`, ox, boxY + 20, { maxWidth: boxW - 8 });
  if (quote.startDate || quote.endDate)
    doc.text(`Início previsto: ${fmtDate(quote.startDate)}   ·   Conclusão: ${fmtDate(quote.endDate)}`, ox, boxY + 24.5, {
      maxWidth: boxW - 8,
    });
  if (quote.manager) doc.text(`Responsável: ${quote.manager}`, ox, boxY + 29, { maxWidth: boxW - 8 });

  /* ------------------------------- tabela ------------------------------- */
  const body: RowInput[] = [];
  let idx = 0;
  for (const kind of KIND_ORDER) {
    const rows = t.lines.filter((l) => l.line.kind === kind);
    if (rows.length === 0) continue;
    body.push([
      {
        content: KIND_LABEL[kind].toUpperCase(),
        colSpan: 8,
        styles: { fillColor: [240, 242, 246] as [number, number, number], textColor: INKC, fontStyle: "bold", fontSize: 7.8, cellPadding: 2 },
      },
    ]);
    for (const l of rows) {
      idx += 1;
      body.push([
        String(idx),
        l.line.description || l.line.subcategory || "—",
        `${fmtNum(l.qtyEff)}${l.line.wastePct > 0 ? ` (+${fmtNum(l.line.wastePct)}% desp.)` : ""}`,
        l.line.unit,
        fmtEUR(l.unitSale),
        l.line.discountPct > 0 ? `${fmtNum(l.line.discountPct)}%` : "—",
        `${fmtNum(l.line.ivaPct)}%`,
        fmtEUR(l.net),
      ]);
    }
  }

  const foot: RowInput[] = [];
  const money = (label: string, value: string, strong = false): RowInput => {
    const fs = (strong ? "bold" : "normal") as "bold" | "normal";
    return [
      { content: label, colSpan: 7, styles: { halign: "right" as const, fontStyle: fs } },
      { content: value, styles: { halign: "right" as const, fontStyle: fs } },
    ];
  };
  foot.push(money("Subtotal", fmtEUR(t.subtotal)));
  if (t.lineDiscounts > 0) foot.push(money("Descontos por linha", `− ${fmtEUR(t.lineDiscounts)}`));
  if (t.globalDiscount > 0) foot.push(money("Desconto global", `− ${fmtEUR(t.globalDiscount)}`));
  for (const ex of t.extras) foot.push(money(ex.e.label || "Custo adicional", fmtEUR(ex.value)));
  foot.push(money("TOTAL SEM IVA", fmtEUR(t.totalNet), true));
  for (const [rate, v] of Object.entries(t.vatByRate).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    if (v > 0) foot.push(money(`IVA ${rate.replace(".", ",")}%`, fmtEUR(v)));
  }
  foot.push([
    { content: "TOTAL COM IVA", colSpan: 7, styles: { halign: "right", fontStyle: "bold", fontSize: 10.5, fillColor: VOLT, textColor: NAVY } },
    { content: fmtEUR(t.total), styles: { halign: "right", fontStyle: "bold", fontSize: 10.5, fillColor: VOLT, textColor: NAVY } },
  ]);

  autoTable(doc, {
    startY: 82,
    margin: { left: M, right: M },
    head: [["#", "Descrição", "Qtd.", "Un.", "Preço unit.", "Desc.", "IVA", "Total"]],
    body,
    foot,
    showFoot: "lastPage",
    theme: "plain",
    styles: { fontSize: 8.2, cellPadding: 2.3, textColor: INKC, lineColor: LINE, lineWidth: 0.12, valign: "middle" },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.8, cellPadding: 2.6 },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    footStyles: { fontSize: 8.4, textColor: INKC, fillColor: SOFT, cellPadding: 2.4, lineWidth: 0 },
    columnStyles: {
      0: { cellWidth: 8, textColor: MUT },
      1: { cellWidth: "auto" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 21, halign: "right" },
      5: { cellWidth: 12, halign: "center", textColor: MUT },
      6: { cellWidth: 11, halign: "center", textColor: MUT },
      7: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && Array.isArray(data.row.raw) && data.row.raw.length === 1) {
        data.cell.styles.lineWidth = 0;
      }
    },
  });

  /* ----------------------------- condições ----------------------------- */
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  if (y > 232) {
    doc.addPage();
    y = 20;
  }

  const lineH = 3.6;
  const maxW = W - 2 * M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INKC);
  doc.text("CONDIÇÕES COMERCIAIS", M, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...MUT);

  const block = (label: string, value: string) => {
    if (!value || value === "—") return;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INKC);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUT);
    const wrapped = doc.splitTextToSize(value, maxW - 4);
    doc.text(wrapped, M, y + lineH);
    y += lineH + wrapped.length * lineH + 2;
  };

  block("Forma de pagamento", quote.conditions || company.paymentTerms);
  block(
    "Prazo estimado",
    quote.startDate || quote.endDate ? `Início ${fmtDate(quote.startDate)} — conclusão ${fmtDate(quote.endDate)}` : "A acordar na adjudicação."
  );
  block("Validade da proposta", `${quote.validityDays} dias após a data de emissão.`);
  block("IBAN", company.iban);
  block("Observações", quote.notes);
  if (quote.workNotes) block("Notas da obra", quote.workNotes);

  y += 4;
  if (y > 252) {
    doc.addPage();
    y = 24;
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, y + 12, M + 62, y + 12);
  doc.line(W - M - 62, y + 12, W - M, y + 12);
  doc.setFontSize(7.2);
  doc.setTextColor(...MUT);
  doc.text("Aceitação da proposta (assinatura e data)", M, y + 16);
  doc.text("O adjudicante — assinatura e carimbo", W - M - 62, y + 16);

  /* ------------------------------- rodapé ------------------------------- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, 287, W - M, 287);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUT);
    doc.text(`${company.name}  ·  NIF ${company.nif}  ·  ${company.email}`, M, 291.5);
    doc.text(`${company.website}`, W - M - 30, 291.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`Página ${i} de ${TP}`, W - M, 291.5, { align: "right" });
  }
  doc.putTotalPages(TP);

  return doc;
}

export function summaryText(quote: Quote, client: Client | undefined, company: Company, t: QuoteTotals): string {
  const lines = [
    `${company.name}`,
    `ORÇAMENTO ${quote.number || "(sem número)"} · Versão V${quote.version}`,
    `Cliente: ${client ? client.company || client.name : "—"}`,
    `Obra: ${quote.workName || "—"} (${quote.workType})`,
    `Trabalhos: ${quote.lines.length} linhas`,
    `Subtotal: ${fmtEUR(t.subtotal)}`,
  ];
  if (t.globalDiscount > 0) lines.push(`Desconto global: − ${fmtEUR(t.globalDiscount)}`);
  for (const ex of t.extras) lines.push(`${ex.e.label}: ${fmtEUR(ex.value)}`);
  lines.push(`Total sem IVA: ${fmtEUR(t.totalNet)}`);
  for (const [rate, v] of Object.entries(t.vatByRate).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    if (v > 0) lines.push(`IVA ${rate.replace(".", ",")}%: ${fmtEUR(v)}`);
  }
  lines.push(`TOTAL COM IVA: ${fmtEUR(t.total)}`);
  lines.push(`Validade: ${quote.validityDays} dias`);
  return lines.join("\n");
}
