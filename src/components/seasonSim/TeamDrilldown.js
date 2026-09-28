import React, { useEffect, useRef } from 'react';
import { ColumnChart, ProbBar } from './DistBars';
import RemainingSchedule from './RemainingSchedule';
import {
  ROUND_ODDS, fmtMeanRecord, fmtNum, fmtPct, fmtRecord, fmtSigned, parseDist,
} from './simFormat';

/**
 * One team's simulated season: wins distribution, remaining schedule with per-game
 * P(win), seed distribution, round-by-round odds, rating with its uncertainty, and the strength of what is left. A dialog so it
 * works as a bottom sheet on a phone; Escape and the backdrop close it.
 */
export default function TeamDrilldown({ sport, team, season, week, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!team) return null;

  const wins = parseDist(team.wins_dist);
  const seeds = parseDist(team.p_seed);
  const seedTotal = seeds.reduce((a, b) => a + b, 0);
  const miss = Math.max(0, 1 - seedTotal);
  const seedValues = seeds.length ? [...seeds, miss] : [];
  const seedLabels = seeds.length ? [...seeds.map((_, i) => `${i + 1}`), 'Out'] : [];
  const p10 = team.wins_p10 != null ? Math.round(team.wins_p10) : null;
  const p90 = team.wins_p90 != null ? Math.round(team.wins_p90) : null;
  const odds = (ROUND_ODDS[sport] || ROUND_ODDS.nfl).filter((o) => team[o.key] != null);
  const sos = Number(team.remaining_sos);
  const place = [team.division || team.conference, team.division ? team.conference : null]
    .filter(Boolean);

  return (
    <div className="ssim-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ssim-sheet" role="dialog" aria-modal="true" aria-labelledby="ssim-sheet-title" data-testid="ssim-drilldown">
        <header className="ssim-sheet-head">
          <div>
            <h3 id="ssim-sheet-title" className="ssim-sheet-title">{team.team_name || team.team}</h3>
            <p className="ssim-sheet-sub">
              {[...new Set(place)].join(' · ')}
              {team.power_rank != null && ` · power rank #${team.power_rank}`}
            </p>
          </div>
          <button ref={closeRef} type="button" className="ssim-close" onClick={onClose} aria-label="Close team detail">×</button>
        </header>

        <dl className="ssim-facts">
          <div><dt>Record now</dt><dd>{fmtRecord(team.wins, team.losses, team.ties)}</dd></div>
          <div><dt>Projected</dt><dd>{fmtMeanRecord(team)}</dd></div>
          <div>
            <dt>Rating</dt>
            <dd>
              {fmtSigned(team.rating)}
              {team.rating_sd != null && <span className="ssim-faint"> ± {fmtNum(team.rating_sd)}</span>}
            </dd>
          </div>
          <div>
            <dt>Left to play</dt>
            <dd>
              {team.remaining_games ?? '—'} games
              {Number.isFinite(sos) && (
                <span className="ssim-faint">
                  {' '}· opp. {fmtSigned(sos)} ({sos > 0.5 ? 'tougher' : sos < -0.5 ? 'easier' : 'about average'})
                </span>
              )}
            </dd>
          </div>
          {sport === 'cfb' && team.exp_final_rank != null && (
            <div>
              <dt>Exp. final rank</dt>
              <dd>
                {fmtNum(team.exp_final_rank, 0)}
                {team.rank_p10 != null && (
                  <span className="ssim-faint"> ({Math.round(team.rank_p10)}–{Math.round(team.rank_p90)})</span>
                )}
              </dd>
            </div>
          )}
        </dl>
        <p className="ssim-note">
          Rating is points better than an average team on a neutral field; ± is one standard
          deviation of its uncertainty, which the simulation draws from each run.
        </p>

        <h4 className="ssim-h4">Final regular-season wins</h4>
        <ColumnChart
          testId="ssim-wins-chart"
          values={wins}
          labels={wins.map((_, k) => String(k))}
          highlight={(k) => p10 != null && p90 != null && k >= p10 && k <= p90}
          caption={p10 != null ? `Darker bars: the middle 80% of simulations (${p10}–${p90} wins). Median ${fmtNum(team.wins_p50, 0)}.` : null}
        />

        <h4 className="ssim-h4">Remaining schedule</h4>
        <RemainingSchedule sport={sport} team={team} season={season} week={week} />

        <h4 className="ssim-h4">{sport === 'nfl' ? 'Playoff seed' : 'CFP seed'}</h4>
        <ColumnChart
          testId="ssim-seed-chart"
          values={seedValues}
          labels={seedLabels}
          highlight={(k) => k < seeds.length}
          caption={seeds.length ? `Out = missed the ${sport === 'nfl' ? 'playoffs' : 'playoff'} (${fmtPct(miss)}).` : null}
        />

        <h4 className="ssim-h4">Round by round</h4>
        <ul className="ssim-odds" data-testid="ssim-odds">
          {odds.map((o) => (
            <li key={o.key}>
              <span className="ssim-odds-label">{o.label}</span>
              <ProbBar p={team[o.key]} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
