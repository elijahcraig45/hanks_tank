import { useCallback, useEffect, useState } from 'react';
import ApiService from '../../services/api';
import { pct, record } from './format';

/**
 * The public standings.
 *
 * Every row carries the market's record on that entrant's own games, not the market's
 * record overall — someone who picked six games is not comparable to the closing line
 * across sixty. Beating your own Vegas number is the interesting claim, and it is only
 * meaningful like-for-like.
 */
export default function Leaderboard({ sport, season, pickType, week, you }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getPickemLeaderboard(sport, {
        season, week, pickType,
      });
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

  return (
    <div className="ft-table-wrap">
      <table className="ft-table pk-board">
        <thead>
          <tr>
            <th>#</th>
            <th>Entrant</th>
            <th>Record</th>
            <th>Win %</th>
            {/* The market on the same games, which is the point of the column. */}
            <th title="The closing favourite's record on this entrant's own games">
              Vegas
            </th>
            <th title="Correct picks where the entrant took the underdog">Dogs</th>
            <th>Picks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const beat = r.win_pct !== null && r.vegas_win_pct !== null
              && r.win_pct > r.vegas_win_pct;
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
                <td>{record(r.wins, r.losses, r.pushes)}</td>
                <td className={beat ? 'ft-pos' : undefined}>{pct(r.win_pct)}</td>
                <td className="pk-vegas">{pct(r.vegas_win_pct)}</td>
                <td>{r.underdog_hits ?? 0}</td>
                <td>{r.picks_graded ?? 0}/{r.picks_made ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
