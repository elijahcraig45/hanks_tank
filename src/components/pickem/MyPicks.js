import { useCallback, useEffect, useState } from 'react';
import ApiService from '../../services/api';
import { kickoffLabel, spreadFor, record } from './format';

/**
 * The signed-in entrant's own graded picks.
 *
 * The leaderboard only aggregates; reviewing a week means seeing which individual picks
 * landed, and — the part a standings table cannot show — which of them the closing line
 * disagreed with. A win against the market is the one worth pointing at.
 */
export default function MyPicks({ sport, season, signedIn }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!signedIn) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await ApiService.getMyPicks({ sport, season });
      setRows(res.data || []);
      setMeta(res.meta || null);
    } catch {
      setRows([]); setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [sport, season, signedIn]);

  useEffect(() => { load(); }, [load]);

  if (!signedIn) {
    return (
      <div className="ft-empty">
        <div className="ft-empty-title">Sign in to see your picks</div>
        <p className="ft-empty-detail">
          Your record and every pick you have made will appear here. Picks made in the
          old spreadsheet are attached automatically the first time you sign in.
        </p>
      </div>
    );
  }

  if (loading && !meta) return <div className="ft-state">Loading your picks…</div>;

  if (!rows.length) {
    return (
      <div className="ft-empty">
        <div className="ft-empty-title">No picks yet</div>
        <p className="ft-empty-detail">{meta?.note || 'Make some on the sheet.'}</p>
      </div>
    );
  }

  const r = meta?.record || {};

  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>Your picks — {sport === 'nfl' ? 'NFL' : 'College FBS'} {season}</h2>
        <span className="ft-panel-meta">
          {record(r.wins, r.losses, r.pushes)}
          {r.pending ? ` · ${r.pending} pending` : ''}
        </span>
      </div>

      <div className="ft-table-wrap">
        <table className="ft-table">
          <thead>
            <tr>
              <th>Wk</th><th>Game</th><th>Your pick</th><th>Type</th>
              <th>Result</th><th>Outcome</th><th>Vegas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const picked = p.selected === 'home' ? p.home_display : p.away_display;
              const spread = p.pick_type === 'ats'
                ? spreadFor(p.selected, p.graded_spread) : null;
              const outcome = p.is_push ? 'Push'
                : p.is_correct === true ? 'Won'
                  : p.is_correct === false ? 'Lost' : 'Pending';
              const tone = p.is_correct === true ? 'ft-pos'
                : p.is_correct === false ? 'ft-neg' : undefined;
              // The pick the market disagreed with and the entrant got right.
              const beatMarket = p.is_correct === true && p.vegas_correct === false;
              return (
                <tr key={`${p.game_id}-${p.pick_type}`}>
                  <td>{p.week}</td>
                  <td>{p.away_display} at {p.home_display}
                    <span className="pk-mine-kick">{kickoffLabel(p.kickoff)}</span>
                  </td>
                  <td>
                    <strong>{picked}</strong>
                    {spread && <span className="pk-side-spread"> {spread}</span>}
                    {p.took_underdog && <span className="pk-tag">dog</span>}
                  </td>
                  <td>{p.pick_type === 'ats' ? 'ATS' : 'SU'}</td>
                  <td>
                    {p.completed
                      ? `${p.away_score}–${p.home_score}`
                      : '—'}
                  </td>
                  <td className={tone}>{outcome}</td>
                  <td>
                    {beatMarket
                      ? <span className="pk-beat" title="The closing favourite lost this one">beat the line</span>
                      : p.vegas_side
                        ? (p.vegas_side === p.selected ? 'agreed' : 'disagreed')
                        : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
