import type { Article, Client, Company, CustomCategory, DB, ExtraCost, ItemKind, Quote, QuoteLine, Template } from "./types";
import { daysAgoIso, nowIso, uid } from "./calc";

/* ------------------------------ biblioteca de categorias ------------------------------ */

export interface CategoryDef {
  name: string;
  icon: string;
  kind: ItemKind;
  subs: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    name: "Quadros Elétricos",
    icon: "zap",
    kind: "material",
    subs: [
      "Quadro elétrico",
      "Quadro de distribuição",
      "Quadro de garagem",
      "Quadro exterior",
      "Disjuntores",
      "Diferenciais",
      "DPS",
      "Contactores",
      "Relés",
      "Barramentos",
      "Bornes",
      "Armários",
      "Acessórios",
    ],
  },
  {
    name: "Tomadas",
    icon: "plug",
    kind: "material",
    subs: [
      "Tomada simples",
      "Tomada dupla",
      "Tomada IP44",
      "Tomada IP55",
      "Tomada industrial",
      "Tomada exterior",
      "Tomada TV",
      "Tomada RJ45",
    ],
  },
  {
    name: "Iluminação",
    icon: "bulb",
    kind: "material",
    subs: [
      "Ponto de luz",
      "Interruptor",
      "Comutador",
      "Cruzamento",
      "Sensor de movimento",
      "Downlight",
      "Plafon",
      "Projetor",
      "Fita LED",
      "Emergência",
      "Iluminação exterior",
    ],
  },
  {
    name: "ITED / Telecomunicações",
    icon: "network",
    kind: "material",
    subs: [
      "ATI",
      "Bastidor",
      "Tomada RJ45",
      "Cabo UTP",
      "Cabo coaxial",
      "Fibra",
      "Tubagem ITED",
      "Patch panel",
      "Switch",
      "Acessórios ITED",
    ],
  },
  {
    name: "Cablagem",
    icon: "cable",
    kind: "material",
    subs: [
      "Cabo H07V-U",
      "Cabo H07V-K",
      "Cabo XV",
      "Cabo RV-K",
      "Cabo multicondutor",
      "Cabo de alimentação",
      "Cabo de terra",
      "Cabo de sinal",
    ],
  },
  {
    name: "Tubagem",
    icon: "cylinder",
    kind: "material",
    subs: ["Tubo corrugado", "Tubo VD", "Tubo rígido", "Calha técnica", "Calha metálica", "Acessórios"],
  },
  {
    name: "Mecanismos",
    icon: "toggle",
    kind: "material",
    subs: ["Interruptores", "Tomadas", "Comutadores", "Botões", "Espelhos", "Caixas", "Acessórios"],
  },
  {
    name: "Mão de Obra",
    icon: "wrench",
    kind: "mao_obra",
    subs: [
      "Eletricista",
      "Ajudante",
      "Chefe de equipa",
      "Técnico ITED",
      "Montagem",
      "Instalação",
      "Ensaios",
      "Diagnóstico",
      "Deslocação",
    ],
  },
  {
    name: "Equipamentos",
    icon: "truck",
    kind: "equipamento",
    subs: [
      "Plataforma elevatória",
      "Andaime",
      "Gerador",
      "Máquina de roçar",
      "Perfurador",
      "Ferramentas especiais",
      "Viatura",
      "Equipamento de medição",
    ],
  },
];

export const DEFAULT_COMPANY: Company = {
  name: "Voltagem Nobre — Instalações Elétricas, Lda.",
  nif: "509876543",
  address: "Rua dos Circuitos, 42",
  postal: "4100-188",
  locality: "Porto",
  phone: "+351 220 123 456",
  email: "geral@voltagemnobre.pt",
  website: "www.voltagemnobre.pt",
  iban: "PT50 0002 0123 1234 5678 9015 4",
  logo: "",
  paymentTerms: "40% na adjudicação · 40% a meio da empreitada · 20% na conclusão e entrega do certificado.",
  defaultValidityDays: 30,
  defaultIva: 23,
};

