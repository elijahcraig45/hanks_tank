import React, { useMemo, useState } from 'react';
import { MiniDist } from './DistBars';
import {
  TABLE_COLUMNS, compareBy, fmtMeanRecord, fmtNum, fmtPct, fmtRecord, fmtSigned,
  groupOf, parseDist,
} from './simFormat';

/**
 * Standings projection: grouped by division (NFL) or conference (CFB), sortable, one
 * button per team to open the drill-down. Scrolls inside its own box on a phone, with
 * the team column pinned.
 */
export default function ProjectionTable({ sport, teams, onSelect }) {
  const [sort, setSort] = useState({ key: 'mean_wins', dir: 'desc' });
  const [grouped, setGrouped] = useState(true);
  const [group, setGroup] = useState('');

  const probCols = TABLE_COLUMNS[sport] || TABLE_COLUMNS.nfl;
  const columns = [
    { key: 'team_name', label: 'Team', title: 'Team (tap for detail)' },
    { key: 'record', label: 'Now', title: 'Current record' },
    { key: 'mean_wins', label: 'Proj', title: 'Mean final regular-season record across simulations' },
    { key: 'wins_p50', label: 'Wins', title: 'Distribution of final regular-season wins (80% range beside it)' },
    { key: 'rating', label: 'Rtg', title: 'Current rating: points better than an average team' },
    ...probCols,
    ...(sport === 'cfb'
      ? [{ key: 'exp_final_rank', label: 'Exp rk', title: 'Expected final committee-proxy rank (lower is better)', asc: true }]
      : []),
  ];

  const groups = useMemo(
    () => [...new Set(teams.map((t) => groupOf(t, sport)))].sort((a, b) => a.localeCompare(b)),
    [teams, sport]
  );

  const visible = useMemo(
    () => (group ? teams.filter((t) => groupOf(t, sport) === group) : teams),
    [teams, group, sport]
  );

  const sections = useMemo(() => {
    const cmp = compareBy(sort.key, sort.dir);
    if (!grouped) return [{ name: null, rows: [...visible].sort(cmp) }];
    const m = new Map();
    visible.forEach((t) => {
      const g = groupOf(t, sport);
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(t);
    });
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, rows]) => ({ name, rows: rows.sort(cmp) }));
  }, [visible, grouped, sort, sport]);

  const clickSort = (col) => {
    setSort((s) => (s.key === col.key
      ? { key: col.key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
      : { key: col.key, dir: col.key === 'team_name' || col.asc ? 'asc' : 'desc' }));
  };

  return (
    <div className="ssim-table-block">
      <div className="ssim-controls">
        <label className="ssim-field">
          <span>{sport === 'nfl' ? 'Division' : 'Conference'}</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label={sport === 'nfl' ? 'Division' : 'Conference'}>
            <option value="">All</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="ssim-check">
          <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
          <span>Group by {sport === 'nfl' ? 'division' : 'conference'}</span>
        </label>
      </div>

      <div className="ssim-scroll" tabIndex={0} aria-label="Projected standings table, scrolls sideways">
        <table className="ssim-table" data-testid="ssim-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.key === 'team_name' ? 'ssim-col-team' : c.key === 'wins_p50' ? undefined : 'ssim-num'}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" className="ssim-sort" title={c.title} onClick={() => clickSort(c)}>
                      {c.label}
                      <span className="ssim-sort-ind" aria-hidden="true">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          {sections.map((sec) => (
            <tbody key={sec.name || 'all'}>
              {sec.name && (
                <tr className="ssim-group-row">
                  <th colSpan={columns.length} scope="colgroup"><span className="ssim-group-name">{sec.name}</span></th>
                </tr>
              )}
              {sec.rows.map((t) => (
                <tr key={t.team} data-testid={`ssim-row-${t.team}`}>
                  <th scope="row" className="ssim-col-team">
                    <button type="button" className="ssim-team-btn" onClick={() => onSelect(t.team)}>
                      <span className="ssim-team-abbr">{t.team}</span>
                      <span className="ssim-team-name">{t.team_name}</span>
                    </button>
                  </th>
                  <td className="ssim-num">{fmtRecord(t.wins, t.losses, t.ties)}</td>
                  <td className="ssim-num ssim-strong">{fmtMeanRecord(t)}</td>
                  <td>
                    <span className="ssim-dist">
                      <MiniDist dist={parseDist(t.wins_dist)} p10={t.wins_p10} p90={t.wins_p90} />
                      <span className="ssim-range">
                        {t.wins_p10 != null && t.wins_p90 != null ? `${Math.round(t.wins_p10)}–${Math.round(t.wins_p90)}` : ''}
                      </span>
                    </span>
                  </td>
                  <td className="ssim-num" title={t.rating_sd != null ? `± ${fmtNum(t.rating_sd)}` : undefined}>
                    {fmtSigned(t.rating)}
                  </td>
                  {probCols.map((c) => (
                    <td key={c.key} className="ssim-num ssim-heat" style={{ '--p': Number(t[c.key]) || 0 }}>
                      <span>{fmtPct(t[c.key])}</span>
                    </td>
                  ))}
                  {sport === 'cfb' && (
                    <td
                      className="ssim-num"
                      title={t.rank_p10 != null ? `80% range ${Math.round(t.rank_p10)}–${Math.round(t.rank_p90)}` : undefined}
                    >
                      {fmtNum(t.exp_final_rank, 0)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="ssim-foot">
        Percentages are the share of simulated seasons in which it happened. &ldquo;Proj&rdquo; is
        the average final record; the bars show how spread out it is. Tap a team for detail.
      </p>
    </div>
  );
}
