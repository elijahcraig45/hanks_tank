import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import ApiService from '../../services/api';
import GameWinProbabilityChart from './GameWinProbabilityChart';
import DriveChart from './DriveChart';
import { gameClock, kickoff, pct } from './format';
import '../styles/FootballGamePage.css';

/**
 * One football game, in full.
 *
 * Panels are drawn from `meta.available` rather than assumed. A game can legitimately
 * arrive with a win-probability curve and no box score — the upstream box-score feed
 * needs a week that a brand-new fixture has not been recorded with yet — and the page
 * has to read as "this part isn't in yet" rather than as broken. `meta.notes` carries
 * the reason, which is the API's to give, not this component's to guess.
 *
 * A game in progress re-fetches on a timer; a finished one is fetched once. There is no
 * point polling a final score, and the backend caches completed games for a day anyway.
 */

const LEAGUE_TO_SPORT = { nfl: 'nfl', fbs: 'cfb', fcs: 'cfb' };
const LIVE_REFRESH_MS = 30000;

function Linescore({ game }) {
  const home = game.home;
  const away = game.away;
  const periods = Math.max(
    home.line_scores?.length || 0,
    away.line_scores?.length || 0,
    4,
  );
  const cols = Array.from({ length: periods }, (_, i) => i + 1);

  return (
    <div className="ft-table-wrap">
      <table className="ft-table fg-linescore">
        <thead>
          <tr>
            <th>Team</th>
            {cols.map((c) => <th key={c}>{c <= 4 ? `Q${c}` : `OT${c - 4}`}</th>)}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {[away, home].map((t) => (
            <tr key={t.name}>
              <td><strong>{t.name}</strong></td>
              {cols.map((c) => (
                <td key={c}>{t.line_scores?.[c - 1] ?? '—'}</td>
              ))}
              <td><strong>{t.points ?? '—'}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Team box score. Stat categories come from the feed, so they are not hardcoded. */
function TeamBox({ teamBox }) {
  const teams = teamBox?.[0]?.teams;
  if (!teams?.length) return <p className="ft-note">No team box score for this game.</p>;

  const categories = [];
  for (const t of teams) {
    for (const s of t.stats || []) {
      if (!categories.includes(s.category)) categories.push(s.category);
    }
  }
  const valueFor = (team, category) => (team.stats || [])
    .find((s) => s.category === category)?.stat ?? '—';

  return (
    <div className="ft-table-wrap">
      <table className="ft-table">
        <thead>
          <tr>
            <th>Stat</th>
            {teams.map((t) => <th key={t.teamId ?? t.team}>{t.team}</th>)}
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c}>
              <td>{c}</td>
              {teams.map((t) => (
                <td key={`${t.team}-${c}`}>{valueFor(t, c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Player box score, one table per statistical category per team. */
function PlayerBox({ playerBox }) {
  const teams = playerBox?.[0]?.teams;
  if (!teams?.length) {
    return <p className="ft-note">No player box score for this game.</p>;
  }

  return (
    <div className="fg-playerbox">
      {teams.map((team) => (
        <div key={team.team} className="fg-playerbox-team">
          <h4>{team.team}</h4>
          {(team.categories || []).map((cat) => (
            <div key={cat.name} className="fg-playerbox-cat">
              <h5>{cat.name}</h5>
              {(cat.types || []).map((type) => (
                <div key={type.name} className="fg-statline">
                  <span className="fg-statline-label">{type.name}</span>
                  <span className="fg-statline-values">
                    {(type.athletes || []).slice(0, 4).map((a) => (
                      <span key={a.id ?? a.name} className="fg-statline-athlete">
                        {a.name} <strong>{a.stat}</strong>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The model's own pick, reusing the columns the picks board already reads. */
function ModelPick({ prediction, game }) {
  if (!prediction) return null;
  const homeProb = Number(prediction.home_win_probability);
  const pickedHome = prediction.predicted_winner === prediction.home_team_name;
  const settled = prediction.prediction_correct !== null
    && prediction.prediction_correct !== undefined;

  return (
    <div className="fg-pick">
      <div className="fg-pick-head">
        <span className={`ft-tier ft-tier--${prediction.confidence_tier}`}>
          {prediction.confidence_tier}
        </span>
        <span className="fg-pick-model">{prediction.model_version}</span>
        {settled && (
          <span className={prediction.prediction_correct ? 'fg-hit' : 'fg-miss'}>
            {prediction.prediction_correct ? '✓ correct' : '✗ missed'}
          </span>
        )}
      </div>
      <p className="fg-pick-line">
        Picked <strong>{prediction.predicted_winner}</strong> at{' '}
        {pct(pickedHome ? homeProb : 1 - homeProb, 0)}
      </p>
      {game?.betting?.spread !== undefined && game?.betting?.spread !== null && (
        <p className="ft-note">
          Closing line: {game.betting.spread > 0 ? '+' : ''}{game.betting.spread}
        </p>
      )}
    </div>
  );
}

export default function FootballGamePage() {
  const { league = 'fbs', gameId } = useParams();
  const [search] = useSearchParams();
  const sport = LEAGUE_TO_SPORT[league] || 'cfb';

  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await ApiService.getFootballGame(sport, gameId, {
        season: search.get('season') || undefined,
        week: search.get('week') || undefined,
      });
      setPayload(res);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Could not load this game.');
    } finally {
      setLoading(false);
    }
  }, [sport, gameId, search]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const game = payload?.data?.game || null;
  const isLive = game?.status === 'in_progress';

  // Poll only while the game is actually being played.
  useEffect(() => {
    if (!isLive) return undefined;
    const id = setInterval(load, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [isLive, load]);

  if (loading) return <div className="ft-state">Loading game…</div>;

  if (error || !payload?.success) {
    return (
      <div className="ft-page">
        <div className="ft-empty">
          <div className="ft-empty-title">Could not load this game</div>
          <p className="ft-empty-detail">{error || 'The game could not be found.'}</p>
          <Link className="ft-empty-action" to={`/football/${league}/scoreboard`}>
            Back to the scoreboard
          </Link>
        </div>
      </div>
    );
  }

  const meta = payload.meta || {};
  const data = payload.data || {};
  const available = new Set(meta.available || []);
  const notes = meta.notes || {};

  // A league with no live feed at all answers with a note and no game.
  if (!game && meta.note) {
    return (
      <div className="ft-page">
        <div className="ft-empty">
          <div className="ft-empty-title">Not available for this league</div>
          <p className="ft-empty-detail">{meta.note}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ft-page fg-page">
      <header className="fg-hero">
        <div className="fg-hero-status">
          <span className={`fg-state fg-state--${game?.status || 'unknown'}`}>
            {gameClock(game)}
          </span>
          {game?.tv && <span className="fg-tv">{game.tv}</span>}
          {isLive && <span className="fg-live-dot" title="Refreshing" />}
        </div>

        <h1 className="fg-title">
          <span className="fg-team">{game?.away?.name}</span>
          <span className="fg-score">{game?.away?.points ?? '—'}</span>
          <span className="fg-at">at</span>
          <span className="fg-score">{game?.home?.points ?? '—'}</span>
          <span className="fg-team">{game?.home?.name}</span>
        </h1>

        <div className="fg-hero-meta">
          {game?.venue?.name && (
            <span>
              {game.venue.name}
              {game.venue.city ? `, ${game.venue.city}` : ''}
            </span>
          )}
          {game?.start_date && <span>{kickoff(game.start_date)}</span>}
          {game?.weather?.temperature !== undefined && (
            <span>
              {Math.round(game.weather.temperature)}°
              {game.weather.description ? ` ${game.weather.description}` : ''}
            </span>
          )}
          {game?.neutral_site && <span>Neutral site</span>}
        </div>

        {game?.last_play && (
          <p className="fg-lastplay"><strong>Last play:</strong> {game.last_play}</p>
        )}
      </header>

      <section className="ft-panel">
        <div className="ft-panel-head"><h2>Score</h2></div>
        {game ? <Linescore game={game} /> : <p className="ft-note">No linescore yet.</p>}
        <ModelPick prediction={data.prediction} game={game} />
      </section>

      {available.has('win_probability') ? (
        <section className="ft-panel">
          <GameWinProbabilityChart
            plays={data.win_probability}
            homeName={game?.home?.name || 'Home'}
            awayName={game?.away?.name || 'Away'}
          />
        </section>
      ) : notes.win_probability && (
        <section className="ft-panel">
          <div className="ft-panel-head"><h2>Win probability</h2></div>
          <p className="ft-note">{notes.win_probability}</p>
        </section>
      )}

      {available.has('drives') ? (
        <section className="ft-panel">
          <DriveChart
            drives={data.drives}
            homeName={game?.home?.name || 'Home'}
            awayName={game?.away?.name || 'Away'}
          />
        </section>
      ) : notes.drives && (
        <section className="ft-panel">
          <div className="ft-panel-head"><h2>Drives</h2></div>
          <p className="ft-note">{notes.drives}</p>
        </section>
      )}

      <section className="ft-panel">
        <div className="ft-panel-head"><h2>Team stats</h2></div>
        {available.has('team_box')
          ? <TeamBox teamBox={data.team_box} />
          : <p className="ft-note">{notes.team_box || 'No team box score yet.'}</p>}
      </section>

      <section className="ft-panel">
        <div className="ft-panel-head"><h2>Players</h2></div>
        {available.has('player_box')
          ? <PlayerBox playerBox={data.player_box} />
          : <p className="ft-note">{notes.player_box || 'No player box score yet.'}</p>}
      </section>

      <p className="ft-note">
        <Link to={`/football/${league}/scoreboard`}>← All {league.toUpperCase()} games</Link>
      </p>
    </div>
  );
}
