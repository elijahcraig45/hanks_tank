import React, { useMemo, useState } from 'react';
import {
  fmtNum, fmtPct, fmtRange, hasDist,
} from '../../utils/unifiedPredictions';
import RangeBar, { RangeAxis, RangeLegend, sharedDomain } from './RangeBar';
import DistTerm from './DistTerm';
import { marginText } from './ModelRows';

/**
 * The simulation detail for one game: expected score per team with its range, the total
 * and margin distributions, and the probabilities the simulator implies. The same numbers
 * are always printed as a table beneath the chart, so nothing depends on reading a bar.
 */

function StatLine({ d }) {
  if (!d) return <span className="up-statline">—</span>;
  return (
    <span className="up-statline">
      <strong>{fmtNum(d.mean, 1)}</strong>
      {d.p50 != null && <> · <DistTerm term="median">median</DistTerm> {d.p50}</>}
      {d.p05 != null && <> · <DistTerm term="range90">90%</DistTerm> {fmtRange(d)}</>}
    </span>
  );
}

function BarRow({ label, d, domain, unit, zeroLine }) {
  return (
    <div className="up-barrow">
      <div className="up-barrow-head">
        <span className="up-barrow-label">{label}</span>
        <StatLine d={d} />
      </div>
      <RangeBar dist={d} domain={domain} label={label} unit={unit} zeroLine={zeroLine} />
    </div>
  );
}

