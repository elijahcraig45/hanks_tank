import React from 'react';
import { fmtPct } from './simFormat';

/**
 * A row-sized sparkline of a wins distribution: one bar per win total, heights relative
 * to the most likely total. Decorative in the table (the numbers sit beside it), so it
 * carries a text summary for screen readers rather than one label per bar.
 */
export function MiniDist({ dist, p10, p90 }) {
  if (!dist?.length) return <span className="ssim-faint">—</span>;
  const max = Math.max(...dist, 1e-9);
  const summary = p10 != null && p90 != null
    ? `80% range ${Math.round(p10)} to ${Math.round(p90)} wins`
    : 'wins distribution';
  return (
    <span className="ssim-mini" role="img" aria-label={summary} title={summary}>
      {dist.map((p, k) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={k}
          className="ssim-mini-bar"
          style={{ height: `${Math.max(p > 0 ? 8 : 0, (p / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}

/**
 * A labelled column chart for the drill-down: wins distribution or seed distribution.
 * `labels[k]` names column k; `highlight` marks columns (e.g. the p10–p90 range).
 */
export function ColumnChart({ values, labels, highlight, caption, testId }) {
  if (!values?.length) return <p className="ssim-faint">No distribution in this run.</p>;
  const max = Math.max(...values, 1e-9);
  return (
    <figure className="ssim-chart" data-testid={testId}>
      <div className="ssim-chart-plot" role="list">
        {values.map((p, k) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={k}
            className={`ssim-chart-col${highlight?.(k) ? ' ssim-chart-col--hi' : ''}`}
            role="listitem"
            aria-label={`${labels[k]}: ${fmtPct(p)}`}
            title={`${labels[k]}: ${fmtPct(p)}`}
          >
            <span className="ssim-chart-val">{p >= 0.05 ? Math.round(p * 100) : ''}</span>
            <span className="ssim-chart-bar" style={{ height: `${(p / max) * 100}%` }} />
            <span className="ssim-chart-x">{labels[k]}</span>
          </div>
        ))}
      </div>
      {caption && <figcaption className="ssim-chart-cap">{caption}</figcaption>}
    </figure>
  );
}

/** Horizontal probability bar with its number, for the round-by-round list. */
export function ProbBar({ p }) {
  const w = Number.isFinite(Number(p)) ? Math.max(0, Math.min(1, Number(p))) : 0;
  return (
    <span className="ssim-pbar">
      <span className="ssim-pbar-track"><span className="ssim-pbar-fill" style={{ width: `${w * 100}%` }} /></span>
      <span className="ssim-pbar-num">{fmtPct(p)}</span>
    </span>
  );
}