/* --------------------------------- construtores --------------------------------- */

let seedLine = 0;
function L(
  kind: ItemKind,
  category: string,
  subcategory: string,
  description: string,
  unit: string,
  qty: number,
  wastePct: number,
  unitCost: number,
  marginPct: number,
  ivaPct = 23,
  discountPct = 0
): QuoteLine {
  seedLine += 1;
  return {
    id: "seed-" + seedLine,
    kind,
    category,
    subcategory,
    description,
    unit,
    qty,
    wastePct,
    unitCost,
    marginPct,
    discountPct,
    ivaPct,
  };
}

function cloneLines(lines: QuoteLine[]): QuoteLine[] {
  return lines.map((l) => ({ ...l, id: uid() }));
}

function cloneExtras(extras: ExtraCost[]): ExtraCost[] {
  return extras.map((e) => ({ ...e, id: uid() }));
}

export function blankLine(kind: ItemKind, iva: number): QuoteLine {
  return {
    id: uid(),
    kind,
    category: "",
    subcategory: "",
    description: "",
    unit: kind === "mao_obra" ? "h" : "un",
    qty: 1,
    wastePct: 0,
    unitCost: 0,
    marginPct: kind === "material" ? 30 : kind === "mao_obra" ? 25 : 28,
    discountPct: 0,
    ivaPct: iva,
  };
}

export function blankClient(): Client {
  return {
    id: uid(),
    name: "",
    company: "",
    nif: "",
    address: "",
    postal: "",
    locality: "",
    phone: "",
    email: "",
    notes: "",
    createdAt: nowIso(),
  };
}

