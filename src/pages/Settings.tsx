import { useRef, useState } from "react";
import { Building2, Download, Moon, RefreshCw, Save, Sun, Trash2, Upload, Zap } from "lucide-react";
import { useStore } from "../store";
import { calcQuote, downloadFile, fmtDate, toCsv } from "../calc";
import { IVA_PRESETS, STATUS_META } from "../types";
import { Button, Card, Confirm, Input, Segmented, Select, Textarea, cn } from "../components/ui";

export default function SettingsPage() {
  const { db, updateCompany, toast, theme, toggleTheme, importDb, resetDemo, wipeAll } = useStore();
  const [form, setForm] = useState({ ...db.company });
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileLogo = useRef<HTMLInputElement>(null);
  const fileImport = useRef<HTMLInputElement>(null);

  const saveCompany = () => {
    updateCompany({ ...form, defaultValidityDays: Math.max(1, Number(form.defaultValidityDays) || 30), defaultIva: Number(form.defaultIva) || 0 });
    toast("Definições da empresa guardadas");
  };

  const onLogo = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
      toast("Use uma imagem PNG, JPEG ou WebP", "bad");
      return;
    }
    if (f.size > 500 * 1024) {
      toast("Imagem demasiado grande — máximo 500 KB", "bad");
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setForm((p) => ({ ...p, logo: String(r.result) }));
      toast("Logótipo carregado — aparecerá nos PDFs");
    };
    r.readAsDataURL(f);
  };

  const exportJson = () => {
    downloadFile(`electroquote-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db, null, 2), "application/json");
    toast("Backup JSON exportado");
  };

  const exportCsv = () => {
    const defIva = db.company.defaultIva;
    const quotes: (string | number)[][] = [
      ["Número", "Versão", "Estado", "Data", "Cliente", "Obra", "Tipo", "Subtotal", "Desconto", "IVA", "Total"],
      ...db.quotes.map((q) => {
        const t = calcQuote(q, defIva);
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
      }),
    ];
    const clients: (string | number)[][] = [
      ["Nome", "Empresa", "NIF", "Morada", "Código Postal", "Localidade", "Telefone", "Email"],
      ...db.clients.map((c) => [c.name, c.company, c.nif, c.address, c.postal, c.locality, c.phone, c.email]),
    ];
    const articles: (string | number)[][] = [
      ["Código", "Descrição", "Tipo", "Categoria", "Subcategoria", "Unidade", "Fabricante", "Referência", "Fornecedor", "Custo", "PVP", "IVA"],
      ...db.articles.map((a) => [a.code, a.description, a.kind, a.category, a.subcategory, a.unit, a.manufacturer, a.reference, a.supplier, a.cost.toFixed(2), a.price.toFixed(2), a.iva]),
    ];
    downloadFile("orcamentos.csv", toCsv(quotes), "text/csv");
    window.setTimeout(() => downloadFile("clientes.csv", toCsv(clients), "text/csv"), 300);
    window.setTimeout(() => downloadFile("artigos.csv", toCsv(articles), "text/csv"), 600);
    toast("3 ficheiros CSV exportados");
  };

  const onImport = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        if (!d || typeof d !== "object" || !Array.isArray(d.quotes)) throw new Error("inválido");
        importDb(d);
      } catch {
        toast("Ficheiro inválido — use um backup JSON do ELETROQUOTE PRO", "bad");
      }
    };
    r.readAsText(f);
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">Definições</h2>
        <p className="text-sm text-mut">Empresa, padrões de orçamentação, tema e dados</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* empresa */}
        <Card className="anim-rise p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <Building2 className="h-4.5 w-4.5 text-volt" /> Perfil da empresa
          </h3>
          <div className="mb-4 flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-raise">
              {form.logo ? (
                <img src={form.logo} alt="Logótipo" className="h-full w-full object-contain" />
              ) : (
                <Zap className="h-7 w-7 text-faint" />
              )}
            </span>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Button variant="soft" size="sm" onClick={() => fileLogo.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Carregar logótipo
                </Button>
                {form.logo && (
                  <Button variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, logo: "" }))}>
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-faint">PNG, JPEG ou WebP até 500 KB. Aparece no cabeçalho dos PDFs.</p>
              <input ref={fileLogo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} aria-label="Carregar logótipo" />
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Nome da empresa" className="sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="NIF" value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
            <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Morada" className="sm:col-span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Código postal" value={form.postal} onChange={(e) => setForm({ ...form, postal: e.target.value })} />
            <Input label="Localidade" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <Input label="IBAN" className="sm:col-span-2" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={saveCompany}>
            <Save className="h-4 w-4" /> Guardar empresa
          </Button>
        </Card>

        <div className="space-y-5">
          {/* padrões */}
          <Card className="anim-rise p-5">
            <h3 className="mb-4 font-display text-[15px] font-bold text-ink">Padrões de orçamentação</h3>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Select label="IVA padrão" value={form.defaultIva} onChange={(e) => setForm({ ...form, defaultIva: Number(e.target.value) })}>
                {[...new Set([...IVA_PRESETS, form.defaultIva])].sort((a, b) => a - b).map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </Select>
              <Input label="Validade padrão (dias)" type="number" min={1} value={form.defaultValidityDays} onChange={(e) => setForm({ ...form, defaultValidityDays: Number(e.target.value) })} />
              <Textarea label="Condições de pagamento padrão" className="sm:col-span-2" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={saveCompany}>
              <Save className="h-4 w-4" /> Guardar padrões
            </Button>
          </Card>

          {/* aspeto */}
          <Card className="anim-rise p-5">
            <h3 className="mb-1 font-display text-[15px] font-bold text-ink">Aspeto</h3>
            <p className="mb-3 text-xs text-mut">A preferência fica guardada neste dispositivo.</p>
            <Segmented<"light" | "dark">
              value={theme}
              onChange={(v) => v !== theme && toggleTheme()}
              options={[
                { value: "light", label: "☀ Modo dia" },
                { value: "dark", label: "☾ Modo noite" },
              ]}
            />
          </Card>

          {/* PWA */}
          <Card className="anim-rise border-volt/30 bg-volt/6 p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Zap className="h-4.5 w-4.5 text-volt" /> Aplicação instalável (PWA)
            </h3>
            <p className="text-xs leading-relaxed text-mut">
              O ELETROQUOTE PRO funciona 100% offline — os dados ficam guardados localmente no seu dispositivo. Num smartphone, use
              “Adicionar ao ecrã principal” no menu do navegador para a instalar como uma aplicação nativa. A arquitetura já está preparada
              para futura sincronização quando houver ligação.
            </p>
          </Card>
        </div>
      </div>

      {/* dados */}
      <Card className="anim-rise p-5">
        <h3 className="mb-1 font-display text-[15px] font-bold text-ink">Backup e dados</h3>
        <p className="mb-4 text-xs text-mut">
          {db.quotes.length} orçamentos · {db.clients.length} clientes · {db.articles.length} artigos · {db.templates.length} modelos — tudo guardado localmente no
          navegador.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={exportJson}>
            <Download className="h-4 w-4" /> Backup JSON
          </Button>
          <Button variant="soft" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="soft" onClick={() => fileImport.current?.click()}>
            <Upload className="h-4 w-4" /> Importar JSON
          </Button>
          <input ref={fileImport} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} aria-label="Importar backup" />
          <span className="mx-1 hidden h-10 w-px bg-line sm:block" />
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <RefreshCw className="h-4 w-4" /> Restaurar demonstração
          </Button>
          <Button variant="danger" onClick={() => setConfirmWipe(true)}>
            <Trash2 className="h-4 w-4" /> Apagar todos os dados
          </Button>
        </div>
      </Card>

      <p className={cn("pb-2 text-center text-[11px] text-faint")}>
        <span className="font-display font-bold text-mut">ELETROQUOTE PRO</span> · v1.0 · “Do primeiro ponto ao orçamento final.”
      </p>

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetDemo}
        title="Restaurar dados de demonstração"
        message="Os dados atuais serão substituídos pelos dados fictícios de demonstração (3 clientes, 5 orçamentos, biblioteca e modelos)."
        confirmLabel="Restaurar"
      />
      <Confirm
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        onConfirm={wipeAll}
        title="Apagar todos os dados"
        message="Todos os orçamentos, clientes, artigos e modelos serão eliminados permanentemente deste dispositivo. Considere exportar um backup JSON primeiro."
        confirmLabel="Apagar tudo"
      />
    </div>
  );
}
