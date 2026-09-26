import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../services/api';
import { SEASONS } from '../../config/constants';
import {
  MODEL_CARDS, MODEL_ORDER, ROLE_LABEL, SPORT_INTRO, shortName,
} from '../../config/modelRegistry';
import CalibrationChart, { sharedDomain } from './CalibrationChart';
import TotalsPropsPanel from './TotalsPropsPanel';
import { formatDate, formatTime, num, pct, signed, withCi } from './format';
import { predictionsPath } from '../../config/sports';
import '../styles/Models.css';

/**
 * The Models section: the live scoreboard for every serious model in one sport.
 *
 * Everything scored here was written strictly before first pitch or kickoff — the
 * backend enforces that (GET /api/models/:sport/compare) and this page says so up
 * front, because it is the difference between a record and a story. Live numbers and
 * the stored research backtest are kept in visibly separate boxes and never mixed.
 *
 * Props:
 *   sport     mlb | nfl | cfb
 *   division  fbs | fcs (cfb)
 *   season    the season to score (the parent owns the selector for football)
 *   embedded  true inside FootballPage, which already renders a page header
 */

const SMALL = 100;

const ROLE_SHORT = { benchmark: 'Benchmark', backtest: 'Backtest' };

function RoleBadge({ role, short = false }) {
  if (!role) return null;
  const label = (short && ROLE_SHORT[role]) || ROLE_LABEL[role] || role;
  return <span className={`mdl-role mdl-role--${role}`}>{label}</span>;
}

function Metric({ iv, kind }) {
  const { main, ci } = withCi(iv, kind);
  return (
    <span className="mdl-metric">
      <span className="mdl-metric-v">{main}</span>
      {ci && <span className="mdl-metric-ci">{ci}</span>}
    </span>
  );
}

/* ── Scoreboard ──────────────────────────────────────────────────────── */

