import React, { useEffect, useState } from 'react';
import ApiService from '../../services/api';
import {
  fmtGameDate, fmtPct, fmtSigned, parseIdList, scheduleCallout, sitePrefix, teamGame, winLabel,
} from './simFormat';

/**
 * A team's remaining games from the season sim: date, opponent and site, P(win) as a
 * bar, the projected margin and a label, plus a one-paragraph summary built from the
 * numbers. Reads GET /api/season-sim/:sport/team/:team for the same (season, week) the
 * page shows. Every P(win) is a share of the same simulated seasons as the team's
 * projected record, so they add up to its expected remaining wins.
 */
export default function RemainingSchedule({ sport, team, season, week }) {
  const [state, setState] = useState({ loading: true, games: [], note: null, error: false });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, games: [], note: null, error: false });
    ApiService.getSeasonSimTeam(sport, team.team, { season, week })
      .then((r) => {
        if (!cancelled) {
          setState({ loading: false, games: r.games.map((g) => teamGame(g, team.team)), note: r.meta?.note || null, error: false });
        }
      })
      .catch(() => { if (!cancelled) setState({ loading: false, games: [], note: null, error: true }); });
    return () => { cancelled = true; };
  }, [sport, team.team, season, week]);

  if (state.loading) return <p className="ssim-faint">Loading remaining schedule…</p>;
  if (state.error || !state.games.length) {
    return (
      <p className="ssim-faint" data-testid="ssim-sched-empty">
        {Number(team.remaining_games) === 0
          ? 'No regular-season games left.'
          : state.note || 'Per-game projections are not available for this run.'}
      </p>
    );
  }

  const games = state.games;
  const callout = scheduleCallout(team, games);
  const likeliest = new Set(parseIdList(team.projected_wins_games) || []);

  return (
    <div className="ssim-sched" data-testid="ssim-schedule">
      {callout && (
        <div className="ssim-callout" data-testid="ssim-callout">
          <p>{callout.lead}</p>
          <p className="ssim-callout-caveat">{callout.caveat}</p>
        </div>
      )}
      <ol className="ssim-games">
        {games.map((g) => {
          const lab = winLabel(g.p_win);
          const top = likeliest.has(String(g.game_id));
          const p = Math.max(0, Math.min(1, Number(g.p_win) || 0));
          const range = g.margin_p10 != null && g.margin_p90 != null
            ? `80% of simulations: ${fmtSigned(g.margin_p10)} to ${fmtSigned(g.margin_p90)}`
            : undefined;
          return (
            <li key={g.game_id} className={`ssim-game${top ? ' ssim-game--top' : ''}`} data-testid="ssim-game">
              <span className="ssim-game-date">
                {fmtGameDate(g.game_date)}
                <span className="ssim-faint ssim-game-wk"><span className="ssim-game-dot"> · </span>wk {g.week}</span>
              </span>
              <span className="ssim-game-opp">
                <span className="ssim-game-site">{sitePrefix(g)}</span>{' '}
                <span className="ssim-game-name">{g.opponent_name || g.opponent}</span>
                {g.site === 'neutral' && <span className="ssim-faint"> (neutral)</span>}
                {top && <span className="ssim-sr"> (one of the likeliest wins)</span>}
              </span>
              <span className="ssim-game-p" aria-label={`P(win) ${fmtPct(g.p_win)}`}>
                <span className="ssim-pbar-track" aria-hidden="true">
                  <span className="ssim-pbar-fill" style={{ width: `${p * 100}%` }} />
                </span>
                <span className="ssim-pbar-num">{fmtPct(g.p_win)}</span>
              </span>
              <span className="ssim-game-margin" title={range}>
                {fmtSigned(g.margin)}
              </span>
              {lab && <span className={`ssim-tag ssim-tag--${lab.tone}`}>{lab.label}</span>}
            </li>
          );
        })}
      </ol>
      <p className="ssim-chart-cap">
        P(win) and margin are from this team&apos;s side, across every simulated season,
        including the uncertainty in both teams&apos; ratings. Margin is the average
        simulated result in points; hover it for the 80% range. Outlined rows are the
        games counted in the summary above.
      </p>
    </div>
  );
}
