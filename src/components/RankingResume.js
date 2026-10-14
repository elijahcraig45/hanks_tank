import React from 'react';

/**
 * Pieces of the board that only exist when it is ordered by the season resume
 * (`resume_*` columns from the ML job; see hanks_tank_ml docs/RANKINGS_RESUME.md).
 */

const signed1 = (v) => (v == null || Number.isNaN(v) ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`);
export const sor = signed1;

/** "#3–#7" when this team's record cannot be told apart from teams ranked around it; null when its place is firm. */
export function tieLabel(row) {
  const lo = row.resume_tie_lo;
  const hi = row.resume_tie_hi;
  if (lo == null || hi == null || hi <= lo) return null;
  return `#${lo}–#${hi}`;
}

export function TieCell({ row }) {
  if (row.resume_tie_lo == null || row.resume_tie_hi == null) return '—';   // no games, no resume to be tied
  const label = tieLabel(row);
  if (!label) return <span className="rb-tie rb-tie--firm" title="No other team's record is close enough to swap places with this one">firm</span>;
  return (
    <span className="rb-tie" title={`Records this close cannot be told apart yet, so this team could reasonably rank anywhere from ${label.replace('–', ' to ')}`}>
      {label}
    </span>
  );
}

const SITE = { H: 'vs', A: 'at', N: 'vs (neutral)' };

/** One team's games with the credit each earned: result minus what a typical top-25 team would score against that opponent. */
export function ResumeGames({ row }) {
  const games = Array.isArray(row.resume_games) ? row.resume_games : [];
  if (!games.length) return null;
  return (
    <div className="rb-games">
      <table className="rb-games-table">
        <caption className="rb-games-caption">
          What each game was worth to {row.team}'s resume. Credit is the result minus what a typical top-25 team
          would score against that opponent at that venue: wins over strong teams earn the most, a loss to a weak team
          costs the most.
        </caption>
        <thead>
          <tr><th>Date</th><th>Opponent</th><th>Result</th><th title="Opponent's place on this resume board">Opp #</th><th>Credit</th></tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={`${g.date}-${g.opp}`}>
              <td className="rb-mono">{g.date}</td>
              <td>{SITE[g.site] || 'vs'} {g.opp}</td>
              <td className="rb-mono">
                {g.won ? 'W' : 'L'}{g.pf != null && g.pa != null ? ` ${Math.round(g.pf)}–${Math.round(g.pa)}` : ''}
              </td>
              <td className="rb-mono">{g.opp_rank ? `#${g.opp_rank}` : '—'}</td>
              <td className={`rb-mono rb-credit rb-credit--${g.credit >= 0 ? 'up' : 'down'}`}>{signed1(g.credit)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>Strength of record{row.resume_sd != null ? ` (±${row.resume_sd.toFixed(2)})` : ''}</td>
            <td className="rb-mono">{signed1(row.resume_sor)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export const RESUME_NOTE = 'Ranked by season resume: who has earned it, not who would win next week. Each game is scored against '
  + 'what a typical top-25 team would do against that opponent, so wins over strong teams count most and beating weak ones '
  + 'almost nothing; a bounded margin credit refines each result, and a win never scores below zero. After only a few games many records are too close to separate, '
  + 'so the Range column shows the places a team could reasonably hold, and head-to-head results decide the order inside it. '
  + 'The next-week rating, which is the forecast, is shown beside it.';