function ScoreTable({ sport, rows, models, showSpread, showTotal, bestKey, caption }) {
  const status = Object.fromEntries((models || []).map((m) => [m.key, m]));
  return (
    <div className="mdl-table-wrap">
      <table className="mdl-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col" className="num">Games</th>
            <th scope="col" className="num">Log loss <small>lower is better</small></th>
            <th scope="col" className="num">Accuracy</th>
            <th scope="col" className="num">Brier</th>
            {showSpread && <th scope="col" className="num">Spread MAE</th>}
            {showTotal && <th scope="col" className="num">Total MAE</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = status[r.model] || {};
            const key = r.model || r.key;
            return (
              <tr key={key} className={key === bestKey ? 'is-best' : ''}>
                <th scope="row">
                  <span className="mdl-model-name">{shortName(sport, key)}</span>
                  <RoleBadge role={s.role || r.role} short />
                  {(r.small_sample || (r.n != null && r.n > 0 && r.n < SMALL)) && (
                    <span className="mdl-small" title={`Fewer than ${SMALL} games`}>small n</span>
                  )}
                </th>
                <td className="num mono">{(r.n ?? 0).toLocaleString()}</td>
                <td className="num"><Metric iv={r.log_loss} /></td>
                <td className="num"><Metric iv={r.accuracy} kind="pct" /></td>
                <td className="num"><Metric iv={r.brier} /></td>
                {showSpread && <td className="num"><Metric iv={r.spread_mae} kind="pts" /></td>}
                {showTotal && <td className="num"><Metric iv={r.total_mae} kind="pts" /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function bestOf(rows) {
  const scored = (rows || []).filter((r) => r.log_loss && (r.model ?? r.key) !== 'home_rate');
  if (!scored.length) return null;
  const best = scored.reduce((a, b) => (b.log_loss.value < a.log_loss.value ? b : a));
  return best.model ?? best.key;
}

function DeltaList({ sport, deltas, reference }) {
  if (!deltas?.length) return null;
  return (
    <ul className="mdl-deltas">
      {deltas.map((d) => {
        const g = d.log_loss_gain;
        const clear = g && (g.lo > 0 || g.hi < 0);
        const better = g && g.value > 0;
        return (
          <li key={d.model}>
            <strong>{shortName(sport, d.model)}</strong> vs {shortName(sport, d.reference || reference)}:{' '}
            <span className={`mdl-delta ${clear ? (better ? 'is-pos' : 'is-neg') : 'is-tie'}`}>
              {g ? signed(g.value) : '—'}
            </span>
            {g && <span className="mdl-metric-ci"> 95% {signed(g.lo)} to {signed(g.hi)}</span>}
            {d.p_better != null && <span className="mdl-pbetter"> · P(better) {pct(d.p_better, 0)}</span>}
            <span className="mdl-verdict">
              {' '}— {!g ? 'no shared games' : clear ? (better ? 'better, CI clear of zero' : 'worse, CI clear of zero') : 'a tie: the interval crosses zero'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function UnavailableList({ sport, models }) {
  const off = (models || []).filter((m) => !m.available);
  if (!off.length) return null;
  return (
    <ul className="mdl-off">
      {off.map((m) => (
        <li key={m.key}>
          <span className="mdl-model-name">{shortName(sport, m.key)}</span>
          <RoleBadge role={m.backtest_only ? 'backtest' : m.role} />
          <span className="mdl-off-note">{m.note || 'Not live yet.'}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Per-game rows ───────────────────────────────────────────────────── */

function GameRows({ sport, data, onWeek, onDate }) {
  const live = (data.models || []).filter((m) => m.available).map((m) => m.key);
  const order = MODEL_ORDER[sport].filter((k) => live.includes(k));
  const games = data.games || [];
  const w = data.window || {};
  const shift = (days) => {
    if (!w.to) return;
    const d = new Date(`${w.to}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    onDate(d.toISOString().slice(0, 10));
  };

  return (
    <section className="mdl-section" aria-labelledby="mdl-games-h">
      <div className="mdl-section-head">
        <h2 id="mdl-games-h">Game by game</h2>
        {w.kind === 'week' && (
          <label className="mdl-select">
            <span>Week</span>
            <select value={w.week ?? ''} onChange={(e) => onWeek(Number(e.target.value))}>
              {(w.weeks || []).map((wk) => <option key={wk} value={wk}>{wk}</option>)}
            </select>
          </label>
        )}
        {w.kind === 'dates' && (
          <div className="mdl-datenav">
            <button type="button" onClick={() => shift(-(w.days || 3))} disabled={!w.from || w.from <= w.first} aria-label="Earlier days">‹</button>
            <span>{w.from === w.to ? formatDate(w.to) : `${formatDate(w.from)} – ${formatDate(w.to)}`}</span>
            <button type="button" onClick={() => shift(w.days || 3)} disabled={!w.to || w.to >= w.last} aria-label="Later days">›</button>
          </div>
        )}
      </div>
      <p className="mdl-note">
        Each cell is that model&rsquo;s home-win probability. <mark className="mdl-split-key">Highlighted</mark>{' '}
        rows are games where the models pick different winners; a ✓ or ✗ marks a scored pick; Range is how far apart the models are.
        {' '}A cell marked <em>late</em> was written after the start and is never scored.
      </p>
      {games.length === 0 ? <p className="mdl-empty">No games in this window.</p> : (
        <div className="mdl-table-wrap">
          <table className="mdl-table mdl-games">
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col" className="num">Result</th>
                {order.map((k) => <th key={k} scope="col" className="num">{shortName(sport, k)}</th>)}
                <th scope="col" className="num" title="Highest minus lowest home-win probability across the models">Range</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const split = g.disagreement?.split_pick;
                return (
                  <tr key={g.game_id} className={split ? 'is-split' : ''}>
                    <th scope="row" className="mdl-game">
                      <span className="mdl-game-teams" title={`${g.away_team_name} at ${g.home_team_name}`}>
                        <span className="mdl-team">{g.away_team_name}</span>
                        <span className="at"> @ </span>
                        <span className="mdl-team">{g.home_team_name}</span>
                      </span>
                      <span className="mdl-game-when">{formatDate(g.date)}{g.start_time ? ` · ${formatTime(g.start_time)} ET` : ''}</span>
                    </th>
                    <td className="num mono">
                      {g.completed && g.home_score != null ? `${g.away_score}–${g.home_score}` : '—'}
                    </td>
                    {order.map((k) => {
                      const p = g.predictions?.[k];
                      if (!p) return <td key={k} className="num mdl-cell-none">—</td>;
                      const hit = g.home_won != null && p.pregame
                        ? ((p.home_win_probability > 0.5 ? 1 : 0) === g.home_won) : null;
                      return (
                        <td key={k} className={`num mdl-cell ${p.pregame ? '' : 'is-late'} ${hit === true ? 'is-hit' : hit === false ? 'is-miss' : ''}`}>
                          <span className="mono">{pct(p.home_win_probability, 0)}</span>
                          {hit != null && <span className="mdl-mark" aria-label={hit ? 'correct' : 'wrong'}>{hit ? '✓' : '✗'}</span>}
                          {!p.pregame && <span className="mdl-late">late</span>}
                        </td>
                      );
                    })}
                    <td className="num mono">{g.disagreement?.range != null ? pct(g.disagreement.range, 0) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Calibration ─────────────────────────────────────────────────────── */

function CalibrationGrid({ sport, calibration, keys, note }) {
  const sets = keys.map((k) => calibration?.[k] || []);
  const domain = sharedDomain(sets);
  return (
    <>
      {note && <p className="mdl-note">{note}</p>}
      <div className="mdl-cal-grid">
        {keys.map((k, i) => (
          <CalibrationChart key={k} title={shortName(sport, k)} bins={sets[i]} domain={domain} />
        ))}
      </div>
    </>
  );
}

/* ── Backtest ────────────────────────────────────────────────────────── */

function BacktestBox({ sport, backtest }) {
  const windows = backtest?.windows || [];
  const [idx, setIdx] = useState(0);
  if (!windows.length) return null;
  const w = windows[Math.min(idx, windows.length - 1)];
  const rows = w.models || [];
  const showSpread = rows.some((r) => r.spread_mae);
  const showTotal = rows.some((r) => r.total_mae);
  return (
    <section className="mdl-section mdl-backtest" aria-labelledby="mdl-bt-h">
      <div className="mdl-bt-flag">Backtest · stored research results · not live predictions</div>
      <div className="mdl-section-head">
        <h2 id="mdl-bt-h">Backtest</h2>
        <span className="mdl-meta">Exported {backtest.generated_at}</span>
      </div>
      {backtest.scope_note && <p className="mdl-warn">{backtest.scope_note}</p>}
      <div className="mdl-tabs" role="tablist" aria-label="Backtest window">
        {windows.map((x, i) => (
          <button key={x.key} type="button" role="tab" aria-selected={i === idx}
            className={i === idx ? 'is-on' : ''} onClick={() => setIdx(i)}>
            {x.label}
          </button>
        ))}
      </div>
      <p className="mdl-note">{w.note}</p>
      <ScoreTable
        sport={sport}
        rows={rows.map((r) => ({ ...r, model: r.key, role: r.key === 'market' ? 'benchmark' : undefined }))}
        showSpread={showSpread}
        showTotal={showTotal}
        bestKey={bestOf(rows.map((r) => ({ ...r, model: r.key })))}
        caption={`${w.label} — ${w.n.toLocaleString()} games, every model on the same games`}
      />
      {w.deltas?.length > 0 && (
        <>
          <h3 className="mdl-h3">Paired log-loss gain vs {shortName(sport, w.reference)} (positive = better)</h3>
          <DeltaList sport={sport} deltas={w.deltas} reference={w.reference} />
        </>
      )}
      <h3 className="mdl-h3">Calibration in this window</h3>
      <CalibrationGrid sport={sport} calibration={Object.fromEntries(rows.map((r) => [r.key, r.calibration]))}
        keys={rows.filter((r) => r.key !== 'home_rate').map((r) => r.key)} />
      <p className="mdl-source"><strong>Source:</strong> {w.source}. CIs resample whole {w.block === 'd' ? 'days' : 'weeks'}.</p>
    </section>
  );
}

/* ── Model cards ─────────────────────────────────────────────────────── */

function liveLine(sport, key, data) {
  const r = data?.scoreboard?.per_model?.find((x) => x.model === key);
  if (!r || !r.n) return null;
  return `Live ${data.season}: ${r.n.toLocaleString()} games, log loss ${num(r.log_loss?.value)}, `
    + `accuracy ${pct(r.accuracy?.value)}${r.n < SMALL ? ' (small sample)' : ''}.`;
}

function ModelCard({ sport, k, data }) {
  const c = MODEL_CARDS[sport][k];
  if (!c) return null;
  const live = liveLine(sport, k, data);
  return (
    <article className="mdl-card" id={`model-${k}`}>
      <header>
        <h3>{c.name}</h3>
        <RoleBadge role={c.status} />
      </header>
      <p className="mdl-card-role">{c.role}</p>
      <p>{c.what}</p>
      <h4>Inputs</h4>
      <ul>{c.inputs.map((x) => <li key={x}>{x}</li>)}</ul>
      <h4>From inputs to a probability</h4>
      <p>{c.how}</p>
      <h4>Measured record</h4>
      <ul className="mdl-record">
        {live && <li><span className="mdl-tag">live</span>{live}</li>}
        {c.record?.live && <li><span className="mdl-tag">{live ? 'measured' : 'live'}</span>{c.record.live}</li>}
        {c.record?.backtest && <li><span className="mdl-tag mdl-tag--bt">backtest</span>{c.record.backtest}</li>}
      </ul>
      <div className="mdl-card-cols">
        <div>
          <h4>Strengths</h4>
          <ul>{(c.strengths || []).map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div>
          <h4>Weaknesses</h4>
          <ul>{(c.weaknesses || []).map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
      {c.caveats?.length > 0 && (
        <>
          <h4>Caveats</h4>
          <ul>{c.caveats.map((x) => <li key={x}>{x}</li>)}</ul>
        </>
      )}
      <p className="mdl-learn">
        How it works →{' '}
        {c.learn.map((l, i) => (
          <React.Fragment key={l.href}>{i > 0 && ' · '}<a href={l.href}>{l.label}</a></React.Fragment>
        ))}
      </p>
    </article>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function ModelsPage({
  sport, division = null, season = SEASONS.DEFAULT, embedded = false,
}) {
  const [week, setWeek] = useState(null);
  const [date, setDate] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => { setWeek(null); setDate(null); }, [sport, division, season]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    ApiService.getModelsCompare(sport, { season, division, week, date })
      .then((data) => { if (!cancelled) setState({ loading: false, error: null, data }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, error: e.message, data: null }); });
    return () => { cancelled = true; };
  }, [sport, division, season, week, date]);

  const { data, loading, error } = state;
  const sb = data?.scoreboard;
  const liveKeys = useMemo(() => (data?.models || []).filter((m) => m.available).map((m) => m.key), [data]);
  const ordered = (rows) => [...(rows || [])].sort(
    (a, b) => MODEL_ORDER[sport].indexOf(a.model) - MODEL_ORDER[sport].indexOf(b.model),
  );
  const perModel = ordered(sb?.per_model);
  const h2h = sb?.head_to_head;
  const showSpread = sport !== 'mlb';
  const showTotal = sport === 'mlb' && perModel.some((r) => r.total_mae);
  const anySmall = perModel.some((r) => r.n > 0 && r.n < SMALL) || (h2h && h2h.games > 0 && h2h.games < SMALL);

  return (
    <div className={`mdl-page${embedded ? ' mdl-page--embedded' : ''}`} data-sport={sport}>
      {!embedded && (
        <header className="ht-page-head">
          <div className="ht-page-head-inner">
            <div>
              <p className="ht-eyebrow">MLB · Models</p>
              <h1>Model scoreboard</h1>
              <p className="ht-page-sub">{SPORT_INTRO[sport]}</p>
            </div>
            <nav className="mdl-subnav" aria-label="More MLB model pages">
              <Link to="/mlb/models/diagnostics">Prediction diagnostics</Link>
              <Link to="/mlb/models/scenario-simulator">Scenario simulator</Link>
            </nav>
          </div>
        </header>
      )}

      <div className="mdl-body">
        {embedded && <p className="mdl-intro">{SPORT_INTRO[sport]}</p>}

        <Link to={predictionsPath(sport, division)} className="mdl-picks-link">
          <span>
            <strong>See every model&rsquo;s picks for {sport === 'mlb' ? 'today' : 'this week'}</strong>
            <span className="mdl-picks-sub">
              Each game with every model side by side{sport === 'cfb' ? '' : ', simulated scores with their ranges'} and CSV export
            </span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>

        <div className="mdl-rule" role="note">
          <strong>How this is scored.</strong> Only predictions written strictly before first pitch or
          kickoff count — the latest such row per game. Every model is also scored on the same games
          in the head-to-head. Intervals are 95% bootstrap CIs over whole {sport === 'mlb' ? 'days' : 'weeks'}.
          {' '}The market is the benchmark to beat{sport === 'mlb' ? '' : '; ESPN FPI is shown for context, not as a target'}.
        </div>

        {loading && !data && <p className="mdl-empty">Loading the scoreboard…</p>}
        {error && <p className="mdl-warn">Could not load the live scoreboard: {error}</p>}
        {!loading && !error && !data && <p className="mdl-empty">No predictions for this season yet.</p>}

        {data && (
          <>
            <section className="mdl-section" aria-labelledby="mdl-live-h">
              <div className="mdl-section-head">
                <h2 id="mdl-live-h">Live scoreboard · {data.season}</h2>
                <span className="mdl-meta">{liveKeys.length} live model{liveKeys.length === 1 ? '' : 's'}</span>
              </div>
              {anySmall && (
                <p className="mdl-warn" role="status">
                  Small sample: some models have fewer than {SMALL} scored games. Treat those numbers as
                  noise until the intervals narrow.
                </p>
              )}
              {perModel.some((r) => r.n > 0) ? (
                <ScoreTable
                  sport={sport}
                  rows={perModel.filter((r) => r.n > 0)}
                  models={data.models}
                  showSpread={showSpread}
                  showTotal={showTotal}
                  bestKey={bestOf(perModel)}
                  caption="Every pregame prediction each model has (samples differ — see head-to-head)"
                />
              ) : <p className="mdl-empty">Nothing scored yet this season.</p>}
              <UnavailableList sport={sport} models={data.models} />
            </section>

            {h2h && h2h.models.length > 1 && (
              <section className="mdl-section" aria-labelledby="mdl-h2h-h">
                <div className="mdl-section-head">
                  <h2 id="mdl-h2h-h">Head to head · same {h2h.games.toLocaleString()} games</h2>
                </div>
                <ScoreTable
                  sport={sport}
                  rows={ordered(h2h.rows)}
                  models={data.models}
                  showSpread={showSpread}
                  showTotal={showTotal}
                  bestKey={bestOf(h2h.rows)}
                />
                <h3 className="mdl-h3">Log-loss gain vs {shortName(sport, h2h.reference)} (positive = better)</h3>
                <DeltaList sport={sport} deltas={h2h.deltas} reference={h2h.reference} />
              </section>
            )}

            {liveKeys.length > 0 && (
              <section className="mdl-section" aria-labelledby="mdl-cal-h">
                <div className="mdl-section-head"><h2 id="mdl-cal-h">Calibration · live</h2></div>
                <CalibrationGrid
                  sport={sport}
                  calibration={sb.calibration}
                  keys={MODEL_ORDER[sport].filter((k) => liveKeys.includes(k))}
                  note="When a model says 60%, does the home team win 60% of the time? Each dot is a group of games of equal size, sorted by the predicted probability."
                />
              </section>
            )}

            <GameRows sport={sport} data={data} onWeek={setWeek} onDate={setDate} />
          </>
        )}

        {sport === 'mlb' && <TotalsPropsPanel />}

        {data?.backtest && <BacktestBox sport={sport} backtest={data.backtest} />}

        <section className="mdl-section" aria-labelledby="mdl-cards-h">
          <div className="mdl-section-head"><h2 id="mdl-cards-h">The models</h2></div>
          <div className="mdl-cards">
            {MODEL_ORDER[sport].map((k) => <ModelCard key={k} sport={sport} k={k} data={data} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
