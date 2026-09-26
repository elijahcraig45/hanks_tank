import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import { MLB, footballGamePath, predictionsGamePath } from '../../config/sports';
import {
  disagreementOf, featuredPick, fmtPct, hasDist, modelRowsFor,
} from '../../utils/unifiedPredictions';
import ModelRows, { modelName } from './ModelRows';
import SimDetail from './SimDetail';
import PlayerProjectionsTable from './PlayerProjectionsTable';
import DistTerm from './DistTerm';

/**
 * One game on the unified slate: status and result, the consensus and how much the
 * models disagree, the featured model's pick, and a row for every model. The simulation
 * detail and the per-game player projections open in place, one click away.
 */

export function statusText(game) {
  if (game.status === 'final') {
    const r = game.result || {};
    return r.home_score != null ? `Final · ${game.away.abbr} ${r.away_score}–${r.home_score} ${game.home.abbr}` : 'Final';
  }
  if (game.status === 'live') {
    const r = game.result || {};
    const lbl = game.status_detail && game.status_detail !== 'In Progress' ? game.status_detail : 'Live';
    return r.home_score != null ? `${lbl} · ${game.away.abbr} ${r.away_score}–${r.home_score} ${game.home.abbr}` : 'Live';
  }
  if (!game.start_time) return 'Scheduled';
  const d = new Date(game.start_time);
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET`;
}

function Headline({ game, featured, models, sport }) {
  const m = models.find((x) => x.key === featured);
  const name = m ? modelName(sport, m) : featured;
  const pick = featuredPick(game, featured);
  if (!pick) {
    return (
      <p className="up-headline up-headline--none">
        {name} has no pick for this game{m && m.available === false ? ' (not available yet)' : ''}.
      </p>
    );
  }
  const team = pick.side === 'home' ? game.home : game.away;
  const r = game.result || {};
  let verdict = null;
  if (game.status === 'final' && r.home_score != null && r.home_score !== r.away_score) {
    const homeWon = r.home_score > r.away_score;
    const pred = game.predictions[featured];
    const hit = (pick.side === 'home') === homeWon;
    verdict = pred?.pregame === false
      ? <span className="up-verdict up-verdict--late" title="Written after the start, so never scored">not scored</span>
      : <span className={`up-verdict up-verdict--${hit ? 'hit' : 'miss'}`}>{hit ? '✓ hit' : '✗ miss'}</span>;
  }
  return (
    <p className="up-headline">
      <span className="up-headline-lbl">{name} picks</span>
      <strong className="up-headline-team">{team.name}</strong>
      <span className="up-headline-prob">{fmtPct(pick.prob)}</span>
      {verdict}
    </p>
  );
}

export default function UnifiedGameCard({
  game, models, shownKeys, featured, sport, division, slateQuery,
  isFavorite, onToggleFavorite, lineupConfirmed, extraMeta,
  defaultOpen = null, standalone = false,
}) {
  const [open, setOpen] = useState(defaultOpen); // null | 'sim' | 'players'
  const [simModel, setSimModel] = useState(null);
  const [players, setPlayers] = useState({ loading: false, rows: null, error: null });
  const rows = modelRowsFor(game, models, shownKeys);
  const dis = disagreementOf(game);
  const c = game.consensus || {};
  const anySim = models.some((m) => hasDist(game.predictions?.[m.key]));
  const hasPlayers = sport === 'mlb' && Object.values(game.predictions || {}).some((p) => p?.has_players);

  const requested = useRef(false);
  const queryRef = useRef(slateQuery);
  queryRef.current = slateQuery;
  useEffect(() => {
    if (open !== 'players' || requested.current) return undefined;
    requested.current = true;
    let alive = true;
    setPlayers({ loading: true, rows: null, error: null });
    apiService.getPlayerProjections(sport, { gameId: game.game_id, ...queryRef.current })
      .then((d) => {
        if (!alive) return;
        setPlayers({
          loading: false, rows: d?.rows || [], error: null,
          note: d?.available === false ? (d.note || 'Not available.') : null,
        });
      })
      .catch((e) => { if (alive) setPlayers({ loading: false, rows: [], error: e.message }); });
    return () => { alive = false; requested.current = false; };
  }, [open, sport, game.game_id]);

  const toggle = (what) => setOpen((o) => (o === what ? null : what));
  const openDetail = (key) => { setSimModel(key); setOpen('sim'); };
  const gamePath = predictionsGamePath(sport, division, game.game_id, slateQuery);
  const star = (team) => onToggleFavorite && (
    <button
      type="button"
      className={`up-fav${isFavorite?.(team.abbr) ? ' is-on' : ''}`}
      aria-pressed={Boolean(isFavorite?.(team.abbr))}
      aria-label={`${isFavorite?.(team.abbr) ? 'Remove' : 'Add'} ${team.name} ${isFavorite?.(team.abbr) ? 'from' : 'to'} favorites`}
      onClick={() => onToggleFavorite(team)}
    >★</button>
  );

  return (
    <article className={`up-card up-card--${game.status}`} id={`game-${game.game_id}`} data-testid="game-card">
      <header className="up-card-head">
        <div className="up-card-status">
          <span className={`up-status up-status--${game.status}`}>{statusText(game)}</span>
          {lineupConfirmed && sport === 'mlb' && (
            <span className={`up-chip${lineupConfirmed(game) ? ' up-chip--ok' : ''}`}>
              {lineupConfirmed(game) ? 'lineups in' : 'probable lineups'}
            </span>
          )}
        </div>
        <h3 className="up-matchup">
          <span className="up-team">{star(game.away)}{game.away.name}</span>
          <span className="up-at">@</span>
          <span className="up-team">{star(game.home)}{game.home.name}</span>
        </h3>
        {extraMeta && <p className="up-card-meta">{extraMeta}</p>}
        <div className="up-consensus">
          <span>
            <DistTerm term="consensus">Consensus</DistTerm>{' '}
            <strong>{c.home_win_prob_mean != null ? `${game.home.abbr} ${fmtPct(c.home_win_prob_mean)}` : '—'}</strong>
            {c.models_n != null && <span className="up-muted"> · {c.models_n} model{c.models_n === 1 ? '' : 's'}</span>}
          </span>
          {dis && (
            <span className={`up-dis up-dis--${dis}`}>
              <DistTerm term="disagreement" note={`Models are ${c.spread != null ? `${Math.round(c.spread * 100)} points` : ''} apart on the home-win probability. Low is under 8 points, medium 8 to 15, high 15 or more.`}>
                {dis} disagreement
              </DistTerm>
            </span>
          )}
        </div>
      </header>

      <Headline game={game} featured={featured} models={models} sport={sport} />

      <ModelRows rows={rows} game={game} sport={sport} featured={featured} onOpenDetail={openDetail} />

      <div className="up-card-actions">
        <button type="button" className={`up-btn up-btn--sim${open === 'sim' ? ' is-on' : ''}`}
          aria-expanded={open === 'sim'} aria-controls={`sim-${game.game_id}`} onClick={() => toggle('sim')}>
          {anySim ? 'Simulation: scores & ranges' : 'Simulation detail'} <span aria-hidden="true">{open === 'sim' ? '▴' : '▾'}</span>
        </button>
        {hasPlayers && (
          <button type="button" className={`up-btn${open === 'players' ? ' is-on' : ''}`}
            aria-expanded={open === 'players'} aria-controls={`players-${game.game_id}`} onClick={() => toggle('players')}>
            Player projections <span aria-hidden="true">{open === 'players' ? '▴' : '▾'}</span>
          </button>
        )}
        <span className="up-card-links">
          {!standalone && <Link to={gamePath}>Game view →</Link>}
          {sport === 'mlb' && <Link to={MLB.game(game.game_id)}>Game Center</Link>}
          {sport !== 'mlb' && sport === 'cfb' && <Link to={footballGamePath(division || 'fbs', game.game_id)}>Box score</Link>}
        </span>
      </div>

      {open === 'sim' && (
        <div id={`sim-${game.game_id}`} className="up-panel">
          <SimDetail game={game} sport={sport} models={models} initialModel={simModel} key={simModel || 'x'} />
        </div>
      )}
      {open === 'players' && (
        <div id={`players-${game.game_id}`} className="up-panel">
          {players.loading && <p className="up-empty">Loading player projections…</p>}
          {players.error && <p className="up-warn">Could not load player projections: {players.error}</p>}
          {players.note && <p className="up-warn">{players.note}</p>}
          {players.rows && !players.loading && !players.note && (
            players.rows.length
              ? <PlayerProjectionsTable rows={players.rows} idPrefix={`pp-${game.game_id}`} />
              : <p className="up-empty">No player projections stored for this game yet.</p>
          )}
        </div>
      )}
    </article>
  );
}
