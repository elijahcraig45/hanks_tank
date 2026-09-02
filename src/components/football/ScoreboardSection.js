import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../services/api';
import { gameClock, kickoff } from './format';

/**
 * The week's games — live scores where they are being played, kickoff times where they
 * are not.
 *
 * One request covers the whole week, so this polls while anything is in progress and
 * sits still otherwise. Each tile links to the game page.
 *
 * Scores and fixtures come from two different endpoints because they are different
 * things: /scoreboard is the live view of a week, /schedule is the fixture list and
 * reaches further forward. The toggle picks between them rather than trying to make one
 * serve both.
 */

const LIVE_REFRESH_MS = 30000;

function GameTile({ game, league }) {
  const live = game.status === 'in_progress';
  const done = game.status === 'completed';
  const homeWon = done && Number(game.home.points) > Number(game.away.points);
  const awayWon = done && Number(game.away.points) > Number(game.home.points);

  return (
    <Link
      className={`fg-tile${live ? ' fg-tile--live' : ''}`}
      to={`/football/${league}/game/${game.game_id}`}
    >
      <div className="fg-tile-top">
        <span className={`fg-state fg-state--${game.status}`}>{gameClock(game)}</span>
        {game.tv && <span className="fg-tv">{game.tv}</span>}
      </div>

      <div className={`fg-tile-row${awayWon ? ' fg-tile-row--won' : ''}`}>
        <span className="fg-tile-team">{game.away.name}</span>
        <span className="fg-tile-pts">{game.away.points ?? '—'}</span>
      </div>
      <div className={`fg-tile-row${homeWon ? ' fg-tile-row--won' : ''}`}>
        <span className="fg-tile-team">{game.home.name}</span>
        <span className="fg-tile-pts">{game.home.points ?? '—'}</span>
      </div>

      {game.situation && <div className="fg-tile-sit">{game.situation}</div>}
      {!game.situation && game.venue?.name && (
        <div className="fg-tile-sit fg-tile-sit--muted">{game.venue.name}</div>
      )}
    </Link>
  );
}

function ScheduleRow({ game, league }) {
  return (
    <tr>
      <td>{game.week}</td>
      <td>{kickoff(game.start_date)}</td>
      <td>
        <Link to={`/football/${league}/game/${game.game_id}?week=${game.week}`}>
          {game.away_school} at {game.home_school}
        </Link>
      </td>
      <td>{game.home_conference || '—'}</td>
      <td>
        {game.completed
          ? `${game.away_points}–${game.home_points}`
          : (game.start_time_tbd ? 'TBD' : '—')}
      </td>
    </tr>
  );
}

export default function ScoreboardSection({ league, season }) {
  const [view, setView] = useState('scores');
  const [week, setWeek] = useState('');
  const [games, setGames] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = view === 'scores'
        ? await ApiService.getFootballScoreboard(league.sport, {
          season, week: week || undefined, division: league.division,
        })
        : await ApiService.getFootballSchedule(league.sport, {
          season, week: week || undefined, division: league.division,
        });
      setGames(res.data || []);
      setMeta(res.meta || null);
    } catch {
      setGames([]); setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [league.sport, league.division, season, week, view]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const anyLive = games.some((g) => g.status === 'in_progress');
  useEffect(() => {
    if (view !== 'scores' || !anyLive) return undefined;
    const id = setInterval(load, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [view, anyLive, load]);

  if (loading && !meta) return <div className="ft-state">Loading games…</div>;

  const toggle = (
    <div className="ft-scope-switch">
      {[['scores', 'Scores'], ['schedule', 'Schedule']].map(([k, label]) => (
        <button
          key={k}
          className={`ft-scope${view === k ? ' ft-scope--on' : ''}`}
          onClick={() => setView(k)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (meta?.note && !games.length) {
    return (
      <>
        {toggle}
        <div className="ft-empty">
          <div className="ft-empty-title">No {view} for {league.label}</div>
          <p className="ft-empty-detail">{meta.note}</p>
        </div>
      </>
    );
  }

  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>{view === 'scores' ? 'Scores' : 'Schedule'} — {league.label} {season}</h2>
        <span className="ft-panel-meta">
          {loading ? 'Loading…' : `${games.length} games`}
          {anyLive ? ` · ${meta?.live ?? 0} live` : ''}
        </span>
      </div>

      {toggle}

      <div className="ft-filters">
        <label>
          Week
          <input
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            placeholder={view === 'scores' ? 'current' : 'all'}
          />
        </label>
      </div>

      {view === 'scores' ? (
        <div className="fg-tiles">
          {games.map((g) => (
            <GameTile key={g.game_id} game={g} league={league.key} />
          ))}
        </div>
      ) : (
        <div className="ft-table-wrap">
          <table className="ft-table">
            <thead>
              <tr>
                <th>Wk</th><th>Kickoff</th><th>Game</th><th>Conference</th><th>Result</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <ScheduleRow key={g.game_id} game={g} league={league.key} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !games.length && (
        <div className="ft-state">No games for that week.</div>
      )}
    </section>
  );
}
