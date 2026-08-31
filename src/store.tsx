import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Article, Client, Company, CustomCategory, DB, Quote, QuoteStatus, Route, Template, Theme } from "./types";
import { DEFAULT_COMPANY, buildSeed, emptyDb } from "./data";
import { nowIso, uid } from "./calc";

const DB_KEY = "electro-cotacao.db.v1";
const LEGACY_DB_KEY = "electroquote.db.v1";
const THEME_KEY = "electro-cotacao.theme.v1";
const LEGACY_THEME_KEY = "electroquote.theme.v1";

export interface Toast {
  id: string;
  kind: "ok" | "bad" | "info";
  msg: string;
}

interface StoreApi {
  db: DB;
  theme: Theme;
  toggleTheme: () => void;
  route: Route;
  nav: (r: Route) => void;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  peekNumber: () => string;
  saveQuote: (q: Quote) => Quote;
  deleteQuote: (id: string) => void;
  duplicateQuote: (id: string) => void;
  setStatus: (id: string, s: QuoteStatus) => void;
  saveClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  saveArticle: (a: Article) => void;
  deleteArticle: (id: string) => void;
  duplicateArticle: (id: string) => void;
  toggleFavArticle: (id: string) => void;
  saveTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  saveCustomCategory: (c: CustomCategory) => void;
  updateCompany: (c: Company) => void;
  importDb: (d: DB) => void;
  resetDemo: () => void;
  wipeAll: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

function loadDb(): DB | null {
  try {
    const raw = localStorage.getItem(DB_KEY) ?? localStorage.getItem(LEGACY_DB_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as DB;
    if (!d || !d.company || !Array.isArray(d.quotes)) return null;
    return d;
  } catch {
    return null;
  }
}

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
    if (t === "dark" || t === "light") return t;
  } catch {
    /* ignore */
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDb() ?? buildSeed());
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [route, setRoute] = useState<Route>({ page: "dashboard" });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* quota — ignorar */
    }
  }, [db]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1120" : "#eef0f3");
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const nav = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (msg: string, kind: Toast["kind"] = "ok") => {
      const id = uid();
      setToasts((ts) => [...ts.slice(-3), { id, kind, msg }]);
      window.setTimeout(() => dismissToast(id), 3600);
    },
    [dismissToast]
  );

  const assignNumber = useCallback(
    (d: DB): { number: string; seq: Record<string, number> } => {
      const year = String(new Date().getFullYear());
      const n = (d.seq[year] || 0) + 1;
      return { number: `ORC-${year}-${String(n).padStart(4, "0")}`, seq: { ...d.seq, [year]: n } };
    },
    []
  );

  const peekNumber = useCallback(() => {
    const { number } = assignNumber(db);
    return number;
  }, [db, assignNumber]);

  const saveQuote = useCallback(
    (q: Quote): Quote => {
      const updated: Quote = { ...q, updatedAt: nowIso() };
      let seq = db.seq;
      if (!updated.number) {
        const a = assignNumber(db);
        updated.number = a.number;
        seq = a.seq;
      }
      setDb((prev) => {
        const exists = prev.quotes.some((x) => x.id === updated.id);
        return {
          ...prev,
          seq,
          quotes: exists ? prev.quotes.map((x) => (x.id === updated.id ? updated : x)) : [updated, ...prev.quotes],
        };
      });
      return updated;
    },
    [db, assignNumber]
  );

  const deleteQuote = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, quotes: prev.quotes.filter((q) => q.id !== id) }));
  }, []);

  const duplicateQuote = useCallback(
    (id: string) => {
      const q = db.quotes.find((x) => x.id === id);
      if (!q) return;
      const { number, seq } = assignNumber(db);
      const clone: Quote = {
        ...JSON.parse(JSON.stringify(q)),
        id: uid(),
        number,
        status: "rascunho",
        version: 1,
        history: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      setDb((prev) => ({ ...prev, seq, quotes: [clone, ...prev.quotes] }));
      toast(`Duplicado como ${number}`, "ok");
    },
    [db, assignNumber, toast]
  );

  const setStatus = useCallback(
    (id: string, s: QuoteStatus) => {
      setDb((prev) => ({
        ...prev,
        quotes: prev.quotes.map((q) => (q.id === id ? { ...q, status: s, updatedAt: nowIso() } : q)),
      }));
    },
    []
  );

  const saveClient = useCallback((c: Client) => {
    setDb((prev) => {
      const exists = prev.clients.some((x) => x.id === c.id);
      return { ...prev, clients: exists ? prev.clients.map((x) => (x.id === c.id ? c : x)) : [...prev.clients, c] };
    });
  }, []);

  const deleteClient = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }));
  }, []);

  const saveArticle = useCallback((a: Article) => {
    setDb((prev) => {
      const exists = prev.articles.some((x) => x.id === a.id);
      return { ...prev, articles: exists ? prev.articles.map((x) => (x.id === a.id ? a : x)) : [a, ...prev.articles] };
    });
  }, []);

  const deleteArticle = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, articles: prev.articles.filter((a) => a.id !== id) }));
  }, []);

  const duplicateArticle = useCallback((id: string) => {
    setDb((prev) => {
      const a = prev.articles.find((x) => x.id === id);
      if (!a) return prev;
      return { ...prev, articles: [{ ...a, id: uid(), code: `${a.code}-2`, favorite: false }, ...prev.articles] };
    });
  }, []);

  const toggleFavArticle = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      articles: prev.articles.map((a) => (a.id === id ? { ...a, favorite: !a.favorite } : a)),
    }));
  }, []);

  const saveTemplate = useCallback((t: Template) => {
    setDb((prev) => {
      const exists = prev.templates.some((x) => x.id === t.id);
      return {
        ...prev,
        templates: exists ? prev.templates.map((x) => (x.id === t.id ? t : x)) : [t, ...prev.templates],
      };
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, templates: prev.templates.filter((t) => t.id !== id) }));
  }, []);

  const saveCustomCategory = useCallback((c: CustomCategory) => {
    setDb((prev) => ({ ...prev, customCategories: [...prev.customCategories, c] }));
  }, []);

  const updateCompany = useCallback((c: Company) => {
    setDb((prev) => ({ ...prev, company: c }));
  }, []);

  const importDb = useCallback(
    (d: DB) => {
      const safe: DB = {
        company: { ...DEFAULT_COMPANY, ...d.company },
        clients: Array.isArray(d.clients) ? d.clients : [],
        articles: Array.isArray(d.articles) ? d.articles : [],
        quotes: Array.isArray(d.quotes) ? d.quotes : [],
        templates: Array.isArray(d.templates) ? d.templates : [],
        customCategories: Array.isArray(d.customCategories) ? d.customCategories : [],
        seq: d.seq && typeof d.seq === "object" ? d.seq : {},
      };
      setDb(safe);
      toast("Dados importados com sucesso", "ok");
    },
    [toast]
  );

  const resetDemo = useCallback(() => {
    setDb(buildSeed());
    toast("Dados de demonstração restaurados", "info");
  }, [toast]);

  const wipeAll = useCallback(() => {
    setDb(emptyDb({ ...DEFAULT_COMPANY }));
    toast("Todos os dados foram apagados", "info");
  }, [toast]);

  const api = useMemo<StoreApi>(
    () => ({
      db,
      theme,
      toggleTheme,
      route,
      nav,
      toasts,
      toast,
      dismissToast,
      peekNumber,
      saveQuote,
      deleteQuote,
      duplicateQuote,
      setStatus,
      saveClient,
      deleteClient,
      saveArticle,
      deleteArticle,
      duplicateArticle,
      toggleFavArticle,
      saveTemplate,
      deleteTemplate,
      saveCustomCategory,
      updateCompany,
      importDb,
      resetDemo,
      wipeAll,
    }),
    [
      db,
      theme,
      toggleTheme,
      route,
      nav,
      toasts,
      toast,
      dismissToast,
      peekNumber,
      saveQuote,
      deleteQuote,
      duplicateQuote,
      setStatus,
      saveClient,
      deleteClient,
      saveArticle,
      deleteArticle,
      duplicateArticle,
      toggleFavArticle,
      saveTemplate,
      deleteTemplate,
      saveCustomCategory,
      updateCompany,
      importDb,
      resetDemo,
      wipeAll,
    ]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore fora do StoreProvider");
  return v;
}
