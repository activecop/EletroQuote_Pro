export type Theme = "light" | "dark";

export type ItemKind = "material" | "mao_obra" | "equipamento" | "servico" | "outro";

export type QuoteStatus =
  | "rascunho"
  | "enviado"
  | "negociacao"
  | "aprovado"
  | "recusado"
  | "expirado"
  | "execucao"
  | "concluido";

export type Page =
  | "dashboard"
  | "quotes"
  | "editor"
  | "preview"
  | "clients"
  | "library"
  | "templates"
  | "reports"
  | "settings";

export interface Route {
  page: Page;
  id?: string;
  templateId?: string;
  q?: string;
}

export const UNITS = ["un", "m", "m²", "m³", "kg", "h", "dia", "serviço", "conjunto", "ponto", "outra"];

export const WORK_TYPES = [
  "Moradia",
  "Apartamento",
  "Comércio",
  "Escritório",
  "Armazém",
  "Indústria",
  "Remodelação",
  "Nova construção",
  "Manutenção",
  "Outra",
];

export const IVA_PRESETS = [0, 6, 13, 23];

export interface Company {
  name: string;
  nif: string;
  address: string;
  postal: string;
  locality: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  logo: string; // dataURL
  paymentTerms: string;
  defaultValidityDays: number;
  defaultIva: number;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  nif: string;
  address: string;
  postal: string;
  locality: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface Article {
  id: string;
  code: string;
  description: string;
  kind: ItemKind;
  category: string;
  subcategory: string;
  unit: string;
  manufacturer: string;
  reference: string;
  supplier: string;
  cost: number; // EUR
  price: number; // EUR (preço de venda sugerido)
  iva: number;
  favorite: boolean;
  notes: string;
}

export interface QuoteLine {
  id: string;
  kind: ItemKind;
  category: string;
  subcategory: string;
  description: string;
  unit: string;
  qty: number;
  wastePct: number; // desperdício %
  unitCost: number; // EUR
  marginPct: number;
  discountPct: number;
  ivaPct: number;
}

export interface ExtraCost {
  id: string;
  label: string;
  type: "fixo" | "pct";
  value: number; // EUR se fixo, % se pct
  ivaPct: number;
}

export interface VersionSnap {
  version: number;
  date: string;
  total: number; // cents, total com IVA
  status: QuoteStatus;
}

export interface Quote {
  id: string;
  number: string; // ORC-2026-0001
  version: number;
  status: QuoteStatus;
  clientId: string;
  workName: string;
  workType: string;
  workAddress: string;
  workPostal: string;
  workLocality: string;
  startDate: string;
  endDate: string;
  manager: string;
  workNotes: string;
  lines: QuoteLine[];
  extras: ExtraCost[];
  globalDiscountPct: number;
  globalDiscountAbs: number; // EUR
  notes: string;
  conditions: string;
  validityDays: number;
  createdAt: string;
  updatedAt: string;
  history: VersionSnap[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  workType: string;
  lines: QuoteLine[];
  extras: ExtraCost[];
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  kind: ItemKind;
  subs: string[];
}

export interface DB {
  company: Company;
  clients: Client[];
  articles: Article[];
  quotes: Quote[];
  templates: Template[];
  customCategories: CustomCategory[];
  seq: Record<string, number>;
}

export const KIND_LABEL: Record<ItemKind, string> = {
  material: "Material",
  mao_obra: "Mão de obra",
  equipamento: "Equipamento",
  servico: "Serviço",
  outro: "Outro",
};

export const STATUS_META: Record<QuoteStatus, { label: string; dot: string; badge: string }> = {
  rascunho: { label: "Rascunho", dot: "bg-faint", badge: "bg-faint/15 text-mut" },
  enviado: { label: "Enviado", dot: "bg-info", badge: "bg-info/12 text-info" },
  negociacao: { label: "Em negociação", dot: "bg-warn", badge: "bg-warn/12 text-warn" },
  aprovado: { label: "Aprovado", dot: "bg-ok", badge: "bg-ok/12 text-ok" },
  recusado: { label: "Recusado", dot: "bg-bad", badge: "bg-bad/12 text-bad" },
  expirado: { label: "Expirado", dot: "bg-faint", badge: "bg-sunken text-faint" },
  execucao: { label: "Em execução", dot: "bg-volt", badge: "bg-volt/15 text-warn" },
  concluido: { label: "Concluído", dot: "bg-ok", badge: "bg-ok/12 text-ok" },
};

export const STATUS_ORDER: QuoteStatus[] = [
  "rascunho",
  "enviado",
  "negociacao",
  "aprovado",
  "recusado",
  "expirado",
  "execucao",
  "concluido",
];
