import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Moon,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
  Zap,
  X,
} from "lucide-react";
import { useStore } from "../store";
import type { Page } from "../types";
import { STATUS_ORDER } from "../types";
import { calcQuote, fmtEUR } from "../calc";
import { cn, IconBtn, Sheet, StatusBadge, ToastIcon } from "./ui";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-volt shadow-md shadow-volt/30">
        <Zap className="h-5 w-5 text-voltink" fill="currentColor" strokeWidth={1} />
      </span>
      {!compact && (
        <span className="font-display text-[13px] font-bold leading-none tracking-tight text-ink">
          ELECTRO-COTAÇÃO<span className="ml-1 text-volt">PRO</span>
          <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.18em] text-faint">
            do primeiro ponto ao orçamento final
          </span>
        </span>
      )}
    </div>
  );
}

const NAV: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "quotes", label: "Orçamentos", icon: FileText },
  { page: "clients", label: "Clientes", icon: Users },
  { page: "library", label: "Biblioteca de Preços", icon: Package },
  { page: "templates", label: "Modelos", icon: LayoutTemplate },
  { page: "reports", label: "Relatórios", icon: BarChart3 },
  { page: "settings", label: "Definições", icon: Settings },
];

const TITLES: Record<Page, string> = {
  dashboard: "Dashboard",
  quotes: "Orçamentos",
  editor: "Editor de Orçamento",
  preview: "Pré-visualização da Proposta",
  clients: "Clientes",
  library: "Biblioteca de Preços",
  templates: "Modelos de Orçamento",
  reports: "Relatórios",
  settings: "Definições",
};

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, nav } = useStore();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name ?? db.clients.find((c) => c.id === id)?.company ?? "";
    const quotes = db.quotes
      .filter(
        (x) =>
          x.number.toLowerCase().includes(s) ||
          x.workName.toLowerCase().includes(s) ||
          clientName(x.clientId).toLowerCase().includes(s) ||
          x.lines.some((l) => l.description.toLowerCase().includes(s))
      )
      .slice(0, 6);
    const clients = db.clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.company.toLowerCase().includes(s) ||
          c.nif.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s)
      )
      .slice(0, 5);
    const articles = db.articles
      .filter((a) => a.description.toLowerCase().includes(s) || a.code.toLowerCase().includes(s) || a.category.toLowerCase().includes(s))
      .slice(0, 5);
    return { quotes, clients, articles, clientName };
  }, [q, db]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24" role="dialog" aria-modal="true" aria-label="Pesquisa global">
      <div className="anim-fade absolute inset-0 bg-[#060a14]/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4.5 w-4.5 shrink-0 text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por número, cliente, obra, NIF, descrição, estado…"
            className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
            aria-label="Pesquisa global"
          />
          <IconBtn label="Fechar pesquisa" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconBtn>
        </div>
        <div className="max-h-[55dvh] overflow-y-auto p-2">
          {!res && <p className="px-3 py-6 text-center text-xs text-faint">Escreva para pesquisar em orçamentos, clientes e artigos.</p>}
          {res && res.quotes.length === 0 && res.clients.length === 0 && res.articles.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-faint">Sem resultados para “{q}”.</p>
          )}
          {res && res.quotes.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-faint">Orçamentos</p>
              {res.quotes.map((x) => {
                const t = calcQuote(x, db.company.defaultIva);
                return (
                  <button
                    key={x.id}
                    onClick={() => {
                      nav({ page: "editor", id: x.id });
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-raise"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {x.number} <span className="text-faint">· V{x.version}</span>
                      </span>
                      <span className="block truncate text-xs text-mut">
                        {res.clientName(x.clientId)} — {x.workName || "sem obra"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-xs font-semibold text-ink tnum">{fmtEUR(t.total)}</span>
                      <StatusBadge status={x.status} withDot={false} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {res && res.clients.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-faint">Clientes</p>
              {res.clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    nav({ page: "clients" });
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-raise"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{c.company || c.name}</span>
                    <span className="block truncate text-xs text-mut">
                      {c.name} · NIF {c.nif || "—"}
                    </span>
                  </span>
                  <Users className="h-4 w-4 shrink-0 text-faint" />
                </button>
              ))}
            </div>
          )}
          {res && res.articles.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-faint">Artigos</p>
              {res.articles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    nav({ page: "library" });
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-raise"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{a.description}</span>
                    <span className="block truncate text-xs text-mut">
                      {a.code} · {a.category}
                    </span>
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink tnum">{fmtEUR(a.price * 100)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[80] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="anim-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-xl lg:w-auto lg:min-w-72"
        >
          <ToastIcon kind={t.kind} />
          <p className="flex-1 text-sm font-medium text-ink">{t.msg}</p>
          <button onClick={() => dismissToast(t.id)} aria-label="Fechar notificação" className="text-faint transition-colors hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { route, nav, theme, toggleTheme, db } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const activePage: Page = route.page === "editor" || route.page === "preview" ? "quotes" : route.page;

  const moreNav = NAV.filter((n) => ["clients", "templates", "reports", "settings"].includes(n.page));
  const bottomNav = NAV.filter((n) => ["dashboard", "quotes", "library"].includes(n.page));

  return (
    <div className="min-h-dvh">
      {/* sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card lg:flex">
        <div className="px-5 pb-6 pt-6">
          <button onClick={() => nav({ page: "dashboard" })} aria-label="Ir para o dashboard">
            <Logo />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Navegação principal">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = activePage === n.page;
            return (
              <button
                key={n.page}
                onClick={() => nav({ page: n.page })}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150",
                  active ? "bg-volt/12 text-ink" : "text-mut hover:bg-raise hover:text-ink"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-volt transition-all duration-200",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  )}
                />
                <Icon className={cn("h-4.5 w-4.5", active && "text-volt")} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center justify-between rounded-lg bg-raise px-3 py-2">
            <span className="text-xs font-semibold text-mut">Tema</span>
            <div className="flex items-center gap-1">
              <IconBtn
                label="Modo dia"
                onClick={() => theme !== "light" && toggleTheme()}
                className={cn("h-8 w-8", theme === "light" && "bg-volt/20 text-voltink")}
              >
                <Sun className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label="Modo noite"
                onClick={() => theme !== "dark" && toggleTheme()}
                className={cn("h-8 w-8", theme === "dark" && "bg-volt/20 text-volt")}
              >
                <Moon className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>
          <div className="px-1">
            <p className="truncate text-[11px] font-semibold text-ink">{db.company.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
              <span className="anim-blink h-1.5 w-1.5 rounded-full bg-ok" />
              PWA · disponível offline
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:px-8">
            <button className="lg:hidden" onClick={() => nav({ page: "dashboard" })} aria-label="Início">
              <Logo compact />
            </button>
            <h1 className="hidden font-display text-lg font-bold tracking-tight text-ink md:block">{TITLES[route.page]}</h1>
            <div className="flex-1" />
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-line bg-card px-3 text-[13px] text-faint transition-colors hover:border-faint/60 md:flex"
              aria-label="Abrir pesquisa global"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Pesquisa global…</span>
              <kbd className="rounded border border-line bg-raise px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</kbd>
            </button>
            <IconBtn label="Pesquisar" onClick={() => setSearchOpen(true)} className="md:hidden">
              <Search className="h-5 w-5" />
            </IconBtn>
            <IconBtn
              label={theme === "dark" ? "Ativar modo dia" : "Ativar modo noite"}
              onClick={toggleTheme}
              className="lg:hidden"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </IconBtn>
            <button
              onClick={() => nav({ page: "editor" })}
              className="hidden h-10 items-center gap-2 rounded-lg bg-volt px-4 text-sm font-semibold text-voltink shadow-md shadow-volt/25 transition-all duration-150 hover:brightness-105 active:scale-[.97] sm:inline-flex"
            >
              <Plus className="h-4.5 w-4.5" /> Novo Orçamento
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 lg:px-8 lg:pb-14">{children}</main>
      </div>

      {/* bottom nav mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navegação inferior"
      >
        <div className="grid grid-cols-5 items-end">
          {bottomNav.slice(0, 2).map((n) => {
            const Icon = n.icon;
            const active = activePage === n.page;
            return (
              <button key={n.page} onClick={() => nav({ page: n.page })} className="flex flex-col items-center gap-1 py-2.5" aria-current={active ? "page" : undefined}>
                <Icon className={cn("h-5 w-5", active ? "text-volt" : "text-faint")} />
                <span className={cn("text-[10px] font-semibold", active ? "text-ink" : "text-faint")}>{n.label}</span>
              </button>
            );
          })}
          <div className="flex justify-center">
            <button
              onClick={() => nav({ page: "editor" })}
              aria-label="Novo orçamento"
              className="anim-glow -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-volt text-voltink active:scale-90 transition-transform"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
          <button onClick={() => nav({ page: "library" })} className="flex flex-col items-center gap-1 py-2.5" aria-current={activePage === "library" ? "page" : undefined}>
            <Package className={cn("h-5 w-5", activePage === "library" ? "text-volt" : "text-faint")} />
            <span className={cn("text-[10px] font-semibold", activePage === "library" ? "text-ink" : "text-faint")}>Biblioteca</span>
          </button>
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5">
            <MoreHorizontal className="h-5 w-5 text-faint" />
            <span className="text-[10px] font-semibold text-faint">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais opções">
        <div className="grid grid-cols-2 gap-2 pt-1">
          {moreNav.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.page}
                onClick={() => {
                  nav({ page: n.page });
                  setMoreOpen(false);
                }}
                className="flex flex-col items-start gap-2 rounded-xl border border-line bg-raise p-4 text-left transition-colors hover:border-volt/50"
              >
                <Icon className="h-5 w-5 text-volt" />
                <span className="text-sm font-semibold text-ink">{n.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-raise px-4 py-3">
          <span className="text-sm font-semibold text-ink">Alternar tema</span>
          <button
            onClick={toggleTheme}
            className="flex h-10 w-16 items-center rounded-full bg-sunken p-1 transition-colors"
            aria-label="Alternar tema claro/escuro"
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bg-volt text-voltink shadow transition-transform duration-200",
                theme === "dark" ? "translate-x-6" : "translate-x-0"
              )}
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
          </button>
        </div>
      </Sheet>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toasts />
    </div>
  );
}

export { STATUS_ORDER };
