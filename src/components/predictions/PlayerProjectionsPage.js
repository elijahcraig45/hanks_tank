import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { predictionsPath } from '../../config/sports';
import PlayerProjectionsTable from './PlayerProjectionsTable';
import ExportToolbar from './ExportToolbar';
import SlateNav from './SlateNav';
import useSlate, { SPORT_LABEL, todayEt } from './useSlate';
import './UnifiedPredictions.css';

/**
 * Slate-wide player projections (GET /api/predictions/:sport/players). MLB only for now;
 * football says so plainly instead of rendering an empty table.
 */
export default function PlayerProjectionsPage({ sport }) {
  const { league } = useParams();
  const division = sport === 'cfb' ? (league || 'fbs') : null;
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || todayEt();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiService.getPlayerProjections(sport, sport === 'mlb' ? { date } : { division })
      .then((data) => { if (alive) setState({ loading: false, error: null, data }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message, data: null }); });
    return () => { alive = false; };
  }, [sport, date, division]);

  // Game labels for the Game column/filter come from the slate for the same date.
  const slateQuery = useMemo(() => (sport === 'mlb' ? { date } : { division }), [sport, date, division]);
  const slate = useSlate(sport, slateQuery);
  const games = useMemo(() => {
    const ids = new Set((state.data?.rows || []).map((r) => String(r.game_id)));
    return (slate.data?.games || []).filter((g) => ids.has(String(g.game_id)));
  }, [slate.data, state.data]);
  const byId = useMemo(() => Object.fromEntries(games.map((g) => [String(g.game_id), g])), [games]);
  const gameLabel = (id) => {
    const g = byId[String(id)];
    return g ? `${g.away.abbr} @ ${g.home.abbr}` : null;
  };

  const { data, loading, error } = state;
  const unavailable = data && (data.available === false || sport !== 'mlb');
  const sportLabel = sport === 'cfb' ? `College football · ${String(division).toUpperCase()}` : SPORT_LABEL[sport];

  return (
    <div className="up-page" data-sport={sport}>
      <header className="ht-page-head">
        <div className="ht-page-head-inner">
          <div>
            <p className="ht-eyebrow">{sportLabel} · Predictions</p>
            <h1>Player projections</h1>
            <p className="ht-page-sub">
              What the simulator expects each player to do, with the 90% range around it. Each stat says
              whether it has been checked against real box scores.
            </p>
          </div>
          <nav className="up-headlinks" aria-label="More prediction pages">
            <Link to={predictionsPath(sport, division)}>All games, every model</Link>
          </nav>
        </div>
      </header>
      <div className="up-body">
        {sport === 'mlb' && (
          <div className="up-topbar">
            <SlateNav sport="mlb" date={date} onDate={(d) => setParams({ date: d }, { replace: true })} />
          </div>
        )}
        {!unavailable && (
          <ExportToolbar sport={sport} kind="players" params={sport === 'mlb' ? { date } : { division }} what="player projections" />
        )}
        {loading && !data && <p className="up-empty">Loading player projections…</p>}
        {error && <p className="up-warn">Could not load player projections: {error}</p>}
        {unavailable && sport !== 'mlb' && (
          <div className="up-empty up-empty--box" role="status">
            <strong>Player projections are MLB-only for now.</strong>{' '}
            {data?.note || 'The football models project the game (score, margin, total), not individual players.'}
            {' '}<Link to={predictionsPath('mlb', null, 'players')}>See MLB player projections</Link>.
          </div>
        )}
        {unavailable && sport === 'mlb' && (
          <div className="up-empty up-empty--box" role="status">
            <strong>Player projections are not available yet.</strong>{' '}
            {data?.note || 'The simulator has not written any player projections.'}
            {' '}They appear here, per game and slate-wide, once the simulator writes them.
          </div>
        )}
        {data && !unavailable && (
          (data.rows || []).length
            ? <PlayerProjectionsTable rows={data.rows} games={games} gameLabel={gameLabel} idPrefix="slate" />
            : <p className="up-empty">No player projections stored for {date}. The simulator writes them once lineups post, about 90 minutes before first pitch.</p>
        )}
      </div>
    </div>
  );
}
