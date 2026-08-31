import { useEffect, useMemo, useRef, useState } from "react";
import { fmtEUR } from "../calc";

export interface TrendPoint {
  label: string;
  a: number; // valor orçamentado (cents)
  b: number; // valor aprovado (cents)
}

function fmtAxis(cents: number): string {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace(".", ",")}k`;
  return `${Math.round(v)}`;
}

export function TrendChart({
  data,
  aLabel = "Orçamentado",
  bLabel = "Aprovado",
}: {
  data: TrendPoint[];
  aLabel?: string;
  bLabel?: string;
}) {
  const W = 660;
  const H = 250;
  const padL = 46;
  const padR = 14;
  const padT = 16;
  const padB = 30;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const max = useMemo(() => {
    const m = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
    return m * 1.18;
  }, [data]);

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const slot = plotW / Math.max(1, data.length);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const x = (i: number) => padL + slot * i + slot / 2;

  const grid = [0.25, 0.5, 0.75, 1];

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const idx = Math.floor((px - padL) / slot);
    setHover(idx >= 0 && idx < data.length ? idx : null);
  };

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.b)}`).join(" ");

  return (
    <div className="relative" ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Evolução: ${aLabel} vs ${bLabel}`}>
        {grid.map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(max * g)} y2={y(max * g)} stroke="var(--line)" strokeWidth="1" strokeDasharray={g === 1 ? "" : "3 4"} />
            <text x={padL - 8} y={y(max * g) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--faint)" fontFamily="var(--font-mono)">
              {fmtAxis(max * g)}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--line)" strokeWidth="1" />

        {data.map((d, i) => {
          const bw = Math.min(26, slot * 0.5);
          const h = (d.a / max) * plotH;
          return (
            <g key={i}>
              <rect
                x={x(i) - bw / 2}
                y={y(d.a)}
                width={bw}
                height={Math.max(1, h)}
                rx="3"
                fill="var(--volt)"
                opacity={hover === null || hover === i ? 0.9 : 0.35}
                className="anim-bar"
                style={{ animationDelay: `${i * 35}ms` }}
              />
            </g>
          );
        })}

        {data.some((d) => d.b > 0) && (
          <>
            <path d={linePath} fill="none" stroke="var(--info)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
            {data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d.b)} r={hover === i ? 4.5 : 3} fill="var(--card)" stroke="var(--info)" strokeWidth="2" />
            ))}
          </>
        )}

        {data.map((d, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 9}
            textAnchor="middle"
            fontSize="9.5"
            fill={hover === i ? "var(--ink)" : "var(--faint)"}
            fontWeight={hover === i ? 600 : 400}
          >
            {d.label}
          </text>
        ))}

        {hover !== null && data[hover] && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        )}
      </svg>

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: "4%" }}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">{data[hover].label}</p>
          <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink">
            <span className="h-2 w-2 rounded-[3px] bg-volt" /> {aLabel}: <span className="font-mono tnum">{fmtEUR(data[hover].a)}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink">
            <span className="h-2 w-2 rounded-full bg-info" /> {bLabel}: <span className="font-mono tnum">{fmtEUR(data[hover].b)}</span>
          </p>
        </div>
      )}

      <div className="mt-1 flex items-center justify-center gap-5 text-xs text-mut">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-volt" /> {aLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-info" /> {bLabel}
        </span>
      </div>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 56;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--raise)" strokeWidth="15" />
          {total > 0 &&
            slices
              .filter((s) => s.value > 0)
              .map((s, i) => {
                const frac = s.value / total;
                const dash = on ? frac * C : 0;
                const off = -acc * C;
                acc += frac;
                return (
                  <circle
                    key={i}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="15"
                    strokeLinecap="butt"
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={off}
                    style={{ transition: "stroke-dasharray .9s cubic-bezier(.22,.9,.3,1)" }}
                  />
                );
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold text-ink tnum">{centerValue}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-40 space-y-1.5">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-mut">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-mono font-semibold text-ink tnum">
              {s.value}
              <span className="ml-1.5 text-[10px] font-normal text-faint">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Spark({ points, color = "var(--volt)" }: { points: number[]; color?: string }) {
  if (points.length < 2) points = [...points, ...points];
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const W = 100;
  const H = 30;
  const step = W / (points.length - 1);
  const pts = points.map((p, i) => `${(i * step).toFixed(1)},${(H - 4 - ((p - min) / range) * (H - 8)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill={color} opacity="0.13" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HBarList({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className="font-mono font-semibold text-ink tnum">{r.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-raise">
            <div
              className="h-full rounded-full bg-volt transition-all duration-700"
              style={{ width: `${(r.value / max) * 100}%`, opacity: 1 - i * 0.12 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
