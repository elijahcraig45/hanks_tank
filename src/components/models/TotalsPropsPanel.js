import React, { useEffect, useState } from 'react';
import ApiService from '../../services/api';
import { formatTime, num, pct } from './format';

/**
 * MLB "Totals & props": what the plate-appearance simulator is actually good at.
 *
 * On winners the simulator only ties team strength. Its measured value is in whole
 * distributions: the total-runs shape (re-centred on the market total where a line
 * exists) and starter strikeouts. Batter props are NOT shown — the sim over-predicts
 * P(at least one hit) (64.5% vs 60.8%) because it models no substitutions — and the
 * backend never serves them until they are calibrated.
 */

function Pmf({ pmf, max = 16, label }) {
  const vals = pmf.slice(0, max + 1);
  const top = Math.max(...vals, 1e-9);
  return (
    <div className="mdl-pmf" role="img" aria-label={label}>
      {vals.map((p, k) => (
        <span key={k} className="mdl-pmf-bar" style={{ height: `${Math.max(2, (p / top) * 100)}%` }}
          title={`${k}: ${pct(p, 1)}`} />
      ))}
    </div>
  );
}

function Backtest({ bt }) {
  if (!bt) return null;
  const t = bt.totals; const k = bt.starter_k; const b = bt.batter_hit;
  return (
    <div className="mdl-backtest mdl-props-bt">
      <div className="mdl-bt-flag">Backtest · stored research results</div>
      <ul className="mdl-record">
        {t && (
          <li>
            <strong>Run totals ({t.label.replace('Run totals, ', '')}, n = {t.n.toLocaleString()}):</strong>{' '}
            the simulator&rsquo;s distribution shape, re-centred on the market total, scores log score{' '}
            {num(t.log_score.sim_shape_at_market_mean, 4)} vs the market&rsquo;s own {num(t.log_score.market_nb, 4)}{' '}
            (gain {num(t.gain_sim_shape_at_market_mean[0], 4)}, 95% {num(t.gain_sim_shape_at_market_mean[1], 4)} to{' '}
            {num(t.gain_sim_shape_at_market_mean[2], 4)}). Raw simulated totals run hot:{' '}
            {Object.entries(t.raw_bias_runs).map(([y, v]) => `${y} ${v > 0 ? '+' : ''}${v}`).join(', ')} runs a game.
          </li>
        )}
        {k && (
          <li>
            <strong>Starter strikeouts ({k.n.toLocaleString()} starts):</strong> CRPS {k.crps.sim} vs {k.crps.baseline}{' '}
            for a Poisson baseline built from the starter&rsquo;s trailing-year K rate and expected batters faced (lower is better); mean absolute error {k.mae.sim} vs {k.mae.baseline}.
          </li>
        )}
        {b && (
          <li>
            <strong>Batter props — not shown.</strong> P(at least one hit) predicted {pct(b.mean_predicted)} vs{' '}
            {pct(b.actual_rate)} actual over {b.n.toLocaleString()} batter-games: over-predicted, because the sim
            plays every starter the full game. Experimental until calibrated.
          </li>
        )}
      </ul>
    </div>
  );
}

export default function TotalsPropsPanel({ date }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    ApiService.getMlbTotalsProps(date)
      .then((data) => { if (!cancelled) setState({ loading: false, data, error: null }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, data: null, error: e.message }); });
    return () => { cancelled = true; };
  }, [date]);
  const { data, loading, error } = state;

  return (
    <section className="mdl-section" aria-labelledby="mdl-props-h">
      <div className="mdl-section-head">
        <h2 id="mdl-props-h">Totals &amp; props · PA simulator</h2>
        <span className="mdl-role mdl-role--shadow">Shadow</span>
      </div>
      <p className="mdl-note">
        On winners the simulator only ties a team-strength model; its measured value is in full
        distributions — how many runs a game will have, and how many batters a starter strikes out.
      </p>
      {loading && <p className="mdl-empty">Loading…</p>}
      {error && <p className="mdl-warn">Could not load totals: {error}</p>}
      {data && !data.available && <p className="mdl-warn">{data.note}</p>}
      {data?.available && data.games.length === 0 && <p className="mdl-empty">No simulated games for {data.date}.</p>}
      {data?.available && data.games.length > 0 && (
        <div className="mdl-props-grid">
          {data.games.map((g) => (
            <article key={g.game_pk} className="mdl-prop">
              <header>
                <strong>{g.away_team_name} @ {g.home_team_name}</strong>
                <span>{g.game_time_utc ? `${formatTime(g.game_time_utc)} ET` : ''}</span>
              </header>
              <div className="mdl-prop-total">
                <span className="mdl-metric-v">{num(g.mean_total_runs, 1)}</span>
                <span className="mdl-meta">expected runs{g.totals_calibrated ? ' (bias-corrected)' : ' (raw — runs hot)'}</span>
              </div>
              <Pmf pmf={g.total_runs_pmf} label={`Total runs distribution, ${g.away_team_name} at ${g.home_team_name}`} />
              <p className="mdl-meta">
                Over 7.5 {pct(g.p_over['7.5'], 0)} · 8.5 {pct(g.p_over['8.5'], 0)} · 9.5 {pct(g.p_over['9.5'], 0)}
                {g.market_total_line != null && <> · market {g.market_total_line}: over {pct(g.p_over_market, 0)}</>}
              </p>
              <ul className="mdl-prop-k">
                {g.starters.map((s) => (
                  <li key={s.side}>
                    <span>{s.name || `${s.side} starter`}</span>
                    <span className="mono">{num(s.k_mean, 1)} K</span>
                    <span className="mdl-meta">4.5+ {pct(s.p_over['4.5'], 0)} · 5.5+ {pct(s.p_over['5.5'], 0)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      <Backtest bt={data?.backtest} />
    </section>
  );
}
