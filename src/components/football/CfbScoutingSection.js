import { useEffect, useState } from 'react';
import ApiService from '../../services/api';
import { kickoff, pct } from './format';
import '../styles/CfbScouting.css';

/**
 * College football scouting report: one card per game for a week — the model's pick,
 * the market, both teams' ranking context, their leading players, and injuries.
 *
 * Injuries are shown with their limits. ESPN publishes almost no CFB injury data and the
 * model does not use it, so an empty list reads "no data", never "healthy".
 */

const CATEGORY_LABEL = { pass: 'Passing', rush: 'Rushing', rec: 'Receiving', def: 'Defense' };
const TOP_N = 25;

export function spreadLabel(game) {
  const s = game.market?.home_spread;
  if (s === null || s === undefined) return null;
  if (Math.abs(s) < 0.25) return "Pick'em";
  const fav = s > 0 ? game.home.name : game.away.name;
  return `${fav} by ${Math.abs(s).toFixed(1)}`;
}

function rankLine(r) {
  if (!r) return 'Unranked in the model';
  const bits = [`#${r.overall_rank ?? r.rank}`];
  if (r.record) bits.push(r.record);
  if (r.ap_rank) bits.push(`AP ${Math.round(r.ap_rank)}`);
  if (r.playoff_pct !== null && r.playoff_pct !== undefined) bits.push(`CFP ${Math.round(r.playoff_pct)}%`);
  return bits.join(' · ');
}

function TeamPanel({ team, injuriesKnown }) {
  return (
    <div className="cs-team">
      <h4 className="cs-team-name">{team.name}</h4>
      <p className="cs-team-rank">{rankLine(team.ranking)}</p>

      {team.key_players.length === 0 ? (
        <p className="cs-muted">No player stats yet.</p>
      ) : (
        <ul className="cs-players">
          {team.key_players.map((p) => (
            <li key={`${p.category}-${p.name}`}>
              <span className="cs-cat">{CATEGORY_LABEL[p.category] || p.category}</span>
              <span className="cs-player">{p.name}{p.position ? ` (${p.position})` : ''}</span>
              <span className="cs-stat">{p.stat}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="cs-inj">
        <span className="cs-cat">Injuries</span>
        {team.injuries.length > 0 ? (
          <ul>
            {team.injuries.map((i) => (
              <li key={`${i.player}-${i.reported}`}>
                <strong>{i.player}</strong> — {i.status}{i.detail ? `. ${i.detail}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <span className="cs-muted">{injuriesKnown ? 'None reported' : 'No data'}</span>
        )}
      </div>
    </div>
  );
}

function GameCard({ game }) {
  const { pick, market } = game;
  const spread = spreadLabel(game);
  const ranked = game.relevance !== null && game.relevance <= TOP_N;

  return (
    <details className={`cs-card${ranked ? ' cs-card--top' : ''}`}>
      <summary className="cs-summary">
        <div className="cs-matchup">
          <span className="cs-teams">
            {game.away.name} <span className="cs-at">at</span> {game.home.name}
          </span>
          <span className="cs-when">
            {game.status === 'final' ? 'Final' : kickoff(game.start_time)}
          </span>
        </div>
        <div className="cs-call">
          {pick ? (
            <>
              <span className="cs-pick">{pick.team}</span>
              <span className="cs-prob">{pct(pick.win_prob, 0)}</span>
              <span className="cs-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(pick.win_prob * 100)}%` }} />
              </span>
            </>
          ) : <span className="cs-muted">No pick yet</span>}
          {spread && <span className="cs-spread">Line: {spread}</span>}
          {game.disagreement === 'high' && (
            <span className="cs-flag" title="Models disagree on this game">Models split</span>
          )}
        </div>
      </summary>

      <div className="cs-body">
        <div className="cs-teams-grid">
          <TeamPanel team={game.away} injuriesKnown={game.injuries_available} />
          <TeamPanel team={game.home} injuriesKnown={game.injuries_available} />
        </div>

        {game.models.length > 0 && (
          <table className="cs-models">
            <caption>{pick?.label ? `Headline model: ${pick.label}` : 'Models'} · home win probability</caption>
            <tbody>
              {game.models.map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  <td>{pct(m.home_win_prob, 0)}</td>
                  <td>{m.margin === null || m.margin === undefined ? '' : `${m.margin > 0 ? '+' : ''}${m.margin.toFixed(1)} margin`}</td>
                </tr>
              ))}
              {market && (
                <tr>
                  <td>Market</td>
                  <td>{pct(market.home_win_prob, 0)}</td>
                  <td>{market.total ? `O/U ${market.total}` : ''}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}

export default function CfbScoutingSection({ league, season }) {
  const [week, setWeek] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topOnly, setTopOnly] = useState(false);

  useEffect(() => { setWeek(null); }, [league, season]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    ApiService.getCfbScouting({ season, week, division: league.division })
      .then((r) => { if (alive) setReport(r); })
      .catch(() => { if (alive) { setReport(null); setError('Could not load the scouting report.'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [league, season, week]);

  const games = (report?.games || []).filter((g) => !topOnly || (g.relevance !== null && g.relevance <= TOP_N));
  const meta = report?.meta || {};

  return (
    <section className="cs-section" aria-busy={loading}>
      <div className="cs-controls">
        <label>
          <span>Week</span>
          <select
            value={report?.week ?? ''}
            onChange={(e) => setWeek(Number(e.target.value))}
            aria-label="Week"
            disabled={!report?.weeks?.length}
          >
            {(report?.weeks || []).map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <label className="cs-check">
          <input type="checkbox" checked={topOnly} onChange={(e) => setTopOnly(e.target.checked)} />
          <span>Top {TOP_N} matchups only</span>
        </label>
      </div>

      {error && <p className="cs-error" role="alert">{error}</p>}
      {loading && !report && <p className="cs-muted">Loading scouting report…</p>}

      {report && (
        <>
          <p className="cs-notes">
            Ranks as of week {meta.rankings_as_of_week ?? '—'}
            {meta.player_stats_updated && `; player stats updated ${new Date(meta.player_stats_updated).toLocaleDateString()}`}.
            {' '}{meta.injuries?.note} Injuries are not used by the model.
          </p>
          {games.length === 0 && !loading && <p className="cs-muted">No games match.</p>}
          <div className="cs-list">
            {games.map((g) => <GameCard key={g.game_id} game={g} />)}
          </div>
        </>
      )}
    </section>
  );
}
