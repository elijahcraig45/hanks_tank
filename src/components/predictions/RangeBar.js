import React from 'react';
import { fmtNum } from '../../utils/unifiedPredictions';

/**
 * One distribution on one horizontal axis:
 *
 *   min ├──────[ ░░░░░ ████▌███ ░░░░░ ]──────┤ max
 *        p05 …… p25 ── median ── p75 …… p95
 *
 * whiskers = min/max, light box = 90% range (p05–p95), solid box = middle 50%, the tick
 * is the median and the ring the mean. Several bars that share `domain` are directly
 * comparable. The marks use the accent and text tokens, so both themes get their own
 * steps rather than an inverted copy; values are always also printed as text beside it.
 */

export function scalePct(v, [lo, hi]) {
  if (v == null || !Number.isFinite(v) || hi === lo) return null;
  return Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
}

/** A shared axis for a set of Dists, padded to whole numbers, always including 0 when asked. */
export function sharedDomain(dists, { includeZero = false, pad = 0.5 } = {}) {
  const vals = [];
  dists.filter(Boolean).forEach((d) => {
    ['min', 'max', 'p05', 'p95', 'mean'].forEach((k) => { if (d[k] != null && Number.isFinite(d[k])) vals.push(d[k]); });
  });
  if (includeZero) vals.push(0);
  if (!vals.length) return [0, 1];
  const min = Math.min(...vals);
  // Counts (runs, points) never go below zero, so neither does their axis.
  let lo = min >= 0 ? Math.max(0, Math.floor(min - pad)) : Math.floor(min - pad);
  let hi = Math.ceil(Math.max(...vals) + pad);
  if (lo === hi) { lo -= 1; hi += 1; }
  return [lo, hi];
}

export function describeDist(d, unit = '') {
  if (!d) return 'No distribution';
  const u = unit ? ` ${unit}` : '';
  const parts = [];
  if (d.mean != null) parts.push(`mean ${fmtNum(d.mean, 1)}${u}`);
  if (d.p50 != null) parts.push(`median ${d.p50}`);
  if (d.p05 != null && d.p95 != null) parts.push(`90% range ${d.p05} to ${d.p95}`);
  if (d.p25 != null && d.p75 != null) parts.push(`middle 50% ${d.p25} to ${d.p75}`);
  if (d.min != null && d.max != null) parts.push(`min ${d.min}, max ${d.max}`);
  return parts.join(', ');
}

export default function RangeBar({ dist, domain, label, unit = '', zeroLine = false, height = 30 }) {
  if (!dist) return null;
  const dom = domain || sharedDomain([dist], { includeZero: zeroLine });
  const x = (v) => scalePct(v, dom);
  const mid = height / 2;
  const box = 12;
  const p05 = x(dist.p05); const p95 = x(dist.p95);
  const p25 = x(dist.p25); const p75 = x(dist.p75);
  const med = x(dist.p50); const mean = x(dist.mean);
  const lo = x(dist.min); const hi = x(dist.max);
  const zero = zeroLine ? x(0) : null;
  const pct = (v) => `${v}%`;
  const title = `${label ? `${label}: ` : ''}${describeDist(dist, unit)}`;

  return (
    <svg
      className="up-range"
      width="100%"
      height={height}
      role="img"
      aria-label={title}
      data-testid="range-bar"
    >
      <title>{title}</title>
      {zero != null && (
        <line className="up-range-zero" x1={pct(zero)} x2={pct(zero)} y1={2} y2={height - 2} />
      )}
      {lo != null && hi != null && (
        <g className="up-range-whisker" data-part="whisker">
          <line x1={pct(lo)} x2={pct(hi)} y1={mid} y2={mid} />
          <line x1={pct(lo)} x2={pct(lo)} y1={mid - 5} y2={mid + 5} />
          <line x1={pct(hi)} x2={pct(hi)} y1={mid - 5} y2={mid + 5} />
          <title>{`Min ${dist.min} · max ${dist.max}`}</title>
        </g>
      )}
      {p05 != null && p95 != null && (
        <rect
          className="up-range-90" data-part="p90"
          x={pct(p05)} width={pct(Math.max(0.6, p95 - p05))} y={mid - box / 2} height={box} rx={3}
        >
          <title>{`90% range ${dist.p05}–${dist.p95}`}</title>
        </rect>
      )}
      {p25 != null && p75 != null && (
        <rect
          className="up-range-50" data-part="iqr"
          x={pct(p25)} width={pct(Math.max(0.6, p75 - p25))} y={mid - box / 2} height={box} rx={2}
        >
          <title>{`Middle 50% ${dist.p25}–${dist.p75}`}</title>
        </rect>
      )}
      {med != null && (
        <g data-part="median">
          <line className="up-range-median-ring" x1={pct(med)} x2={pct(med)} y1={mid - 9} y2={mid + 9} />
          <line className="up-range-median" x1={pct(med)} x2={pct(med)} y1={mid - 9} y2={mid + 9} />
          <title>{`Median ${dist.p50}`}</title>
        </g>
      )}
      {mean != null && (
        <circle className="up-range-mean" data-part="mean" cx={pct(mean)} cy={mid} r={3.5}>
          <title>{`Mean ${fmtNum(dist.mean, 2)}`}</title>
        </circle>
      )}
    </svg>
  );
}

/** Tick labels under one or more RangeBars that share `domain`. */
/** Round tick values (1, 2, 5 × 10ⁿ apart) inside `domain`. */
export function niceTicks([lo, hi], target = 5) {
  const span = Math.max(1, hi - lo);
  const raw = span / Math.max(1, target - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/** Tick labels under one or more RangeBars that share `domain`. */
export function RangeAxis({ domain, ticks = 5, format = (v) => v }) {
  return (
    <div className="up-axis" aria-hidden="true">
      {niceTicks(domain, ticks).map((v) => (
        <span key={v} className="up-axis-tick" style={{ left: `${scalePct(v, domain)}%` }}>{format(v)}</span>
      ))}
    </div>
  );
}

/** The legend for the marks, shown once per panel. */
export function RangeLegend() {
  return (
    <div className="up-range-legend" aria-hidden="true">
      <span><i className="k k-whisk" /> min–max</span>
      <span><i className="k k-90" /> 90% range</span>
      <span><i className="k k-50" /> middle 50%</span>
      <span><i className="k k-med" /> median</span>
      <span><i className="k k-mean" /> mean</span>
    </div>
  );
}
