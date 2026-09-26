import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { MLB, footballPath, predictionsPath } from '../../config/sports';
import { loadFavoriteTeams, toggleFavoriteTeam } from '../../utils/favorites';
import {
  CONFIDENCE_FILTERS, DISAGREEMENT_FILTERS, SORTS, disagreementOf, filterSortGames, hasDist,
  loadSportFavorites, toggleSportFavorite,
} from '../../utils/unifiedPredictions';
import SaveResearchViewButton from '../analytics/SaveResearchViewButton';
import UnifiedGameCard from './UnifiedGameCard';
import { modelName } from './ModelRows';
import ExportToolbar from './ExportToolbar';
import SlateNav from './SlateNav';
import DistTerm from './DistTerm';
import useSlate, { SPORT_LABEL, todayEt } from './useSlate';
import './UnifiedPredictions.css';

/**
 * The unified Predictions page for one sport: every game on the slate, every model on
 * every game, the simulators' score and player distributions one click away, and an
 * export of all of it. Production is only the default featured model.
 *
 * Every control lives in the URL (?date, ?featured, ?models, ?sort …), so "Copy link"
 * and "Save view" reproduce exactly this view.
 */

export function FeaturedSelect({ models, value, onChange }) {
  return (
    <label className="up-field">
      <span>Featured model</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Featured model">
        {models.map((m) => (
          <option key={m.key} value={m.key} disabled={m.available === false}>
            {m.label}{m.role === 'production' && !/production/i.test(m.label || '') ? ' (production)' : ''}{m.available === false ? ' — not available' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ModelFilter({ models, shown, onChange, sport }) {
  const set = new Set(shown);
  const toggle = (k) => {
    const next = set.has(k) ? shown.filter((x) => x !== k) : models.map((m) => m.key).filter((x) => set.has(x) || x === k);
    onChange(next.length ? next : shown);
  };
  return (
    <fieldset className="up-field up-modelfilter">
      <legend>Models shown</legend>
      <div className="up-chips">
        {models.map((m) => (
          <label key={m.key} className={`up-chipcheck${set.has(m.key) ? ' is-on' : ''}${m.available === false ? ' is-off' : ''}`}>
            <input type="checkbox" checked={set.has(m.key)} onChange={() => toggle(m.key)} />
            {modelName(sport, m)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function UnifiedSlatePage({ sport }) {
  const { league } = useParams();
  const division = sport === 'cfb' ? (league || 'fbs') : null;
  const [params, setParams] = useSearchParams();
  const get = (k, d = '') => params.get(k) ?? d;

  const date = sport === 'mlb' ? get('date', todayEt()) : null;
  const seasonParam = sport !== 'mlb' ? (Number(get('season')) || null) : null;
  const weekParam = sport !== 'mlb' ? (Number(get('week')) || null) : null;

  const query = useMemo(() => (sport === 'mlb'
    ? { date }
    : { season: seasonParam, week: weekParam, division }), [sport, date, seasonParam, weekParam, division]);
  const { data, loading, error } = useSlate(sport, query);

  const setParam = useCallback((updates) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === false) next.delete(k);
        else next.set(k, v === true ? '1' : String(v));
      });
      return next;
    }, { replace: true });
  }, [setParams]);

  const models = useMemo(() => data?.models || [], [data]);
  const featured = get('featured') && models.some((m) => m.key === get('featured'))
    ? get('featured') : (data?.featured_default || models[0]?.key);
  const shownParam = get('models');
  const shown = useMemo(() => {
    const all = models.map((m) => m.key);
    if (!shownParam) return all;
    const pick = shownParam.split(',').filter((k) => all.includes(k));
    return pick.length ? pick : all;
  }, [models, shownParam]);
  const sort = get('sort', 'time');
  const dis = get('dis', 'all');
  const conf = get('conf', '0');
  const search = get('q');
  const lineupsOnly = get('lineups') === '1';
  const favoritesOnly = get('fav') === '1';
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* Lineups and starters (MLB) come from the older predictions route until the slate
     carries them; a missing route just means the filter falls back to `has_players`. */
  const [legacy, setLegacy] = useState({});
  useEffect(() => {
    if (sport !== 'mlb') return undefined;
    let alive = true;
    apiService.getPredictions(date)
      .then((d) => {
        if (!alive) return;
        const map = {};
        (d?.predictions || []).forEach((p) => { map[String(p.game_pk)] = p; });
        setLegacy(map);
      })
      .catch(() => { if (alive) setLegacy({}); });
    return () => { alive = false; };
  }, [sport, date]);

  const lineupConfirmed = useCallback((g) => {
    if (g.lineup_confirmed != null) return Boolean(g.lineup_confirmed);
    const l = legacy[String(g.game_id)];
    if (l && l.lineup_confirmed != null) return Boolean(l.lineup_confirmed);
    return Object.values(g.predictions || {}).some((p) => p?.has_players);
  }, [legacy]);

  /* Favourites: MLB shares the site-wide list (team pages, homepage); football keeps its
     own per sport so it never produces a broken MLB team link. */
  const [favs, setFavs] = useState(() => (sport === 'mlb'
    ? loadFavoriteTeams().map((t) => t.abbreviation) : loadSportFavorites(sport)));
  useEffect(() => {
    setFavs(sport === 'mlb' ? loadFavoriteTeams().map((t) => t.abbreviation) : loadSportFavorites(sport));
  }, [sport]);
  const isFavorite = useCallback((abbr) => favs.includes(abbr), [favs]);
  const onToggleFavorite = (team) => {
    if (sport === 'mlb') {
      setFavs(toggleFavoriteTeam({ abbreviation: team.abbr, name: team.name, teamId: Number(team.id) || team.id })
        .map((t) => t.abbreviation));
    } else {
      setFavs(toggleSportFavorite(sport, team.abbr));
    }
  };

  const games = useMemo(() => filterSortGames(data?.games || [], {
    featured, sort, disagreement: dis, minConfidence: Number(conf), search,
    lineupsOnly, favoritesOnly,
    isFavorite: (g) => isFavorite(g.home.abbr) || isFavorite(g.away.abbr),
    lineupConfirmed,
  }), [data, featured, sort, dis, conf, search, lineupsOnly, favoritesOnly, isFavorite, lineupConfirmed]);

  const total = data?.games?.length || 0;
  const highDis = (data?.games || []).filter((g) => disagreementOf(g) === 'high').length;
  const simGames = (data?.games || []).filter((g) => models.some((m) => hasDist(g.predictions?.[m.key]))).length;
  const activeFilters = [dis !== 'all', conf !== '0', search !== '', lineupsOnly, favoritesOnly, Boolean(shownParam)].filter(Boolean).length;
  const clear = () => setParam({ dis: null, conf: null, q: null, lineups: null, fav: null, models: null });

  const season = seasonParam || data?.season;
  const week = weekParam || data?.week;
  const slateQuery = useMemo(() => (sport === 'mlb'
    ? { date: data?.date || date }
    : { season: data?.season, week: data?.week, division }), [sport, data, date, division]);
  const exportParams = sport === 'mlb' ? { date: data?.date || date } : { season, week, division };

  const sportLabel = sport === 'cfb' ? `College football · ${String(division).toUpperCase()}` : SPORT_LABEL[sport];
  const classicTo = sport === 'mlb' ? MLB.predictionsClassic : footballPath(sport === 'nfl' ? 'nfl' : division, 'picks');
  const modelsTo = sport === 'mlb' ? MLB.models : footballPath(sport === 'nfl' ? 'nfl' : division, 'models');
  const playersTo = predictionsPath(sport, division, 'players');

  return (
    <div className="up-page" data-sport={sport}>
      <header className="ht-page-head">
        <div className="ht-page-head-inner">
          <div>
            <p className="ht-eyebrow">{sportLabel} · Predictions</p>
            <h1>Every model, every game</h1>
            <p className="ht-page-sub">
              Each game shows every model side by side. The featured model sets the headline pick;
              simulated scores with their ranges{sport === 'mlb' ? ' and player projections' : ''} open from each card.
            </p>
          </div>
          <nav className="up-headlinks" aria-label="More prediction pages">
            <Link to={playersTo}>Player projections</Link>
            <Link to={modelsTo}>Models scoreboard</Link>
            <Link to={classicTo}>Classic {sport === 'mlb' ? 'board' : 'picks'}</Link>
          </nav>
        </div>
      </header>

      <div className="up-body">
        <div className="up-topbar">
          <SlateNav
            sport={sport}
            date={date}
            onDate={(d) => setParam({ date: d })}
            season={season}
            week={week}
            weeks={data?.weeks}
            onSeasonWeek={(s, w) => setParam({ season: s, week: w })}
          />
          {models.length > 0 && (
            <FeaturedSelect models={models} value={featured} onChange={(k) => setParam({ featured: k === data?.featured_default ? null : k })} />
          )}
        </div>

        <ExportToolbar sport={sport} kind="slate" params={exportParams} what="every model's predictions">
          <SaveResearchViewButton label={`${SPORT_LABEL[sport]} predictions`} hint="Unified slate with filters" />
        </ExportToolbar>

        <section className={`up-filters${filtersOpen ? ' is-open' : ''}`} aria-label="Filters">
          <div className="up-filterbar">
            <button type="button" className="up-filter-toggle" aria-expanded={filtersOpen}
              aria-controls="up-filter-panel" onClick={() => setFiltersOpen((o) => !o)}>
              <span aria-hidden="true">☰</span> Filters
              {activeFilters > 0 && <span className="up-filter-count">{activeFilters}</span>}
              <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
            </button>
            <span className="up-filterbar-summary">Sorted by {SORTS.find((s) => s.key === sort)?.label.toLowerCase()}</span>
            {activeFilters > 0 && <button type="button" className="up-linkbtn" onClick={clear}>Clear</button>}
          </div>
          <div id="up-filter-panel" className="up-filter-panel">
            <label className="up-field">
              <span>Search</span>
              <input type="search" value={search} placeholder="Team or abbreviation"
                onChange={(e) => setParam({ q: e.target.value })} aria-label="Search teams" />
            </label>
            <label className="up-field">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setParam({ sort: e.target.value === 'time' ? null : e.target.value })} aria-label="Sort">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="up-field">
              <span><DistTerm term="disagreement">Disagreement</DistTerm></span>
              <select value={dis} onChange={(e) => setParam({ dis: e.target.value === 'all' ? null : e.target.value })} aria-label="Disagreement">
                {DISAGREEMENT_FILTERS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="up-field">
              <span>Featured confidence</span>
              <select value={conf} onChange={(e) => setParam({ conf: e.target.value === '0' ? null : e.target.value })} aria-label="Featured confidence">
                {CONFIDENCE_FILTERS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <div className="up-switches">
              {sport === 'mlb' && (
                <label className="up-switch">
                  <input type="checkbox" checked={lineupsOnly} onChange={(e) => setParam({ lineups: e.target.checked })} />
                  <span>Confirmed lineups only</span>
                </label>
              )}
              <label className="up-switch">
                <input type="checkbox" checked={favoritesOnly} disabled={!favs.length}
                  onChange={(e) => setParam({ fav: e.target.checked })} />
                <span>Favorite teams only{!favs.length && <span className="up-muted"> (star a team on a card)</span>}</span>
              </label>
            </div>
            {models.length > 0 && (
              <ModelFilter sport={sport} models={models} shown={shown}
                onChange={(next) => setParam({ models: next.length === models.length ? null : next.join(',') })} />
            )}
          </div>
        </section>

        {loading && !data && <p className="up-empty">Loading every model&rsquo;s predictions…</p>}
        {error && <p className="up-warn">Could not load the slate: {error}. <Link to={classicTo}>Open the classic view</Link>.</p>}

        {data && (
          <>
            <p className="up-summary" aria-live="polite">
              <span className="up-chip">{games.length === total ? `${total} games` : `${games.length} of ${total} games`}</span>
              <span className="up-chip">{models.filter((m) => m.available !== false).length} of {models.length} models live</span>
              {highDis > 0 && <span className="up-chip up-chip--warn">{highDis} with high disagreement</span>}
              {simGames > 0 && <span className="up-chip up-chip--ok">{simGames} simulated</span>}
            </p>
            {total === 0 && (
              <p className="up-empty">
                No games on this {sport === 'mlb' ? 'date' : 'week'}. Predictions are written for scheduled games only.
              </p>
            )}
            {total > 0 && games.length === 0 && (
              <p className="up-empty">
                No games match these filters. <button type="button" className="up-linkbtn" onClick={clear}>Clear filters</button>
              </p>
            )}
            <div className="up-grid">
              {games.map((g) => (
                <UnifiedGameCard
                  key={g.game_id}
                  game={g}
                  models={models}
                  shownKeys={shown}
                  featured={featured}
                  sport={sport}
                  division={division}
                  slateQuery={slateQuery}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                  lineupConfirmed={sport === 'mlb' ? lineupConfirmed : null}
                  extraMeta={starterLine(legacy[String(g.game_id)])}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function starterLine(l) {
  if (!l || (!l.away_starter_name && !l.home_starter_name)) return null;
  const s = (n, h) => `${n || 'TBD'}${h ? ` (${h})` : ''}`;
  return `${s(l.away_starter_name, l.away_starter_hand)} vs ${s(l.home_starter_name, l.home_starter_hand)}`;
}
