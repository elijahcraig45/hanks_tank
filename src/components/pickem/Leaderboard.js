import { useCallback, useEffect, useState } from 'react';
import ApiService from '../../services/api';
import { pct, record } from './format';

/**
 * The public standings.
 *
 * Deliberately few columns. An earlier version added form, best week and underdog
 * counts, and with one graded week they read as a green "5" and two zeroes — numbers
 * that need explaining are worse than numbers left out. What survives is what a reader
 * can act on: the record, how often it wins, and whether it is beating the market.
 *
 * The market column is one signed number rather than two percentages to subtract, and
 * it is computed on each entrant's own games — somebody who picked six is not
 * comparable to the closing line across sixty.
 */
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

  const leaderWins = Math.max(...rows.map((r) => Number(r.wins) || 0), 1);
  const anyPending = rows.some((r) => Number(r.pending) > 0);

  return (
    <>
      <div className="ft-table-wrap">
        <table className="ft-table pk-board">
          <thead>
            <tr>
              <th className="pk-col-rank">#</th>
              <th>Entrant</th>
              <th>Record</th>
              <th>Win&nbsp;%</th>
              <th title="How this entrant's win rate compares with the closing favourite's, on the same games">
                vs&nbsp;Vegas
              </th>
              <th title="Picks that have been scored, out of picks made">Scored</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const gap = r.vs_vegas;
              const wins = Number(r.wins) || 0;
              const hasGap = gap !== null && gap !== undefined;
              return (
                <tr
                  key={r.user_id}
                  className={r.user_id === you ? 'pk-board-you' : undefined}
                >
                  <td className="pk-col-rank">{r.rank}</td>
                  <td className="pk-board-name">
                    {r.picture_url && (
                      <img className="pk-avatar pk-avatar--sm" src={r.picture_url} alt="" />
                    )}
                    {r.display_name}
                    {r.user_id === you && <span className="pk-you">you</span>}
                  </td>
                  <td className="pk-board-rec">
                    {record(r.wins, r.losses, r.pushes)}
                    {/* Length relative to the leader, so the order is readable without
                        comparing numbers across rows. */}
                    <span className="pk-winbar" aria-hidden="true">
                      <span
                        className="pk-winbar-fill"
                        style={{ width: `${(wins / leaderWins) * 100}%` }}
                      />
                    </span>
                  </td>
                  <td className="pk-board-pct">{pct(r.win_pct)}</td>
                  <td className={hasGap ? (gap > 0 ? 'ft-pos' : gap < 0 ? 'ft-neg' : undefined) : undefined}>
                    {hasGap ? `${gap > 0 ? '+' : ''}${(gap * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="pk-board-picks">
                    {r.picks_graded ?? 0}
                    <span className="pk-board-picks-total"> of {r.picks_made ?? 0}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="ft-note">
        <strong>vs&nbsp;Vegas</strong> is each entrant&rsquo;s win rate minus the closing
        favourite&rsquo;s, on the games they actually picked — a positive number means
        they beat the market.
        {anyPending && ' Most picks are not scored yet, so these records will move a lot.'}
      </p>
    </>
  );
}
