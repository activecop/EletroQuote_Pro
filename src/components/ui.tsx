import { useEffect } from "react";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";
import { AlertTriangle, Check, ChevronDown, Info, X } from "lucide-react";
import { STATUS_META } from "../types";
import type { QuoteStatus } from "../types";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------- Button ---------------------------------- */

type BtnVariant = "primary" | "soft" | "ghost" | "danger" | "outline";

const BTN_V: Record<BtnVariant, string> = {
  primary:
    "bg-volt text-voltink font-semibold shadow-sm hover:brightness-105 active:brightness-95 shadow-volt/25",
  soft: "bg-raise border border-line text-ink hover:border-faint/60 hover:bg-sunken active:scale-[.98]",
  ghost: "text-mut hover:bg-raise hover:text-ink active:scale-[.98]",
  danger: "bg-bad/10 text-bad border border-bad/25 hover:bg-bad/18 active:scale-[.98]",
  outline: "bg-card border border-line text-ink hover:bg-raise active:scale-[.98]",
};

const BTN_S = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: keyof typeof BTN_S }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg whitespace-nowrap transition-all duration-150 select-none disabled:opacity-45 disabled:pointer-events-none",
        BTN_V[variant],
        BTN_S[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-mut transition-all duration-150 hover:bg-raise hover:text-ink active:scale-90 disabled:opacity-40",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ----------------------------------- Card ----------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {children}
    </div>
  );
}

/* ---------------------------------- Fields ---------------------------------- */

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-mut">
      {children}
    </label>
  );
}

const FIELD =
  "w-full rounded-lg border border-line bg-raise px-3 text-sm text-ink placeholder:text-faint focus:border-volt focus:outline-none focus:ring-2 focus:ring-volt/25 transition-colors";

export function Input({
  label,
  error,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        id={id}
        className={cn(FIELD, "h-10", error && "border-bad focus:border-bad focus:ring-bad/20")}
        {...rest}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-bad">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <select
          id={id}
          className={cn(FIELD, "h-10 appearance-none pr-8 cursor-pointer", error && "border-bad")}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-bad">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  className,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea id={id} className={cn(FIELD, "min-h-20 py-2.5 resize-y")} {...rest} />
    </div>
  );
}

/* ---------------------------------- Badges ---------------------------------- */

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, withDot = true }: { status: QuoteStatus; withDot?: boolean }) {
  const m = STATUS_META[status];
  return (
    <Badge className={m.badge}>
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />}
      {m.label}
    </Badge>
  );
}

/* --------------------------------- Segmented -------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-line bg-raise p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150",
            value === o.value ? "bg-card text-ink shadow-sm border border-line" : "text-mut hover:text-ink border border-transparent"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------- Modal ----------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-[#060a14]/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "anim-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-xl",
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-mut">{subtitle}</p>}
          </div>
          <IconBtn label="Fechar" onClick={onClose}>
            <X className="h-4.5 w-4.5" />
          </IconBtn>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-[#060a14]/55" onClick={onClose} />
      <div className="anim-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden rounded-t-2xl border-t border-line bg-card shadow-2xl">
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>
        {title && <div className="px-5 pb-2 font-display text-sm font-semibold text-ink">{title}</div>}
        <div className="max-h-[76dvh] overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Eliminar",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bad/12 text-bad">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <p className="text-sm leading-relaxed text-mut">{message}</p>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Diversos --------------------------------- */

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-line bg-raise text-faint">
        {icon}
      </div>
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-xs leading-relaxed text-mut">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function ToastIcon({ kind }: { kind: "ok" | "bad" | "info" }) {
  if (kind === "ok")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (kind === "bad")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bad/15 text-bad">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info/15 text-info">
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}
