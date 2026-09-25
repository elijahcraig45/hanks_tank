import React, { useState } from 'react';
import { pct } from './format';

/**
 * Reliability chart for one model: each dot is a bin of games, placed at the model's
 * average predicted home-win probability (x) and how often the home team actually won
 * (y). On the diagonal = calibrated. The whisker is the 95% interval on the observed
 * rate; dot area follows the bin's game count.
 *
 * One model per chart (small multiples), so no chart needs a categorical palette and
 * the axes are shared: every chart uses the same domain, which makes them comparable.
 */

const W = 220;
const H = 200;
const PAD = { l: 34, r: 10, t: 10, b: 30 };

export default function CalibrationChart({ bins = [], title, domain = [0, 1], subtitle }) {
  const [hover, setHover] = useState(null);
  const [lo, hi] = domain;
  const x = (p) => PAD.l + ((p - lo) / (hi - lo)) * (W - PAD.l - PAD.r);
  const y = (p) => H - PAD.b - ((p - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const clampP = (p) => Math.min(hi, Math.max(lo, p));
  const maxN = Math.max(1, ...bins.map((b) => b.n));
  const ticks = [];
  const step = hi - lo > 0.5 ? 0.25 : 0.1;
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  const total = bins.reduce((s, b) => s + b.n, 0);
  const active = hover != null ? bins[hover] : null;

  return (
    <figure className="mdl-cal">
      <figcaption className="mdl-cal-title">
        <strong>{title}</strong>
        <span>{subtitle || (total ? `${total.toLocaleString()} games` : 'no scored games')}</span>
      </figcaption>
      {bins.length ? (
        <div className="mdl-cal-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} reliability chart`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="mdl-grid" x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} />
                <line className="mdl-grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
                <text className="mdl-tick" x={x(t)} y={H - PAD.b + 13} textAnchor="middle">{Math.round(t * 100)}</text>
                <text className="mdl-tick" x={PAD.l - 5} y={y(t) + 3} textAnchor="end">{Math.round(t * 100)}</text>
              </g>
            ))}
            <line className="mdl-diag" x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} />
            {bins.map((b, i) => {
              const r = 4 + 5 * Math.sqrt(b.n / maxN);
              return (
                <g key={i}>
                  <line className="mdl-whisker" x1={x(clampP(b.p))} x2={x(clampP(b.p))}
                    y1={y(clampP(b.y_lo))} y2={y(clampP(b.y_hi))} />
                  <circle className={`mdl-dot ${hover === i ? 'is-hover' : ''}`}
                    cx={x(clampP(b.p))} cy={y(clampP(b.y))} r={r} />
                  <circle className="mdl-hit" cx={x(clampP(b.p))} cy={y(clampP(b.y))} r={Math.max(12, r + 4)}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
                    <title>{`Predicted ${pct(b.p)} · actual ${pct(b.y)} · ${b.n} games`}</title>
                  </circle>
                </g>
              );
            })}
            <text className="mdl-axis" x={(PAD.l + W - PAD.r) / 2} y={H - 3} textAnchor="middle">predicted home win %</text>
            <text className="mdl-axis" transform={`translate(10 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle">actual %</text>
          </svg>
          <p className="mdl-cal-read" aria-live="polite">
            {active
              ? `Predicted ${pct(active.p)} → home won ${pct(active.y)} (95%: ${pct(active.y_lo, 0)}–${pct(active.y_hi, 0)}), ${active.n} games`
              : 'On the dashed line = calibrated. Hover a dot.'}
          </p>
        </div>
      ) : <p className="mdl-empty">Nothing scored yet.</p>}
    </figure>
  );
}

/** Shared x/y domain for a set of charts, padded, so small multiples line up. */
export function sharedDomain(binSets) {
  const vals = binSets.flat().flatMap((b) => [b.p, b.y_lo, b.y_hi]).filter(Number.isFinite);
  if (!vals.length) return [0, 1];
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.02) * 10) / 10);
  const hi = Math.min(1, Math.ceil((Math.max(...vals) + 0.02) * 10) / 10);
  return hi - lo < 0.3 ? [Math.max(0, lo - 0.1), Math.min(1, hi + 0.1)] : [lo, hi];
}
