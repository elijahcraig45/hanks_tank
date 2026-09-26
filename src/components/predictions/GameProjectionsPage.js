import React, { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { predictionsPath } from '../../config/sports';
import { loadFavoriteTeams, toggleFavoriteTeam } from '../../utils/favorites';
import { loadSportFavorites, toggleSportFavorite } from '../../utils/unifiedPredictions';
import UnifiedGameCard from './UnifiedGameCard';
import ExportToolbar from './ExportToolbar';
import useSlate, { SPORT_LABEL, todayEt } from './useSlate';
import './UnifiedPredictions.css';

/**
 * One game's unified card on its own page, with the simulation detail open: the target
 * of the homepage tiles and of "Game view" on the slate. The game is read from the slate
 * (by ?date, or ?season&week), so it is the same data as the slate card.
 */
export default function GameProjectionsPage({ sport }) {
  const { league, gameId } = useParams();
  const division = sport === 'cfb' ? (league || 'fbs') : null;
  const [params] = useSearchParams();
  const query = useMemo(() => (sport === 'mlb'
    ? { date: params.get('date') || todayEt() }
    : { season: Number(params.get('season')) || null, week: Number(params.get('week')) || null, division }),
  [sport, params, division]);
  const { data, loading, error } = useSlate(sport, query);
  const game = (data?.games || []).find((g) => String(g.game_id) === String(gameId));
  const featured = params.get('featured') || data?.featured_default;

  const [favs, setFavs] = useState(() => (sport === 'mlb'
    ? loadFavoriteTeams().map((t) => t.abbreviation) : loadSportFavorites(sport)));
  const isFavorite = useCallback((a) => favs.includes(a), [favs]);
  const onToggleFavorite = (team) => setFavs(sport === 'mlb'
    ? toggleFavoriteTeam({ abbreviation: team.abbr, name: team.name, teamId: Number(team.id) || team.id }).map((t) => t.abbreviation)
    : toggleSportFavorite(sport, team.abbr));

  const slateQuery = useMemo(() => (sport === 'mlb'
    ? { date: data?.date || query.date }
    : { season: data?.season, week: data?.week, division }), [sport, data, query, division]);
  const back = `${predictionsPath(sport, division)}${sport === 'mlb' ? `?date=${slateQuery.date}` : (slateQuery.week ? `?season=${slateQuery.season}&week=${slateQuery.week}` : '')}`;

  return (
    <div className="up-page" data-sport={sport}>
      <header className="ht-page-head">
        <div className="ht-page-head-inner">
          <div>
            <p className="ht-eyebrow">{SPORT_LABEL[sport]} · Predictions · Game</p>
            <h1>{game ? `${game.away.name} @ ${game.home.name}` : 'Game projections'}</h1>
          </div>
          <nav className="up-headlinks" aria-label="More prediction pages">
            <Link to={back}>← Whole slate</Link>
          </nav>
        </div>
      </header>
      <div className="up-body">
        {loading && !data && <p className="up-empty">Loading…</p>}
        {error && <p className="up-warn">Could not load the slate: {error}</p>}
        {data && !game && (
          <p className="up-empty">
            This game is not on the {sport === 'mlb' ? `${query.date} slate` : 'selected week'}. <Link to={back}>Open the slate</Link>.
          </p>
        )}
        {game && (
          <>
            <ExportToolbar sport={sport} kind="slate" params={slateQuery} what="the whole slate" />
            {sport === 'mlb' && Object.values(game.predictions || {}).some((p) => p?.has_players) && (
              <ExportToolbar sport={sport} kind="players" params={{ game_id: game.game_id }} what="this game's player projections" copyLink={false} />
            )}
            <UnifiedGameCard
              game={game}
              models={data.models || []}
              featured={featured}
              sport={sport}
              division={division}
              slateQuery={slateQuery}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              defaultOpen="sim"
              standalone
            />
          </>
        )}
      </div>
    </div>
  );
}