function SummaryTable({ rows, caption }) {
  const cols = [['mean', 'Mean'], ['p50', 'Median'], ['p05', 'p05'], ['p25', 'p25'], ['p75', 'p75'], ['p95', 'p95'], ['min', 'Min'], ['max', 'Max']];
  return (
    <div className="up-scroll">
      <table className="up-table up-table--compact">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Quantity</th>
            {cols.map(([k, l]) => <th key={k} scope="col" className="num">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.filter((r) => r.d).map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {cols.map(([k]) => (
                <td key={k} className="num mono">{k === 'mean' ? fmtNum(r.d[k], 2) : (r.d[k] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverLines({ byLine, unit }) {
  const lines = Object.entries(byLine || {})
    .map(([l, p]) => [Number(l), p])
    .filter(([l, p]) => Number.isFinite(l) && p != null)
    .sort((a, b) => a[0] - b[0]);
  if (!lines.length) return null;
  return (
    <div className="up-scroll">
      <table className="up-table up-table--compact up-overs">
        <caption>Over / under by total line ({unit})</caption>
        <thead>
          <tr><th scope="col">Line</th><th scope="col" className="num">P(over)</th><th scope="col" className="num">P(under)</th></tr>
        </thead>
        <tbody>
          {lines.map(([l, p]) => (
            <tr key={l}>
              <th scope="row" className="mono">{l.toFixed(1)}</th>
              <td className="num mono">
                <span className="up-inline-bar" style={{ '--w': `${Math.round(p * 100)}%` }} aria-hidden="true" />
                {fmtPct(p)}
              </td>
              <td className="num mono">{fmtPct(1 - p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** P(margin = k) for k in −21..21, with the NFL key numbers 3 and 7 called out. */
/** Bars cover this window; the key numbers (3, 7) sit well inside it. */
const MARGIN_WINDOW = 21;

/**
 * Split a stored margin pmf into the bars inside +/-MARGIN_WINDOW and the mass beyond it.
 * Rows written since 2026-09-28 hold every margin in -60..60 plus the tail buckets
 * "<=-61" and ">=61" and sum to 1. Older rows hold -21..21 only: their mass beyond the
 * window was never stored, so `beyond` is null (unknown), not 0.
 */
export function splitMarginExact(exact) {
  let away = 0; let home = 0; let stored = false;
  const entries = [];
  Object.entries(exact || {}).forEach(([key, raw]) => {
    const p = Number(raw);
    if (!Number.isFinite(p)) return;
    const tail = /^(<=|>=)\s*(-?\d+)$/.exec(String(key).trim());
    if (tail) {
      stored = true;
      if (tail[1] === '<=') away += p; else home += p;
      return;
    }
    const k = Number(key);
    if (!Number.isFinite(k)) return;
    if (k < -MARGIN_WINDOW) { away += p; stored = true; } else if (k > MARGIN_WINDOW) { home += p; stored = true; } else entries.push([k, p]);
  });
  entries.sort((a, b) => a[0] - b[0]);
  return { entries, beyond: stored ? { away, home } : null };
}

export function MarginExact({ exact, game }) {
  const { entries, beyond } = splitMarginExact(exact);
  if (!entries.length) return null;
  const get = (k) => entries.find(([x]) => x === k)?.[1] ?? null;
  const top = Math.max(...entries.map(([, p]) => p), 1e-9);
  const keys = [3, 7];
  return (
    <section className="up-sub" aria-labelledby={`me-${game.game_id}`}>
      <h4 id={`me-${game.game_id}`}>Exact margins · key numbers</h4>
      <div className="up-keynums">
        {keys.map((k) => (
          <React.Fragment key={k}>
            <div className="up-keynum"><span>{game.home.abbr} by exactly {k}</span><strong>{fmtPct(get(k), 1)}</strong></div>
            <div className="up-keynum"><span>{game.away.abbr} by exactly {k}</span><strong>{fmtPct(get(-k), 1)}</strong></div>
          </React.Fragment>
        ))}
      </div>
      <div
        className="up-pmf"
        role="img"
        aria-label={`Probability of each exact final margin from ${game.away.abbr} by ${MARGIN_WINDOW} to ${game.home.abbr} by ${MARGIN_WINDOW}. Key numbers: ${keys.map((k) => `home by ${k} ${fmtPct(get(k), 1)}, away by ${k} ${fmtPct(get(-k), 1)}`).join('; ')}`}
      >
        {entries.map(([k, p]) => (
          <span
            key={k}
            className={`up-pmf-bar${keys.includes(Math.abs(k)) ? ' is-key' : ''}${k === 0 ? ' is-zero' : ''}`}
            style={{ height: `${Math.max(2, (p / top) * 100)}%` }}
            title={`${k === 0 ? 'Tie' : k > 0 ? `${game.home.abbr} by ${k}` : `${game.away.abbr} by ${-k}`}: ${fmtPct(p, 1)}`}
          />
        ))}
      </div>
      <div className="up-pmf-axis" aria-hidden="true">
        <span>{game.away.abbr} by {MARGIN_WINDOW}</span><span>0</span><span>{game.home.abbr} by {MARGIN_WINDOW}</span>
      </div>
      {beyond ? (
        <p className="up-pmf-beyond" data-testid="margin-beyond">
          {game.away.abbr} by {MARGIN_WINDOW + 1}+: {fmtPct(beyond.away, 1)} · {game.home.abbr} by {MARGIN_WINDOW + 1}+: {fmtPct(beyond.home, 1)}
        </p>
      ) : (
        <p className="up-pmf-beyond" data-testid="margin-beyond">
          Margins beyond {MARGIN_WINDOW} were not stored for this prediction.
        </p>
      )}
    </section>
  );
}

export default function SimDetail({ game, sport, models, initialModel }) {
  const simModels = useMemo(
    () => (models || []).filter((m) => hasDist(game.predictions?.[m.key])),
    [models, game],
  );
  const [key, setKey] = useState(
    simModels.some((m) => m.key === initialModel) ? initialModel : simModels[0]?.key,
  );
  if (!simModels.length) {
    return (
      <p className="up-empty">
        No simulation distribution for this game. {sport === 'mlb'
          ? 'The simulator writes its distributions shortly before the start, once lineups are known.'
          : 'The drive simulator writes its distributions before kickoff; games that kicked off before it ran have none.'}
      </p>
    );
  }
  const pred = game.predictions[key];
  const model = simModels.find((m) => m.key === key) || simModels[0];
  const unit = sport === 'mlb' ? 'runs' : 'points';
  const x = pred.extras || {};
  const scoreDomain = sharedDomain([pred.home_score, pred.away_score]);
  const marginDomain = sharedDomain([pred.margin], { includeZero: true });
  const totalDomain = sharedDomain([pred.total]);
  const marginMean = pred.margin?.mean;
  const exact = x.margin_exact || pred.margin_exact;

  return (
    <div className="up-sim" data-testid="sim-detail">
      {simModels.length > 1 && (
        <div className="up-tabs" role="tablist" aria-label="Simulation model">
          {simModels.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={m.key === key}
              className={m.key === key ? 'is-on' : ''} onClick={() => setKey(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      <p className="up-sim-meta">
        {model.label} · {pred.home_score?.n ? `${pred.home_score.n.toLocaleString()} simulated games` : 'simulated'}
        {pred.predicted_at && <> · written {new Date(pred.predicted_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>}
        {pred.pregame === false && <span className="up-flag up-flag--late"> after start · not scored</span>}
      </p>
      <RangeLegend />

      <section className="up-sub" aria-label="Expected score">
        <h4>Expected score <small>({unit})</small></h4>
        <BarRow label={game.away.abbr} d={pred.away_score} domain={scoreDomain} unit={unit} />
        <BarRow label={game.home.abbr} d={pred.home_score} domain={scoreDomain} unit={unit} />
        <RangeAxis domain={scoreDomain} />
      </section>

      <div className="up-sim-grid">
        <section className="up-sub" aria-label="Total">
          <h4>Total {unit}</h4>
          <BarRow label="Total" d={pred.total} domain={totalDomain} unit={unit} />
          <RangeAxis domain={totalDomain} />
        </section>
        <section className="up-sub" aria-label="Margin">
          <h4>Margin <small>({game.home.abbr} minus {game.away.abbr})</small></h4>
          <BarRow label={marginMean != null ? marginText(marginMean, game) : 'Margin'} d={pred.margin} domain={marginDomain} unit={unit} zeroLine />
          <RangeAxis domain={marginDomain} format={(v) => (v > 0 ? `+${v}` : v)} />
        </section>
      </div>

      <section className="up-sub" aria-label="Probabilities">
        <h4>Probabilities</h4>
        <dl className="up-probs">
          <div><dt>{game.home.abbr} win</dt><dd>{fmtPct(pred.home_win_prob, 1)}</dd></div>
          {x.p_extra_innings != null && <div><dt>Extra innings</dt><dd>{fmtPct(x.p_extra_innings, 1)}</dd></div>}
          {x.p_ot != null && <div><dt>Overtime</dt><dd>{fmtPct(x.p_ot, 1)}</dd></div>}
          {x.p_home_cover_rl != null && <div><dt>{game.home.abbr} −1.5 (run line)</dt><dd>{fmtPct(x.p_home_cover_rl, 1)}</dd></div>}
          {x.p_home_cover != null && (
            <div><dt>{game.home.abbr} covers{x.spread_line != null ? ` ${x.spread_line > 0 ? '+' : ''}${x.spread_line}` : ''}</dt><dd>{fmtPct(x.p_home_cover, 1)}</dd></div>
          )}
        </dl>
        <OverLines byLine={x.p_over_by_line} unit={unit} />
      </section>

      {exact && <MarginExact exact={exact} game={game} />}

      <SummaryTable
        caption={`${model.label}: every percentile (${unit})`}
        rows={[
          { label: `${game.away.abbr} score`, d: pred.away_score },
          { label: `${game.home.abbr} score`, d: pred.home_score },
          { label: 'Total', d: pred.total },
          { label: 'Margin (home − away)', d: pred.margin },
        ]}
      />
    </div>
  );
}
