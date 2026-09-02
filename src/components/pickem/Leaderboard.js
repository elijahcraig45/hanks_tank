import { useCallback, useEffect, useState } from 'react';
import ApiService from '../../services/api';
import { pct, record } from './format';

/**
 * The public standings.
 *
 * A column of win percentages is a poor leaderboard: it says who is ahead and nothing
 * about how, or whether being ahead means anything. So each row also carries
 *
 *   the gap to the market as one signed number, not two percentages to subtract —
 *     and it is computed on that entrant's own games, since somebody who picked six is
 *     not comparable to the closing line across sixty;
 *   week-by-week form, so a record built on one hot week reads differently from a
 *     steady one;
 *   how many picks are still unscored, so a short record reads as "not scored yet"
 *     rather than as a thin week.
 */

/** A compact per-week strip. CSS bars, not a chart: one row each of a dozen entrants. */
function FormStrip({ weeks }) {
  if (!weeks?.length) return null;
  return (
    <span className="pk-form">
      {weeks.map((w) => {
        const p = w.win_pct;
        const tone = p === null || p === undefined ? ''
          : p >= 0.6 ? 'good' : p >= 0.4 ? 'mid' : 'bad';
        return (
          <span
            key={w.week}
            className={`pk-form-week${tone ? ` pk-form-week--${tone}` : ''}`}
            title={`Week ${w.week}: ${w.wins}-${w.losses}${w.pushes ? `-${w.pushes}` : ''}`}
          >
            {w.wins}
          </span>
        );
      })}
    </span>
  );
}

export default function Leaderboard({ sport, season, pickType, week, you }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getPickemLeaderboard(sport, { season, week, pickType });
      setRows(res.data || []);
      setMeta(res.meta || null);
    } catch {
      setRows([]); setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [sport, season, week, pickType]);

  useEffect(() => { load(); }, [load]);

  if (loading && !meta) return <div className="ft-state">Loading standings…</div>;

  if (!rows.length) {
    return (
      <div className="ft-empty">
        <div className="ft-empty-title">No standings yet</div>
        <p className="ft-empty-detail">
          {meta?.note
            || 'Nobody has a graded pick for this scope yet. Standings appear once games finish.'}
        </p>
      </div>
    );
  }

  const seasonView = meta?.scope === 'season';
  const leaderWins = Math.max(...rows.map((r) => Number(r.wins) || 0), 1);

  return (
    <>
      <div className="ft-table-wrap">
        <table className="ft-table pk-board">
          <thead>
            <tr>
              <th>#</th>
              <th>Entrant</th>
              <th>Record</th>
              <th>Win %</th>
              <th title="This entrant's win rate minus the closing favourite's, on the same games">
                vs Vegas
              </th>
              {seasonView && <th title="Wins in each graded week, oldest first">Form</th>}
              {seasonView && <th title="Most wins in a single week">Best</th>}
              <th title="Correct picks where the entrant took the underdog">Dogs</th>
              <th title="Picks made, and how many are still to be scored">Picks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const gap = r.vs_vegas;
              const wins = Number(r.wins) || 0;
              return (
                <tr
                  key={r.user_id}
                  className={r.user_id === you ? 'pk-board-you' : undefined}
                >
                  <td>{r.rank}</td>
                  <td className="pk-board-name">
                    {r.picture_url && (
                      <img className="pk-avatar pk-avatar--sm" src={r.picture_url} alt="" />
                    )}
                    {r.display_name}
                    {r.user_id === you && <span className="pk-you">you</span>}
                  </td>
                  <td className="pk-board-rec">
                    {record(r.wins, r.losses, r.pushes)}
                    {/* Relative to the leader, so the shape of the table is readable
                        without comparing numbers across rows. */}
                    <span className="pk-winbar" aria-hidden="true">
                      <span
                        className="pk-winbar-fill"
                        style={{ width: `${(wins / leaderWins) * 100}%` }}
                      />
                    </span>
                  </td>
                  <td>{pct(r.win_pct)}</td>
                  <td
                    className={
                      gap === null || gap === undefined ? undefined
                        : gap > 0 ? 'ft-pos' : gap < 0 ? 'ft-neg' : undefined
                    }
                  >
                    {gap === null || gap === undefined
                      ? '—'
                      : `${gap > 0 ? '+' : ''}${(gap * 100).toFixed(1)}%`}
                  </td>
                  {seasonView && <td><FormStrip weeks={r.by_week} /></td>}
                  {seasonView && <td>{r.best_week_wins ?? '—'}</td>}
                  <td>{r.underdog_hits ?? 0}</td>
                  <td className="pk-board-picks">
                    {r.picks_graded ?? 0}
                    <span className="pk-board-picks-total">/{r.picks_made ?? 0}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="ft-note">
        <strong>vs Vegas</strong> compares each entrant against the closing favourite on
        the games they actually picked — a positive number means they beat the market.
        Pushes and ties count as neither a win nor a loss, and a pick on an unfinished
        game is not counted until it is scored.
      </p>
    </>
  );
}
