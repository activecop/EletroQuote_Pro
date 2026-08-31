import { useMemo, useState } from "react";
import { ArrowLeft, Copy, FileDown, Pencil, Share2, Zap } from "lucide-react";
import { useStore } from "../store";
import { calcQuote, fmtDate, fmtEUR, fmtNum } from "../calc";
import type { ItemKind } from "../types";
import { KIND_LABEL } from "../types";
import { buildPdf, summaryText } from "../pdf";
import { Button, Modal, StatusBadge } from "../components/ui";
import { EmptyState } from "../components/ui";
import { FileText } from "lucide-react";

const KIND_ORDER: ItemKind[] = ["material", "mao_obra", "equipamento", "servico", "outro"];

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function PreviewPage() {
  const { db, route, nav, toast } = useStore();
  const [shareOpen, setShareOpen] = useState(false);

  const quote = db.quotes.find((q) => q.id === route.id);
  const client = useMemo(() => db.clients.find((c) => c.id === quote?.clientId), [db.clients, quote]);
  const totals = useMemo(() => (quote ? calcQuote(quote, db.company.defaultIva) : null), [quote, db.company.defaultIva]);

  if (!quote || !totals) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="Orçamento não encontrado"
        desc="O orçamento pode ter sido eliminado."
        action={<Button onClick={() => nav({ page: "quotes" })}>Voltar aos orçamentos</Button>}
      />
    );
  }

  const company = db.company;

  const onPdf = () => {
    buildPdf(quote, client, company, totals).save(`${quote.number}_V${quote.version}.pdf`);
    toast("PDF exportado com sucesso");
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(quote, client, company, totals));
      toast("Resumo copiado para a área de transferência");
    } catch {
      toast("Não foi possível copiar automaticamente", "bad");
    }
  };

  const shareFile = async () => {
    try {
      const blob = buildPdf(quote, client, company, totals).output("blob");
      const file = new File([blob], `${quote.number}_V${quote.version}.pdf`, { type: "application/pdf" });
      const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (n.canShare && n.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Orçamento ${quote.number}`, text: summaryText(quote, client, company, totals) });
        setShareOpen(false);
      } else toast("Partilha de ficheiros não suportada neste dispositivo", "info");
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast("Partilha indisponível", "info");
    }
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ page: "editor", id: quote.id })}>
          <ArrowLeft className="h-4 w-4" /> Editor
        </Button>
        <span className="font-mono text-sm font-bold text-ink">{quote.number}</span>
        <span className="rounded bg-raise px-1.5 py-0.5 font-mono text-[11px] font-bold text-mut">V{quote.version}</span>
        <StatusBadge status={quote.status} />
        <div className="flex-1" />
        <Button variant="soft" size="sm" onClick={() => nav({ page: "editor", id: quote.id })}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button variant="soft" size="sm" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" /> Copiar resumo
        </Button>
        <Button variant="soft" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-3.5 w-3.5" /> Partilhar
        </Button>
        <Button size="sm" onClick={onPdf}>
          <FileDown className="h-3.5 w-3.5" /> Exportar PDF
        </Button>
      </div>

      {/* documento */}
      <div className="anim-rise mx-auto max-w-[860px]">
        <div className="doc-shadow rounded-lg bg-white p-8 text-[#131a27] sm:p-12">
          {/* cabeçalho */}
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {company.logo ? (
                <img src={company.logo} alt="Logótipo da empresa" className="h-14 w-14 rounded-xl object-contain" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#ffc61a]">
                  <Zap className="h-8 w-8 text-[#0b1120]" fill="currentColor" strokeWidth={1} />
                </span>
              )}
              <div>
                <p className="font-display text-lg font-bold leading-tight">{company.name}</p>
                <p className="mt-1 text-xs text-[#697385]">
                  NIF {company.nif} · {company.address}, {company.postal} {company.locality}
                </p>
                <p className="text-xs text-[#697385]">
                  {company.phone} · {company.email}
                </p>
                <p className="text-xs text-[#697385]">{company.website}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold tracking-tight">ORÇAMENTO</p>
              <p className="font-mono text-sm font-bold">
                {quote.number} · V{quote.version}
              </p>
              <p className="mt-1 text-xs text-[#697385]">Data: {fmtDate(quote.updatedAt || quote.createdAt)}</p>
              <p className="text-xs text-[#697385]">Validade: {fmtDate(addDays(quote.createdAt, quote.validityDays))}</p>
            </div>
          </div>

          <div className="my-6 h-1 rounded-full bg-[#ffc61a]" />

          {/* cliente / obra */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-[#f7f8fa] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9aa3b2]">Cliente</p>
              <p className="mt-1.5 font-display text-sm font-bold">{client ? client.company || client.name : "—"}</p>
              {client?.company && <p className="text-xs text-[#697385]">{client.name}</p>}
              {client?.nif && <p className="text-xs text-[#697385]">NIF {client.nif}</p>}
              {client && (client.address || client.locality) && (
                <p className="text-xs text-[#697385]">
                  {client.address}, {client.postal} {client.locality}
                </p>
              )}
              {client && (client.phone || client.email) && (
                <p className="text-xs text-[#697385]">
                  {[client.phone, client.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-[#f7f8fa] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9aa3b2]">Dados da obra</p>
              <p className="mt-1.5 font-display text-sm font-bold">{quote.workName || "—"}</p>
              <p className="text-xs text-[#697385]">
                {quote.workType}
                {quote.workLocality && ` · ${quote.workLocality}`}
              </p>
              {quote.workAddress && (
                <p className="text-xs text-[#697385]">
                  {quote.workAddress}, {quote.workPostal} {quote.workLocality}
                </p>
              )}
              {(quote.startDate || quote.endDate) && (
                <p className="text-xs text-[#697385]">
                  Início {fmtDate(quote.startDate)} · Conclusão {fmtDate(quote.endDate)}
                </p>
              )}
              {quote.manager && <p className="text-xs text-[#697385]">Responsável: {quote.manager}</p>}
            </div>
          </div>

          {/* tabela */}
          <table className="mt-6 w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#0b1120] text-left text-[11px] font-bold uppercase tracking-wide text-white">
                <th className="rounded-l-md px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5 text-right">Qtd.</th>
                <th className="px-3 py-2.5">Un.</th>
                <th className="px-3 py-2.5 text-right">Preço unit.</th>
                <th className="px-3 py-2.5 text-right">Desc.</th>
                <th className="px-3 py-2.5 text-right">IVA</th>
                <th className="rounded-r-md px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let i = 0;
                return KIND_ORDER.map((kind) => {
                  const rows = totals.lines.filter((l) => l.line.kind === kind);
                  if (rows.length === 0) return null;
                  return [
                    <tr key={kind} className="bg-[#f0f2f6]">
                      <td colSpan={8} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#131a27]">
                        {KIND_LABEL[kind]}
                      </td>
                    </tr>,
                    ...rows.map((l) => {
                      i += 1;
                      return (
                        <tr key={l.line.id} className="border-b border-[#e8ebf0] align-top">
                          <td className="px-3 py-2 text-[#9aa3b2]">{i}</td>
                          <td className="px-3 py-2 font-medium">{l.line.description || l.line.subcategory}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {fmtNum(l.qtyEff)}
                            {l.line.wastePct > 0 && <span className="block text-[10px] text-[#9aa3b2]">incl. {fmtNum(l.line.wastePct)}% desp.</span>}
                          </td>
                          <td className="px-3 py-2">{l.line.unit}</td>
                          <td className="px-3 py-2 text-right font-mono">{fmtEUR(l.unitSale)}</td>
                          <td className="px-3 py-2 text-right font-mono text-[#9aa3b2]">{l.line.discountPct > 0 ? `${fmtNum(l.line.discountPct)}%` : "—"}</td>
                          <td className="px-3 py-2 text-right font-mono text-[#9aa3b2]">{fmtNum(l.line.ivaPct)}%</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{fmtEUR(l.net)}</td>
                        </tr>
                      );
                    }),
                  ];
                });
              })()}
            </tbody>
          </table>

          {/* totais */}
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-[13px]">
              <div className="flex justify-between text-[#697385]">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-[#131a27]">{fmtEUR(totals.subtotal)}</span>
              </div>
              {(totals.lineDiscounts > 0 || totals.globalDiscount > 0) && (
                <div className="flex justify-between text-[#e5484d]">
                  <span>Descontos</span>
                  <span className="font-mono font-semibold">− {fmtEUR(totals.lineDiscounts + totals.globalDiscount)}</span>
                </div>
              )}
              {totals.extras.map((ex) => (
                <div key={ex.e.id} className="flex justify-between text-[#697385]">
                  <span>{ex.e.label}</span>
                  <span className="font-mono font-semibold text-[#131a27]">{fmtEUR(ex.value)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#e8ebf0] pt-1.5 font-bold">
                <span>Total sem IVA</span>
                <span className="font-mono">{fmtEUR(totals.totalNet)}</span>
              </div>
              {Object.entries(totals.vatByRate)
                .filter(([, v]) => v > 0)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([r, v]) => (
                  <div key={r} className="flex justify-between text-[#697385]">
                    <span>IVA {r.replace(".", ",")}%</span>
                    <span className="font-mono font-semibold text-[#131a27]">{fmtEUR(v)}</span>
                  </div>
                ))}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[#ffc61a] px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#221a00]/70">Total com IVA</span>
                <span className="font-display text-xl font-bold text-[#221a00]">{fmtEUR(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* condições */}
          <div className="mt-8 space-y-3 text-xs text-[#697385]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#131a27]">Condições comerciais</p>
            {(quote.conditions || company.paymentTerms) && (
              <p>
                <span className="font-bold text-[#131a27]">Forma de pagamento: </span>
                {quote.conditions || company.paymentTerms}
              </p>
            )}
            <p>
              <span className="font-bold text-[#131a27]">Validade da proposta: </span>
              {quote.validityDays} dias após a data de emissão.
            </p>
            {(quote.startDate || quote.endDate) && (
              <p>
                <span className="font-bold text-[#131a27]">Prazo estimado: </span>
                início {fmtDate(quote.startDate)} — conclusão {fmtDate(quote.endDate)}.
              </p>
            )}
            {company.iban && (
              <p>
                <span className="font-bold text-[#131a27]">IBAN: </span>
                {company.iban}
              </p>
            )}
            {quote.notes && (
              <p>
                <span className="font-bold text-[#131a27]">Observações: </span>
                {quote.notes}
              </p>
            )}
          </div>

          {/* assinaturas */}
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <div className="h-10 border-b border-[#c9cfd9]" />
              <p className="mt-1.5 text-[11px] text-[#9aa3b2]">Aceitação da proposta (assinatura e data)</p>
            </div>
            <div>
              <div className="h-10 border-b border-[#c9cfd9]" />
              <p className="mt-1.5 text-[11px] text-[#9aa3b2]">O adjudicante — assinatura e carimbo</p>
            </div>
          </div>

          <p className="mt-8 border-t border-[#e8ebf0] pt-3 text-center text-[10px] text-[#9aa3b2]">
            {company.name} · NIF {company.nif} · Documento gerado com ELETROQUOTE PRO
          </p>
        </div>
      </div>

      {/* partilhar */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Partilhar proposta" subtitle={`${quote.number} · V${quote.version}`} width="max-w-md">
        <div className="space-y-2">
          {"share" in navigator && (
            <button onClick={shareFile} className="flex w-full items-center gap-3 rounded-xl border border-line bg-raise px-4 py-3 text-left transition-colors hover:border-volt/60 hover:bg-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/14 text-volt">
                <Share2 className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Partilhar PDF…</span>
                <span className="text-xs text-mut">Partilha nativa do dispositivo</span>
              </span>
            </button>
          )}
          <button onClick={() => { onPdf(); setShareOpen(false); }} className="flex w-full items-center gap-3 rounded-xl border border-line bg-raise px-4 py-3 text-left transition-colors hover:border-volt/60 hover:bg-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/14 text-volt">
              <FileDown className="h-4.5 w-4.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Transferir PDF</span>
              <span className="text-xs text-mut">Documento A4 profissional</span>
            </span>
          </button>
          <button
            onClick={() => {
              const text = summaryText(quote, client, company, totals);
              window.location.href = `mailto:${client?.email ?? ""}?subject=${encodeURIComponent(`Orçamento ${quote.number} — ${quote.workName}`)}&body=${encodeURIComponent(text)}`;
              setShareOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-raise px-4 py-3 text-left transition-colors hover:border-volt/60 hover:bg-card"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/14 font-mono text-sm font-bold text-volt">@</span>
            <span>
              <span className="block text-sm font-semibold text-ink">Enviar por email</span>
              <span className="text-xs text-mut">Abre o cliente de email com o resumo</span>
            </span>
          </button>
          <button
            onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(summaryText(quote, client, company, totals))}`, "_blank", "noopener");
              setShareOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-raise px-4 py-3 text-left transition-colors hover:border-volt/60 hover:bg-card"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/14 font-mono text-sm font-bold text-volt">W</span>
            <span>
              <span className="block text-sm font-semibold text-ink">WhatsApp</span>
              <span className="text-xs text-mut">Abre a partilha via WhatsApp</span>
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
