import React, { useMemo, useState } from 'react';
import ApiService from '../services/api';
import RankBand from './RankBand';

/**
 * Why a team sits where it does on a power-rankings board.
 *
 * Everything shown here is computed by the ML rankings job from the fit itself (see
 * rankings/explain.py in the ML repo) and stored on the board row: the rating's split
 * into last season's and this season's games, each game's contribution (the rating
 * with the game minus the rating without it), schedule strength, and the adjacent-pair
 * comparison. This file only lays those numbers out; it computes nothing new, apart
 * from looking opponents up on the board so their rank can be shown.
 */

const MINUS = '−';

export function signed(v, digits = 1) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(digits)}`;
}

const pct = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`);

function ordinal(n) {
  if (n == null) return '—';
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${s}`;
}

/**
 * Waterfall of the rating: 0 -> last season's part -> + this season's part = rating.
 * Drawn as two segments on one axis so a negative part reads as a step back rather
 * than a bar that silently disappears.
 */
export function DecompositionBar({ prior, current, priorSeason, season }) {
  if (prior == null || current == null) return null;
  const total = prior + current;
  const lo = Math.min(0, prior, total);
  const hi = Math.max(0, prior, total);
  const span = hi - lo || 1;
  const x = (v) => ((v - lo) / span) * 100;
  const seg = (from, to) => ({ left: `${Math.min(x(from), x(to))}%`, width: `${Math.max(Math.abs(x(to) - x(from)), 0.8)}%` });
  return (
    <div className="rr-decomp">
      <div className="rr-decomp-bar" role="img"
           aria-label={`${priorSeason} games ${signed(prior)}, ${season} games ${signed(current)}, rating ${total.toFixed(1)}`}>
        <span className="rr-decomp-zero" style={{ left: `${x(0)}%` }} />
        <span className="rr-decomp-seg rr-decomp-seg--prior" style={seg(0, prior)} />
        <span className="rr-decomp-seg rr-decomp-seg--current" style={seg(prior, total)} />
      </div>
      <div className="rr-decomp-legend">
        <span><i className="rr-key rr-key--prior" />{priorSeason} games <b>{signed(prior)}</b></span>
        <span><i className="rr-key rr-key--current" />{season} games <b>{signed(current)}</b></span>
        <span>= rating <b>{total.toFixed(1)}</b></span>
      </div>
    </div>
  );
}

function Contribution({ value, scale }) {
  if (value == null) return <span className="rr-contrib">—</span>;
  const width = Math.min(Math.abs(value) / (scale || 1), 1) * 100;
  const tone = value >= 0 ? 'pos' : 'neg';
  return (
    <span className={`rr-contrib rr-contrib--${tone}`}>
      <span className="rr-contrib-num">{signed(value)}</span>
      <span className="rr-contrib-track"><span className="rr-contrib-fill" style={{ width: `${width}%` }} /></span>
    </span>
  );
}

const site = (s) => ({ H: 'vs', A: 'at', N: 'vs' }[s] || 'vs');

function gameResult(g) {
  if (g.pf != null && g.pa != null) return `${g.won ? 'W' : 'L'} ${g.pf}-${g.pa}`;
  return g.won ? 'W' : 'L';
}

/** One game (football) or season series (MLB) as a sentence fragment. */
export function describeEntry(e, isSeries) {
  if (isSeries) return `${e.w}-${e.l} vs ${e.opp}`;
  if (e.pf != null && e.pa != null) return `${e.pf}-${e.pa} ${site(e.site)} ${e.opp}`;
  return `${e.won ? 'W' : 'L'} ${site(e.site)} ${e.opp}`;
}

function GamesTable({ games, isSeries, rankOf, model }) {
  const scale = Math.max(...games.map((g) => Math.abs(g.contrib || 0)), 1);
  const expLabel = isSeries ? 'Exp W' : (model === 'bt' ? 'Exp win' : 'Exp margin');
  return (
    <div className="rr-games-wrap">
      <table className="rr-games">
        <thead>
          <tr>
            <th>{isSeries ? 'Opponent' : 'Game'}</th>
            <th>{isSeries ? 'W-L' : 'Result'}</th>
            <th title={isSeries ? 'Wins the ratings expected' : 'What the current ratings expect, home field included'}>{expLabel}</th>
            <th title={isSeries ? 'Wins above expectation' : 'Result minus expectation'}>vs exp</th>
            <th title="Rating with this game minus rating without it">Worth</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, i) => (
            <tr key={`${g.opp}-${g.date || i}`}>
              <td className="rr-opp">
                {!isSeries && <span className="rr-site">{site(g.site)}</span>}
                {g.opp}
                {rankOf(g.opp) && <span className="rr-opp-rank">{rankOf(g.opp)}</span>}
              </td>
              <td className="rb-mono">{isSeries ? `${g.w}-${g.l}` : gameResult(g)}</td>
              <td className="rb-mono">
                {isSeries ? (g.exp_w != null ? g.exp_w.toFixed(1) : '—')
                  : g.exp_margin != null ? signed(g.exp_margin) : pct(g.exp_win)}
              </td>
              <td className="rb-mono">{signed(g.over)}</td>
              <td><Contribution value={g.contrib} scale={scale} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The full rationale for one board row. */
export function TeamRationale({ row, rows, season, model, boardSize }) {
  const games = row.games || [];
  const why = row.why || {};
  const isSeries = why.unit === 'series';
  const priorSeason = why.prior_season || (season - 1);
  const byTeam = useMemo(() => new Map(rows.map((r) => [r.team, r])), [rows]);
  const rankOf = (team) => (byTeam.has(team) ? `#${byTeam.get(team).rank}` : null);
  const best = (why.best || []).map((i) => games[i]).filter(Boolean);
  const worst = (why.worst || []).map((i) => games[i]).filter(Boolean);

  return (
    <div className="rr">
      <div className="rr-grid">
        <section className="rr-block">
          <h4>Where the rating comes from</h4>
          <DecompositionBar prior={row.rating_from_prior} current={row.rating_from_current}
                            priorSeason={priorSeason} season={season} />
          <p className="rr-fine">
            An exact split: the fit is a ridge solve, so the rating is a sum over games, and
            last season's games enter at {row.prior_weight != null ? `${Math.round(row.prior_weight * 100)}%` : 'a decayed'} weight.
            {row.prior_share != null && ` ${Math.round(row.prior_share * 100)}% of this rating is carried over from ${priorSeason}.`}
          </p>
        </section>

        <section className="rr-block">
          <h4>Schedule and range</h4>
          <dl className="rr-facts">
            <dt>Played</dt>
            <dd>
              {row.sched_rank != null
                ? <>{ordinal(row.sched_rank)} hardest of {boardSize} <span className="rr-dim">(avg opp rating {Math.round(row.sched_strength)})</span></>
                : '—'}
            </dd>
            <dt>Still to play</dt>
            <dd>
              {row.sched_remaining_games
                ? <>{row.sched_remaining_games} games, {ordinal(row.sched_remaining_rank)} hardest <span className="rr-dim">(avg {Math.round(row.sched_remaining)})</span></>
                : 'none left'}
            </dd>
            {row.avg_margin != null && !isSeries && (
              <>
                <dt>Avg margin</dt>
                <dd>{signed(row.avg_margin)} <span className="rr-dim">({signed(row.avg_over_expected)} vs expectation)</span></dd>
              </>
            )}
            <dt>Rank range</dt>
            <dd>
              {row.rank_p05 != null ? `${row.rank_p05}–${row.rank_p95}` : '—'}
              <RankBand rank={row.rank} lo={row.rank_p05} hi={row.rank_p95} total={boardSize} />
            </dd>
          </dl>
        </section>
      </div>

      {(best.length > 0 || worst.length > 0) && (
        <div className="rr-grid">
          {best.length > 0 && (
            <section className="rr-block">
              <h4>{isSeries ? 'Best series' : 'Best wins'}</h4>
              <ul className="rr-list">
                {best.map((g) => (
                  <li key={`b-${g.opp}-${g.date || ''}`}>
                    <span>{describeEntry(g, isSeries)}</span>
                    <b className="rr-pos">{signed(g.contrib)}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {worst.length > 0 && (
            <section className="rr-block">
              <h4>{isSeries ? 'Worst series' : 'Worst losses'}</h4>
              <ul className="rr-list">
                {worst.map((g) => (
                  <li key={`w-${g.opp}-${g.date || ''}`}>
                    <span>{describeEntry(g, isSeries)}</span>
                    <b className="rr-neg">{signed(g.contrib)}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {games.length > 0 && (
        <section className="rr-block">
          <h4>{isSeries ? 'Every season series' : 'Every game this season'}</h4>
          <GamesTable games={games} isSeries={isSeries} rankOf={rankOf} model={model} />
          <p className="rr-fine">
            <b>Worth</b> is the rating with {isSeries ? 'the series' : 'the game'} minus the
            rating without it, in rating points
            {why.points_per_rating ? ` (1 rating point = ${why.points_per_rating.toFixed(3)} points of margin)` : ''}.
            Beating a team by less than expected costs rating even in a win.
          </p>
        </section>
      )}
    </div>
  );
}

/** A pair explanation, stored (vs_next) or from the compare endpoint. */
export function PairExplanation({ pair, sport }) {
  if (!pair) return null;
  const isMlb = sport === 'mlb';
  const common = pair.common || [];
  const totals = pair.common_totals || {};
  return (
    <div className="rr-pair">
      <p className="rr-pair-text">{pair.text}</p>
      <dl className="rr-facts rr-facts--pair">
        <dt>Gap</dt>
        <dd>{pair.gap != null ? pair.gap.toFixed(1) : '—'} rating
          {pair.gap_points != null && <span className="rr-dim"> ({pair.gap_points.toFixed(1)} pts of margin)</span>}
        </dd>
        <dt>P({pair.a} wins, neutral)</dt>
        <dd>{pct(pair.p_a_wins_neutral)}</dd>
        {pair.p_order != null && (
          <>
            <dt title="Share of bootstrap resamples that rate them in this order">Same order in resamples</dt>
            <dd>{pct(pair.p_order)}{pair.tied && <span className="rr-tag">statistically tied</span>}</dd>
          </>
        )}
        {pair.p_order == null && pair.tied && (
          <>
            <dt>Rank ranges</dt>
            <dd>overlap<span className="rr-tag">statistically tied</span></dd>
          </>
        )}
        <dt>Gap from last season</dt>
        <dd>{signed(pair.gap_from_prior)}</dd>
        <dt>Gap from this season</dt>
        <dd>{signed(pair.gap_from_current)}</dd>
        <dt>Schedule rank</dt>
        <dd>{ordinal(pair.a_sched_rank)} vs {ordinal(pair.b_sched_rank)}</dd>
      </dl>
      {common.length > 0 && (
        <table className="rr-games rr-common">
          <thead>
            <tr><th>Common opponent</th><th>{pair.a}</th><th>{pair.b}</th></tr>
          </thead>
          <tbody>
            {common.map((c) => (
              <tr key={c.opp}>
                <td>{c.opp}</td>
                <td className="rb-mono">{c.a.games.join(', ')}</td>
                <td className="rb-mono">{c.b.games.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!common.length && totals.n > 0 && (
        <p className="rr-fine">
          Against {totals.n} common opponents: {pair.a} {totals.a_w}-{totals.a_l}
          {isMlb && totals.a_over != null && ` (${signed(totals.a_over)} wins vs expectation)`},
          {' '}{pair.b} {totals.b_w}-{totals.b_l}
          {isMlb && totals.b_over != null && ` (${signed(totals.b_over)})`}.
        </p>
      )}
    </div>
  );
}

/** "Compare any two teams": two pickers and the pair explanation from the backend. */
export function ComparePicker({ rows, sport, season }) {
  const teams = useMemo(() => rows.map((r) => r.team), [rows]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [pair, setPair] = useState(null);
  const [state, setState] = useState('idle');

  const run = async (nextA, nextB) => {
    if (!nextA || !nextB || nextA === nextB) { setPair(null); setState('idle'); return; }
    setState('loading');
    try {
      const res = await ApiService.compareRankings(sport, { a: nextA, b: nextB, season });
      setPair(res?.data || null);
      setState(res?.data ? 'ok' : 'error');
    } catch {
      setPair(null);
      setState('error');
    }
  };

  const pick = (which) => (e) => {
    const value = e.target.value;
    if (which === 'a') { setA(value); run(value, b); } else { setB(value); run(a, value); }
  };

  const options = teams.map((t) => {
    const r = rows.find((x) => x.team === t);
    return <option key={t} value={t}>#{r.rank} {t}</option>;
  });

  return (
    <div className="rr-compare">
      <div className="rr-compare-head">
        <span className="rr-compare-title">Compare any two teams</span>
        <label>
          <span className="rr-sr">First team</span>
          <select value={a} onChange={pick('a')} aria-label="First team">
            <option value="">Team…</option>
            {options}
          </select>
        </label>
        <span className="rr-vs">vs</span>
        <label>
          <span className="rr-sr">Second team</span>
          <select value={b} onChange={pick('b')} aria-label="Second team">
            <option value="">Team…</option>
            {options}
          </select>
        </label>
      </div>
      {state === 'loading' && <p className="rr-fine">Comparing…</p>}
      {state === 'error' && <p className="rr-fine">Could not compare those two teams.</p>}
      {state === 'ok' && <PairExplanation pair={pair} sport={sport} />}
    </div>
  );
}
