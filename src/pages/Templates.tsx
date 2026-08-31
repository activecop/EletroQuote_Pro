import { useMemo, useState } from "react";
import { ArrowRight, LayoutTemplate, Plus, Save, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { calcQuote, fmtDate, fmtEUR, nowIso, uid } from "../calc";
import type { Template } from "../types";
import { Button, Badge, Card, Confirm, EmptyState, Input, Modal, Select, Textarea } from "../components/ui";

export default function Templates() {
  const { db, nav, deleteTemplate, saveTemplate, toast } = useStore();
  const [fromQuoteOpen, setFromQuoteOpen] = useState(false);
  const [quoteId, setQuoteId] = useState("");
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [toDelete, setToDelete] = useState<Template | null>(null);

  const defIva = db.company.defaultIva;

  const withTotals = useMemo(
    () =>
      db.templates.map((t) => ({
        t,
        total: calcQuote({ lines: t.lines, extras: t.extras, globalDiscountPct: 0, globalDiscountAbs: 0 }, defIva).totalNet,
      })),
    [db.templates, defIva]
  );

  const submitFromQuote = () => {
    const q = db.quotes.find((x) => x.id === quoteId);
    if (!q) {
      toast("Selecione um orçamento de origem", "bad");
      return;
    }
    saveTemplate({
      id: uid(),
      name: tplName.trim() || q.workName || "Novo modelo",
      description: tplDesc.trim(),
      workType: q.workType,
      lines: q.lines.map((l) => ({ ...l, id: uid() })),
      extras: q.extras.map((e) => ({ ...e, id: uid() })),
      createdAt: nowIso(),
    });
    setFromQuoteOpen(false);
    setQuoteId("");
    setTplName("");
    setTplDesc("");
    toast("Modelo criado a partir do orçamento");
  };

  return (
    <div className="space-y-4">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Modelos de Orçamento</h2>
          <p className="text-sm text-mut">Empreitadas prontas a reutilizar — ajuste quantidades e gere a proposta</p>
        </div>
        <Button onClick={() => setFromQuoteOpen(true)}>
          <Save className="h-4 w-4" /> Guardar orçamento como modelo
        </Button>
      </div>

      <div className="anim-rise flex items-start gap-3 rounded-xl border border-volt/30 bg-volt/8 px-4 py-3">
        <LayoutTemplate className="mt-0.5 h-4.5 w-4.5 shrink-0 text-volt" />
        <p className="text-xs leading-relaxed text-mut">
          <strong className="font-semibold text-ink">Fluxo recomendado:</strong> escolha um modelo → preencha o cliente e a obra → ajuste quantidades e margens → o
          orçamento recebe numeração automática e fica pronto para PDF.
        </p>
      </div>

      {withTotals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LayoutTemplate className="h-6 w-6" />}
            title="Ainda sem modelos"
            desc="Guarde um orçamento como modelo para o reutilizar em obras semelhantes."
            action={
              <Button variant="soft" onClick={() => setFromQuoteOpen(true)}>
                <Plus className="h-4 w-4" /> Criar a partir de orçamento
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {withTotals.map(({ t, total }) => (
            <Card key={t.id} className="anim-rise flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-volt/50">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt/14 text-volt">
                  <LayoutTemplate className="h-5 w-5" />
                </span>
                <Badge className="bg-raise text-mut">{t.workType}</Badge>
              </div>
              <h3 className="mt-3 font-display text-[15px] font-bold leading-snug text-ink">{t.name}</h3>
              {t.description && <p className="mt-1 text-xs leading-relaxed text-mut">{t.description}</p>}
              <div className="mt-3 flex items-center gap-4 text-[11px] text-faint">
                <span>
                  <strong className="font-mono text-ink">{t.lines.length}</strong> linhas
                </span>
                <span>
                  <strong className="font-mono text-ink">{t.extras.length}</strong> despesas
                </span>
                <span>criado {fmtDate(t.createdAt)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Estimativa s/ IVA</p>
                  <p className="font-mono text-lg font-bold text-ink tnum">{fmtEUR(total)}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="hover:text-bad" onClick={() => setToDelete(t)} aria-label={`Eliminar modelo ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => nav({ page: "editor", templateId: t.id })}>
                    Usar modelo <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={fromQuoteOpen}
        onClose={() => setFromQuoteOpen(false)}
        title="Criar modelo a partir de orçamento"
        subtitle="As linhas, despesas e margens são copiadas para o novo modelo"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFromQuoteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitFromQuote}>Criar modelo</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="Orçamento de origem" value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
            <option value="">— Selecionar —</option>
            {db.quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.number} · {q.workName || "sem nome"}
              </option>
            ))}
          </Select>
          <Input label="Nome do modelo" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Ex.: Moradia T4 — standard" />
          <Textarea label="Descrição" value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} />
        </div>
      </Modal>

      <Confirm
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteTemplate(toDelete.id);
            toast("Modelo eliminado", "info");
          }
        }}
        title="Eliminar modelo"
        message={`O modelo “${toDelete?.name}” será removido. Os orçamentos criados a partir dele não são afetados.`}
      />
    </div>
  );
}