export function blankQuote(company: Company): Quote {
  const now = nowIso();
  return {
    id: uid(),
    number: "",
    version: 1,
    status: "rascunho",
    clientId: "",
    workName: "",
    workType: "Moradia",
    workAddress: "",
    workPostal: "",
    workLocality: "",
    startDate: "",
    endDate: "",
    manager: "",
    workNotes: "",
    lines: [],
    extras: [],
    globalDiscountPct: 0,
    globalDiscountAbs: 0,
    notes: "",
    conditions: company.paymentTerms,
    validityDays: company.defaultValidityDays,
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

export function emptyDb(company: Company): DB {
  return {
    company,
    clients: [],
    articles: [],
    quotes: [],
    templates: [],
    customCategories: [],
    seq: {},
  };
}

/* --------------------------------- dados de demo --------------------------------- */

const T3_LINES: QuoteLine[] = [
  L("material", "Quadros Elétricos", "Quadro de distribuição", "Quadro de distribuição 24 módulos c/ barramento e tampas", "un", 1, 0, 95, 35),
  L("material", "Quadros Elétricos", "Disjuntores", "Disjuntor magnetotérmico 16A 6kA curva C", "un", 14, 0, 6.8, 40),
  L("material", "Quadros Elétricos", "Diferenciais", "Interruptor diferencial 40A 30mA tipo A", "un", 3, 0, 21, 40),
  L("material", "Quadros Elétricos", "DPS", "DPS Tipo 2 40kA 4P", "un", 1, 0, 38, 40),
  L("material", "Iluminação", "Ponto de luz", "Ponto de luz de teto c/ caixa de derivação e tubagem", "ponto", 38, 5, 14.5, 30),
  L("material", "Iluminação", "Downlight", "Downlight LED 12W 4000K embutir", "un", 14, 0, 8.9, 40),
  L("material", "Mecanismos", "Interruptores", "Interruptor 10A c/ espelho — série de encastre", "un", 16, 0, 6.2, 45),
  L("material", "Mecanismos", "Comutadores", "Comutador 10A c/ espelho", "un", 8, 0, 7.4, 45),
  L("material", "Tomadas", "Tomada dupla", "Tomada dupla 16A c/ espelho", "un", 22, 0, 7.8, 45),
  L("material", "Tomadas", "Tomada IP44", "Tomada IP44 16A p/ zonas húmidas", "un", 4, 0, 11.5, 45),
  L("material", "Cablagem", "Cabo H07V-U", "Cabo H07V-U 2,5 mm² (azul/vermelho/preto)", "m", 320, 10, 0.62, 35),
  L("material", "Cablagem", "Cabo H07V-U", "Cabo H07V-U 1,5 mm² (iluminação)", "m", 280, 10, 0.48, 35),
  L("material", "Cablagem", "Cabo de terra", "Condutor de proteção H07V-U 6 mm² verde/amarelo", "m", 25, 10, 1.15, 35),
  L("material", "Tubagem", "Tubo corrugado", "Tubo corrugado Ø20 mm", "m", 380, 10, 0.35, 40),
  L("material", "Tubagem", "Tubo corrugado", "Tubo corrugado Ø25 mm", "m", 120, 10, 0.52, 40),
  L("material", "Tubagem", "Acessórios", "Caixa de derivação 80×80 c/ tampa", "un", 26, 0, 1.2, 45),
  L("material", "ITED / Telecomunicações", "ATI", "ATI — armário de telecomunicações individual", "un", 1, 0, 68, 35),
  L("material", "ITED / Telecomunicações", "Cabo UTP", "Cabo UTP Cat.6 LSZH", "m", 180, 10, 0.55, 40),
  L("material", "ITED / Telecomunicações", "Tomada RJ45", "Tomada RJ45 Cat.6 c/ espelho", "un", 6, 0, 8.5, 45),
  L("mao_obra", "Mão de Obra", "Eletricista", "Mão de obra especializada — eletricista certificado", "h", 95, 0, 16, 25),
  L("mao_obra", "Mão de Obra", "Ajudante", "Ajudante de eletricista", "h", 60, 0, 11, 25),
  L("mao_obra", "Mão de Obra", "Ensaios", "Ensaios, verificações e certificado de exploração", "serviço", 1, 0, 90, 30),
  L("equipamento", "Equipamentos", "Máquina de roçar", "Aluguer de máquina de roçar paredes", "dia", 3, 0, 45, 30),
];

const T3_EXTRAS: ExtraCost[] = [
  { id: "seed-e1", label: "Deslocação à obra", type: "fixo", value: 40, ivaPct: 23 },
  { id: "seed-e2", label: "Consumíveis e pequenas ferramentas", type: "pct", value: 2, ivaPct: 23 },
];

const ITED_LINES: QuoteLine[] = [
  L("material", "ITED / Telecomunicações", "Bastidor", "Bastidor de chão 12U 600×600 ventilado", "un", 1, 0, 285, 30),
  L("material", "ITED / Telecomunicações", "Patch panel", "Patch panel 24 portas Cat.6", "un", 2, 0, 38, 35),
  L("material", "ITED / Telecomunicações", "Switch", "Switch gerível 24 portas PoE", "un", 1, 0, 240, 25),
  L("material", "ITED / Telecomunicações", "Cabo UTP", "Cabo UTP Cat.6 LSZH (bobine 305 m)", "m", 460, 10, 0.55, 35),
  L("material", "ITED / Telecomunicações", "Tubagem ITED", "Tubo VD Ø40 para redes ITED", "m", 90, 10, 1.1, 35),
  L("material", "ITED / Telecomunicações", "Tomada RJ45", "Tomada dupla RJ45 Cat.6 c/ espelho", "un", 18, 0, 8.5, 45),
  L("material", "ITED / Telecomunicações", "Acessórios ITED", "Organizador de cabos 1U", "un", 3, 0, 12, 40),
  L("material", "Cablagem", "Cabo de alimentação", "Alimentação do bastidor 3G1,5 mm²", "m", 30, 10, 0.9, 35),
  L("mao_obra", "Mão de Obra", "Técnico ITED", "Técnico ITED — passagem, terminações e ensaios", "h", 24, 0, 18, 25),
  L("mao_obra", "Mão de Obra", "Ensaios", "Ensaios de certificação por posto", "ponto", 18, 0, 3.5, 30),
];

const ITED_EXTRAS: ExtraCost[] = [{ id: "seed-e3", label: "Deslocação técnica", type: "fixo", value: 35, ivaPct: 23 }];

const WALLBOX_LINES: QuoteLine[] = [
  L("material", "Quadros Elétricos", "Quadro elétrico", "Wallbox 7,4 kW monofásica c/ cabo 5 m (modo 3)", "un", 1, 0, 620, 22),
  L("material", "Quadros Elétricos", "Disjuntores", "Disjuntor 40A 6kA curva C", "un", 1, 0, 14, 40),
  L("material", "Quadros Elétricos", "Diferenciais", "Diferencial 40A 30mA tipo A", "un", 1, 0, 21, 40),
  L("material", "Cablagem", "Cabo RV-K", "Cabo RV-K 3G6 mm²", "m", 15, 10, 3.2, 30),
  L("material", "Tubagem", "Tubo VD", "Tubo VD Ø32 mm", "m", 12, 10, 1.4, 35),
  L("mao_obra", "Mão de Obra", "Instalação", "Instalação, ligação e configuração", "h", 6, 0, 16, 25),
  L("mao_obra", "Mão de Obra", "Ensaios", "Ensaio de terra e verificação de proteção", "serviço", 1, 0, 35, 30),
];

const WALLBOX_EXTRAS: ExtraCost[] = [{ id: "seed-e4", label: "Deslocação", type: "fixo", value: 25, ivaPct: 23 }];

const ARMAZEM_LINES: QuoteLine[] = [
  L("material", "Iluminação", "Projetor", "Luminária LED estanque 120W 4000K IP65", "un", 24, 0, 58, 32),
  L("material", "Iluminação", "Emergência", "Luminária de emergência LED autónoma", "un", 8, 0, 19, 38),
  L("material", "Cablagem", "Cabo H07V-K", "Cabo H07V-K 2,5 mm²", "m", 260, 10, 0.68, 35),
  L("material", "Tubagem", "Calha técnica", "Calha técnica 40×25 c/ acessórios", "m", 140, 10, 1.8, 35),
  L("material", "Quadros Elétricos", "Quadro elétrico", "Quadro de iluminação 12 módulos IP55", "un", 2, 0, 62, 35),
  L("mao_obra", "Mão de Obra", "Montagem", "Montagem em altura — equipa de 2", "h", 70, 0, 17, 25),
  L("equipamento", "Equipamentos", "Plataforma elevatória", "Plataforma elevatória articulada 16 m", "dia", 6, 0, 45, 30),
  L("equipamento", "Equipamentos", "Andaime", "Torre de andaime móvel", "dia", 4, 0, 18, 35),
];

const LOJA_LINES: QuoteLine[] = [
  L("material", "Iluminação", "Ponto de luz", "Ponto de luz c/ calha técnica aparente", "ponto", 26, 5, 16, 30),
  L("material", "Iluminação", "Fita LED", "Fita LED 24V 14,4W/m c/ perfil alumínio", "m", 18, 10, 9.5, 38),
  L("material", "Tomadas", "Tomada dupla", "Tomada dupla 16A mecanismo preto mate", "un", 14, 0, 9.2, 45),
  L("material", "Mecanismos", "Interruptores", "Interruptor 10A preto mate c/ espelho", "un", 10, 0, 7.1, 45),
  L("material", "Quadros Elétricos", "Quadro de distribuição", "Quadro de loja 36 módulos c/ fechadura", "un", 1, 0, 148, 32),
  L("material", "Cablagem", "Cabo H07V-U", "Cabo H07V-U 2,5 mm²", "m", 240, 10, 0.62, 35),
  L("mao_obra", "Mão de Obra", "Eletricista", "Instalação elétrica completa", "h", 80, 0, 16, 25),
  L("mao_obra", "Mão de Obra", "Diagnóstico", "Análise da instalação existente", "h", 4, 0, 16, 25),
  L("equipamento", "Equipamentos", "Perfurador", "Perfuração de betão — coroa diamantada", "un", 6, 0, 12, 40),
];

const REMODELACAO_LINES: QuoteLine[] = [
  L("material", "Quadros Elétricos", "Quadro de distribuição", "Quadro 18 módulos c/ proteções", "un", 1, 0, 74, 35),
  L("material", "Mecanismos", "Tomadas", "Substituição de mecanismos — tomada 16A", "un", 18, 0, 6.9, 45),
  L("material", "Iluminação", "Downlight", "Downlight LED 8W redondo", "un", 12, 0, 6.4, 40),
  L("material", "Cablagem", "Cabo H07V-U", "Cabo H07V-U 2,5 mm²", "m", 140, 10, 0.62, 35),
  L("material", "Tubagem", "Calha técnica", "Calha técnica branca 30×15", "m", 60, 10, 1.2, 40),
  L("mao_obra", "Mão de Obra", "Eletricista", "Remodelação do circuito elétrico", "h", 50, 0, 16, 25),
  L("mao_obra", "Mão de Obra", "Deslocação", "Deslocações incluídas", "serviço", 1, 0, 30, 25),
];

function makeArticle(
  code: string,
  description: string,
  kind: ItemKind,
  category: string,
  subcategory: string,
  unit: string,
  cost: number,
  price: number,
  manufacturer: string,
  reference: string,
  supplier: string,
  favorite = false
): Article {
  return {
    id: uid(),
    code,
    description,
    kind,
    category,
    subcategory,
    unit,
    manufacturer,
    reference,
    supplier,
    cost,
    price,
    iva: 23,
    favorite,
    notes: "",
  };
}

export function buildSeed(): DB {
  seedLine = 0;

  const clients: Client[] = [
    {
      id: "cl-alvora",
      name: "Eng.º Rui Alpuim",
      company: "Construtora Alvora, Lda.",
      nif: "501234567",
      address: "Av. da Boavista, 1120",
      postal: "4100-111",
      locality: "Porto",
      phone: "+351 912 345 678",
      email: "rui.alpuim@alvora.pt",
      notes: "Cliente recorrente — empreitadas de habitação.",
      createdAt: daysAgoIso(210),
    },
    {
      id: "cl-marisa",
      name: "Marisa Tavares",
      company: "",
      nif: "223456789",
      address: "Rua do Souto, 45, 3.º Esq.",
      postal: "4700-321",
      locality: "Braga",
      phone: "+351 936 555 210",
      email: "marisa.tavares@mail.pt",
      notes: "",
      createdAt: daysAgoIso(60),
    },
    {
      id: "cl-retail",
      name: "Direção Técnica",
      company: "Grupo RetailPark, SA",
      nif: "504876123",
      address: "Estrada Nacional 10, km 22",
      postal: "2615-087",
      locality: "Alverca do Ribatejo",
      phone: "+351 210 888 400",
      email: "obras@retailpark.pt",
      notes: "Exige certificados CE de todo o material.",
      createdAt: daysAgoIso(320),
    },
  ];

  const articles: Article[] = [
    makeArticle("EL-010", "Cabo H07V-U 1,5 mm²", "material", "Cablagem", "Cabo H07V-U", "m", 0.48, 0.78, "Cabelte", "H07VU15", "JLF Distribuição", true),
    makeArticle("EL-011", "Cabo H07V-U 2,5 mm²", "material", "Cablagem", "Cabo H07V-U", "m", 0.62, 0.99, "Cabelte", "H07VU25", "JLF Distribuição", true),
    makeArticle("EL-012", "Cabo XV 3G2,5 mm²", "material", "Cablagem", "Cabo XV", "m", 1.45, 2.2, "Conduril", "XV3G25", "Sotel", false),
    makeArticle("EL-013", "Cabo RV-K 3G6 mm²", "material", "Cablagem", "Cabo RV-K", "m", 3.1, 4.6, "Prysmian", "RVK3G6", "Sotel", false),
    makeArticle("EL-020", "Disjuntor magnetotérmico 16A 6kA", "material", "Quadros Elétricos", "Disjuntores", "un", 6.8, 11.5, "Schneider", "A9K24116", "Sotel", true),
    makeArticle("EL-021", "Interruptor diferencial 40A 30mA tipo A", "material", "Quadros Elétricos", "Diferenciais", "un", 21, 34, "Schneider", "A9R62240", "Sotel", false),
    makeArticle("EL-022", "DPS Tipo 2 40kA 4P", "material", "Quadros Elétricos", "DPS", "un", 38, 59, "Abb", "OVR T2", "JLF Distribuição", false),
    makeArticle("EL-023", "Quadro de distribuição 24 módulos", "material", "Quadros Elétricos", "Quadro de distribuição", "un", 95, 149, "Hager", "VN224", "Sotel", false),
    makeArticle("EL-030", "Tomada dupla 16A c/ espelho", "material", "Mecanismos", "Tomadas", "un", 7.8, 13.9, "Efapel", "Logus 90", "JLF Distribuição", true),
    makeArticle("EL-040", "Downlight LED 12W 4000K", "material", "Iluminação", "Downlight", "un", 8.9, 15.5, "Lumicenter", "DL12", "Candiled", false),
    makeArticle("EL-041", "Tubo corrugado Ø20 mm", "material", "Tubagem", "Tubo corrugado", "m", 0.35, 0.62, "Tubarão", "TC20", "JLF Distribuição", false),
    makeArticle("EL-050", "Wallbox 7,4 kW modo 3", "material", "Quadros Elétricos", "Quadro elétrico", "un", 620, 845, "Wallbox", "Pulsar Plus", "Eletronorte", true),
    makeArticle("MO-100", "Eletricista certificado", "mao_obra", "Mão de Obra", "Eletricista", "h", 16, 24, "", "", "", false),
    makeArticle("MO-101", "Ajudante de eletricista", "mao_obra", "Mão de Obra", "Ajudante", "h", 11, 16, "", "", "", false),
    makeArticle("MO-102", "Chefe de equipa", "mao_obra", "Mão de Obra", "Chefe de equipa", "h", 20, 30, "", "", "", false),
    makeArticle("MO-103", "Técnico ITED", "mao_obra", "Mão de Obra", "Técnico ITED", "h", 18, 28, "", "", "", false),
    makeArticle("MO-104", "Deslocação (até 30 km)", "mao_obra", "Mão de Obra", "Deslocação", "serviço", 15, 22, "", "", "", false),
    makeArticle("EQ-200", "Plataforma elevatória 16 m (aluguer)", "equipamento", "Equipamentos", "Plataforma elevatória", "dia", 45, 70, "Loxam", "", "Loxam Hune", false),
    makeArticle("EQ-201", "Máquina de roçar (aluguer)", "equipamento", "Equipamentos", "Máquina de roçar", "dia", 45, 68, "Hilti", "DC-SE 140", "Ferragens Norte", false),
    makeArticle("EQ-202", "Gerador 5 kVA (aluguer)", "equipamento", "Equipamentos", "Gerador", "dia", 30, 48, "Honda", "EU70is", "Loxam Hune", false),
  ];

  const templates: Template[] = [
    {
      id: "tpl-t3",
      name: "Moradia T3 — Instalação elétrica completa",
      description: "Quadro, circuitos de iluminação e tomadas, ITED e mão de obra. Base pronta a ajustar por divisão.",
      workType: "Moradia",
      lines: cloneLines(T3_LINES),
      extras: cloneExtras(T3_EXTRAS),
      createdAt: daysAgoIso(180),
    },
    {
      id: "tpl-ited",
      name: "Instalação ITED — Escritório",
      description: "Bastidor, patch panels, cabo Cat.6, tomadas RJ45 e certificação por posto.",
      workType: "Escritório",
      lines: cloneLines(ITED_LINES),
      extras: cloneExtras(ITED_EXTRAS),
      createdAt: daysAgoIso(120),
    },
    {
      id: "tpl-wallbox",
      name: "Wallbox 7,4 kW — Carregamento VE",
      description: "Fornecimento e instalação de wallbox com proteções dedicadas e ensaio de terra.",
      workType: "Moradia",
      lines: cloneLines(WALLBOX_LINES),
      extras: cloneExtras(WALLBOX_EXTRAS),
      createdAt: daysAgoIso(75),
    },
  ];

  // orçamentos ordenados do mais antigo para o mais recente → numeração coerente
  const seq: Record<string, number> = {};
  const mk = (
    createdAt: string,
    status: Quote["status"],
    clientId: string,
    workName: string,
    workType: string,
    workLocality: string,
    lines: QuoteLine[],
    extras: ExtraCost[],
    extraPatch: Partial<Quote> = {}
  ): Quote => {
    const year = String(new Date(createdAt).getFullYear());
    seq[year] = (seq[year] || 0) + 1;
    return {
      id: uid(),
      number: `ORC-${year}-${String(seq[year]).padStart(4, "0")}`,
      version: 1,
      status,
      clientId,
      workName,
      workType,
      workAddress: "",
      workPostal: "",
      workLocality,
      startDate: "",
      endDate: "",
      manager: "Paulo Ferreira",
      workNotes: "",
      lines,
      extras,
      globalDiscountPct: 0,
      globalDiscountAbs: 0,
      notes: "",
      conditions: DEFAULT_COMPANY.paymentTerms,
      validityDays: 30,
      createdAt,
      updatedAt: createdAt,
      history: [],
      ...extraPatch,
    };
  };

  const quotes: Quote[] = [
    mk(
      daysAgoIso(160),
      "aprovado",
      "cl-retail",
      "Substituição de iluminação — Armazém 3",
      "Armazém",
      "Alverca do Ribatejo",
      cloneLines(ARMAZEM_LINES),
      [
        { id: uid(), label: "Deslocação da equipa", type: "fixo", value: 60, ivaPct: 23 },
      ],
      { notes: "Intervenção em período noturno a combinar com a direção do parque." }
    ),
    mk(
      daysAgoIso(95),
      "execucao",
      "cl-alvora",
      "Moradia T3 — Instalação elétrica completa",
      "Moradia",
      "Vila Nova de Gaia",
      cloneLines(T3_LINES),
      cloneExtras(T3_EXTRAS),
      {
        version: 3,
        globalDiscountPct: 3,
        history: [
          { version: 1, date: daysAgoIso(102), total: 1421800, status: "enviado" },
          { version: 2, date: daysAgoIso(98), total: 1396300, status: "negociacao" },
        ],
        notes: "Versão 3 com desconto comercial de 3% acordado em reunião.",
      }
    ),
    mk(
      daysAgoIso(40),
      "recusado",
      "cl-marisa",
      "Remodelação de apartamento T2",
      "Remodelação",
      "Braga",
      cloneLines(REMODELACAO_LINES),
      [],
      { notes: "Cliente optou por adiar a obra para o próximo ano." }
    ),
    mk(
      daysAgoIso(12),
      "enviado",
      "cl-alvora",
      "Escritório — Rede ITED e postos de trabalho",
      "Escritório",
      "Porto",
      cloneLines(ITED_LINES),
      cloneExtras(ITED_EXTRAS)
    ),
    mk(
      daysAgoIso(3),
      "negociacao",
      "cl-retail",
      "Loja 12 — Instalação elétrica e iluminação decorativa",
      "Comércio",
      "Alverca do Ribatejo",
      cloneLines(LOJA_LINES),
      [{ id: uid(), label: "Logística e transporte de material", type: "pct", value: 1.5, ivaPct: 23 }],
      { globalDiscountPct: 2 }
    ),
  ];

  return {
    company: { ...DEFAULT_COMPANY },
    clients,
    articles,
    quotes,
    templates,
    customCategories: [],
    seq,
  };
}
