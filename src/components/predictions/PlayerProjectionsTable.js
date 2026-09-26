import React, { useMemo, useState } from 'react';
import {
  STAT_LABEL, STAT_TITLE, filterPlayers, fmtNum, fmtPct, fmtRange, pivotPlayers,
  sortPlayers, statCalibration, statsForRole,
} from '../../utils/unifiedPredictions';
import DistTerm from './DistTerm';

/**
 * Player stat projections from the simulator: one row per player, one column per stat,
 * each cell the mean with its 90% range and P(≥1) where the API gives it. Each stat
 * column says whether that projection is calibrated (scored against real box scores) or
 * experimental, with the model's own calibration note as the explanation.
 *
 * The table scrolls inside its own box on a phone, with the player column pinned, so the
 * page itself never scrolls sideways.
 */

const ROLES = [
  { key: 'batter', label: 'Batters' },
  { key: 'starter', label: 'Starting pitchers' },
];

function CalBadge({ cal }) {
  if (!cal) return null;
  return (
    <DistTerm term={cal.calibrated ? 'calibrated' : 'experimental'} note={cal.note || undefined}>
      <span className={`up-cal up-cal--${cal.calibrated ? 'ok' : 'exp'}`}>
        {cal.calibrated ? 'calibrated' : 'experimental'}
      </span>
    </DistTerm>
  );
}

function SortHeader({ label, title, k, sort, setSort, children, className = '' }) {
  const on = sort.key === k;
  const next = () => setSort(on ? { key: k, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'name' || k === 'team' || k === 'order' ? 'asc' : 'desc' });
  return (
    <th scope="col" className={className} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="up-sort" onClick={next} title={title ? `Sort by ${title}` : `Sort by ${label}`}>
        {label}
        <span aria-hidden="true" className="up-sort-ind">{on ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
      {children}
    </th>
  );
}

function Cell({ r }) {
  if (!r) return <td className="num up-pcell up-pcell--none" title="No projection for this stat">—</td>;
  return (
    <td className="num up-pcell">
      <span className="up-pcell-mean">{fmtNum(r.mean, 2)}</span>
      <span className="up-pcell-range" title={`90% range p05–p95; min ${r.min ?? '—'}, max ${r.max ?? '—'}`}>{fmtRange(r)}</span>
      {r.p_at_least_1 != null && <span className="up-pcell-p1" title="Share of simulated games with at least one">≥1 {fmtPct(r.p_at_least_1)}</span>}
    </td>
  );
}

function RoleTable({ role, players, gameLabel }) {
  const [sort, setSort] = useState({ key: role === 'batter' ? 'order' : 'team', dir: 'asc' });
  const stats = useMemo(() => statsForRole(players, role), [players, role]);
  const rows = useMemo(() => sortPlayers(players, sort), [players, sort]);
  const label = ROLES.find((r) => r.key === role)?.label;
  if (!rows.length) return null;
  return (
    <div className="up-scroll up-ptable-wrap">
      <table className="up-table up-ptable" data-testid={`players-${role}`}>
        <caption>{label} · {rows.length} {rows.length === 1 ? 'player' : 'players'}</caption>
        <thead>
          <tr>
            {role === 'batter' && <SortHeader label="#" title="batting order" k="order" sort={sort} setSort={setSort} className="num up-col-order" />}
            <SortHeader label="Player" k="name" sort={sort} setSort={setSort} className="up-col-player" />
            <SortHeader label="Team" k="team" sort={sort} setSort={setSort} />
            {stats.map((s) => (
              <SortHeader key={s} label={STAT_LABEL[s] || s} title={STAT_TITLE[s]} k={s} sort={sort} setSort={setSort} className="num">
                <CalBadge cal={statCalibration(rows, s)} />
              </SortHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.key}>
              {role === 'batter' && <td className="num mono up-col-order">{p.batting_order ?? '—'}</td>}
              <th scope="row" className="up-col-player">
                <span className="up-pname">{p.player_name}</span>
                {gameLabel && <span className="up-pgame">{gameLabel(p.game_id)}</span>}
                {p.pregame === false && <span className="up-flag up-flag--late">after start</span>}
              </th>
              <td className="mono">{p.team_abbr}</td>
              {stats.map((s) => <Cell key={s} r={p.stats[s]} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlayerProjectionsTable({ rows, games = null, gameLabel = null, idPrefix = 'pp' }) {
  const players = useMemo(() => pivotPlayers(rows), [rows]);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('all');
  const [role, setRole] = useState('all');
  const [game, setGame] = useState('all');
  const teams = useMemo(() => [...new Set(players.map((p) => p.team_abbr).filter(Boolean))].sort(), [players]);
  const shown = useMemo(() => filterPlayers(players, { search, team, role, game }), [players, search, team, role, game]);
  const filtered = shown.length !== players.length;

  return (
    <div className="up-players">
      <div className="up-pfilters" role="group" aria-label="Filter players">
        <label className="up-field">
          <span>Search</span>
          <input id={`${idPrefix}-search`} type="search" value={search} placeholder="Player or team"
            onChange={(e) => setSearch(e.target.value)} aria-label="Search players" />
        </label>
        <label className="up-field">
          <span>Team</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="up-field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            <option value="all">Batters and starters</option>
            <option value="batter">Batters</option>
            <option value="starter">Starting pitchers</option>
          </select>
        </label>
        {games && games.length > 1 && (
          <label className="up-field">
            <span>Game</span>
            <select value={game} onChange={(e) => setGame(e.target.value)} aria-label="Game">
              <option value="all">All games</option>
              {games.map((g) => <option key={g.game_id} value={g.game_id}>{g.away.abbr} @ {g.home.abbr}</option>)}
            </select>
          </label>
        )}
        <span className="up-count">
          {shown.length} of {players.length}
          {filtered && (
            <button type="button" className="up-linkbtn" onClick={() => { setSearch(''); setTeam('all'); setRole('all'); setGame('all'); }}>clear</button>
          )}
        </span>
      </div>
      <p className="up-note">
        Each cell: the <DistTerm term="mean">mean</DistTerm>, then the <DistTerm term="range90">90% range</DistTerm>,
        then <DistTerm term="pAtLeast1">P(≥1)</DistTerm> where the simulator gives it.
      </p>
      {shown.length === 0 && <p className="up-empty">No players match these filters.</p>}
      {ROLES.filter((r) => role === 'all' || r.key === role).map((r) => (
        <RoleTable key={r.key} role={r.key} players={shown.filter((p) => p.role === r.key)} gameLabel={gameLabel} />
      ))}
    </div>
  );
}
