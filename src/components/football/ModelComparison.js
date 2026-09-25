import React, { useEffect, useMemo, useState } from 'react';
import ApiService from '../../services/api';
import {
  BACKTESTS, BACKTEST_DATE, FOOTBALL_MODELS, MODEL_ORDER,
} from '../../config/footballModels';
import '../styles/FootballModels.css';

/**
 * Football model comparison (experiment).
 *
 * Every model's prediction for each game side by side, a running scoreboard, and a
 * card per model saying what it is. The scoreboard counts a prediction only if it was
 * written before kickoff — the backend enforces that; this page just says so loudly,
 * because it is the difference between a record and a story.
 *
 * The parent keys this on league + season, so a new league or season starts again from
 * the backend's default week instead of carrying the old week across.
 */

const SMALL_SAMPLE = 100;

const pct = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(d)}%`);
const num = (v, d = 3) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d));
const signed = (v, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(d)}`);

function modelName(key) {
  return FOOTBALL_MODELS[key]?.name || key;
}

function kickoffLabel(iso) {
  if (!iso) return 'Kickoff TBD';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** One cell: the home win probability, the margin if the model gives one, and flags. */
function PredictionCell({ p, game }) {
  if (!p) return <td className="fm-cell fm-cell--none">—</td>;
  const favHome = p.home_win_probability >= 0.5;
  const fav = favHome ? game.home_team_name : game.away_team_name;
  const favProb = favHome ? p.home_win_probability : 1 - p.home_win_probability;
  let result = null;
  if (game.home_won != null && p.pregame) {
    result = (p.home_win_probability > 0.5 ? 1 : 0) === game.home_won ? 'hit' : 'miss';
  }
  return (
    <td className={`fm-cell${result ? ` fm-cell--${result}` : ''}${p.pregame ? '' : ' fm-cell--late'}`}>
      <div className="fm-cell-prob">{pct(p.home_win_probability)}</div>
      <div className="fm-cell-sub">
        {fav} {pct(favProb)}
        {p.predicted_home_margin != null && <> · {signed(p.predicted_home_margin)}</>}
      </div>
      {!p.pregame && <div className="fm-cell-flag">after kickoff — not scored</div>}
    </td>
  );
}

function ScoreTable({ lines, title, note }) {
  const rows = (lines || []).filter((l) => l.games > 0);
  const best = rows.length ? Math.min(...rows.map((r) => r.log_loss)) : null;
  return (
    <div className="fm-score">
      <div className="fm-score-head">
        <h3>{title}</h3>
        {note && <span className="fm-score-note">{note}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="ft-note">No pregame predictions have been scored yet.</p>
      ) : (
        <div className="ft-table-wrap">
          <table className="ft-table fm-table">
            <thead>
              <tr>
                <th>Model</th><th>Games</th><th>Log loss</th><th>Accuracy</th>
                <th>Brier</th><th>Spread MAE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model} className={r.log_loss === best ? 'fm-best' : ''}>
                  <td>{modelName(r.model)}</td>
                  <td>{r.games}</td>
                  <td>{num(r.log_loss, 4)}</td>
                  <td>{pct(r.accuracy, 1)}</td>
                  <td>{num(r.brier, 4)}</td>
                  <td>{r.spread_mae == null ? '—' : `${num(r.spread_mae, 1)} pts`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModelCard({ modelKey, status, live, backtest }) {
  const m = FOOTBALL_MODELS[modelKey];
  if (!m) return null;
  const bt = backtest?.rows?.[modelKey];
  return (
    <article className={`fm-card fm-card--${modelKey}`} data-testid={`model-card-${modelKey}`}>
      <header className="fm-card-head">
        <h3>{m.name}</h3>
        <span className="fm-card-role">{m.role}</span>
      </header>
      <p>{m.what}</p>
      <h4>What it uses</h4>
      <ul>{m.inputs.map((i) => <li key={i}>{i}</li>)}</ul>
      <h4>How it gets to a win probability</h4>
      <p>{m.how}</p>
      <h4>Record</h4>
      <p className="fm-record">
        {live && live.games > 0
          ? <>Live, pregame only: {live.games} games, log loss {num(live.log_loss, 4)}, {pct(live.accuracy, 1)} right.</>
          : <>Live: {status?.note || 'no pregame predictions scored yet.'}</>}
        {bt && (
          <>
            <br />
            Backtest ({backtest.label}, n={backtest.n}): log loss {num(bt.ll, 4)},{' '}
            {pct(bt.acc, 1)} right{bt.mae != null && <>, off by {num(bt.mae, 1)} pts on average</>}.
          </>
        )}
      </p>
      <h4>Caveats</h4>
      <ul className="fm-caveats">{m.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
    </article>
  );
}

function Backtest({ backtest }) {
  if (!backtest) return null;
  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>Backtest — {backtest.label}</h2>
        <span className="ft-panel-meta">measured {BACKTEST_DATE}, n={backtest.n}</span>
      </div>
      <p className="ft-note ft-note--warn">
        Not the live scoreboard. XGBoost here is its week-by-week backfill, the ridge was
        refit week by week on earlier games only, and FPI was fetched after the games
        (checked against ESPN&apos;s own kickoff win probability). Honest about information,
        but not captured before kickoff — which is why it lives in its own box.
      </p>
      <div className="ft-table-wrap">
        <table className="ft-table fm-table">
          <thead>
            <tr><th>Model</th><th>Log loss</th><th>Accuracy</th><th>Brier</th><th>Spread MAE</th></tr>
          </thead>
          <tbody>
            {Object.entries(backtest.rows).map(([k, r]) => (
              <tr key={k}>
                <td>{modelName(k)}</td><td>{num(r.ll, 4)}</td><td>{pct(r.acc, 1)}</td>
                <td>{num(r.brier, 4)}</td><td>{r.mae == null ? '—' : `${num(r.mae, 1)} pts`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="fm-diffs">
        {backtest.diffs.map((d) => (
          <li key={`${d.a}-${d.b}`}>
            {modelName(d.a)} vs {modelName(d.b)}: {signed(d.d, 4)} log loss
            (95% CI {signed(d.lo, 4)} to {signed(d.hi, 4)})
            {d.lo < 0 && d.hi > 0 ? ' — within noise' : ''}
          </li>
        ))}
      </ul>
      <p className="ft-note">{backtest.verdict}</p>
    </section>
  );
}

export default function ModelComparison({ league, season }) {
  const [week, setWeek] = useState(null);
  const [data, setData] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ApiService.getFootballModelComparison(league.sport, {
          season, week, division: league.division,
        });
        if (cancelled) return;
        setData(res?.data || null);
        setNote(res?.meta?.note || null);
      } catch {
        if (!cancelled) { setError('Could not load the model comparison.'); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [league.sport, league.division, season, week]);

  const status = useMemo(
    () => Object.fromEntries((data?.models || []).map((m) => [m.key, m])), [data]
  );
  const columns = useMemo(
    () => MODEL_ORDER.filter((k) => status[k] && !status[k].planned), [status]
  );
  const liveBy = useMemo(
    () => Object.fromEntries((data?.scoreboard?.per_model || []).map((s) => [s.model, s])),
    [data]
  );
  const backtest = league.division === 'fcs' ? null : BACKTESTS[league.sport];

  if (loading && !data) return <section className="ft-panel"><p className="ft-note">Loading…</p></section>;
  if (error) return <section className="ft-panel"><p className="ft-note ft-note--warn">{error}</p></section>;

  const h2h = data?.scoreboard?.head_to_head;
  const smallest = h2h?.games ?? 0;

  return (
    <div className="fm-page">
      <section className="ft-panel">
        <div className="ft-panel-head">
          <h2>Model comparison — {league.label} {season}</h2>
          <span className="fm-badge">Experiment</span>
        </div>
        <p className="ft-note">
          The same games, every model&apos;s call. The scoreboard counts a prediction only if it was
          written <strong>before kickoff</strong> — the latest such one per game. Anything written
          later is shown greyed and never scored. Lower log loss and Brier are better; spread MAE is
          how many points the predicted margin missed by.
        </p>
        {note && <p className="ft-note ft-note--warn">{note}</p>}
        {data && (
          <>
            <ScoreTable
              title="Head to head — only games every model called before kickoff"
              lines={h2h?.rows}
              note={`${smallest} games${smallest && smallest < SMALL_SAMPLE ? ' — small sample, read with care' : ''}`}
            />
            <ScoreTable
              title="Each model's full record (different games per model)"
              lines={data.scoreboard?.per_model}
            />
          </>
        )}
      </section>

      {data && (
        <section className="ft-panel">
          <div className="ft-panel-head">
            <h2>Week {data.week ?? '—'}</h2>
            <select
              className="fm-week"
              aria-label="Week"
              value={data.week ?? ''}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {(data.weeks || []).map((w) => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>
          {data.games?.length ? (
            <div className="ft-table-wrap">
              <table className="ft-table fm-table fm-games">
                <thead>
                  <tr>
                    <th>Game</th>
                    {columns.map((k) => <th key={k}>{modelName(k)}<div className="fm-th-sub">home win %</div></th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.games.map((g) => (
                    <tr key={g.game_id}>
                      <td className="fm-game">
                        <div className="fm-game-teams">{g.away_team_name} @ {g.home_team_name}</div>
                        <div className="fm-game-meta">
                          {g.completed && g.home_score != null
                            ? `Final ${g.away_score}-${g.home_score}`
                            : kickoffLabel(g.kickoff)}
                        </div>
                      </td>
                      {columns.map((k) => <PredictionCell key={k} p={g.predictions?.[k]} game={g} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ft-note">No games this week.</p>
          )}
        </section>
      )}

      <section className="fm-cards">
        {MODEL_ORDER.map((k) => (
          <ModelCard key={k} modelKey={k} status={status[k]} live={liveBy[k]} backtest={backtest} />
        ))}
      </section>

      <Backtest backtest={backtest} />
    </div>
  );
}
