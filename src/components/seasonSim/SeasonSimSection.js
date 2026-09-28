import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApiService from '../../services/api';
import ProjectionTable from './ProjectionTable';
import BracketView from './BracketView';
import TeamDrilldown from './TeamDrilldown';
import { METHOD_URL, fmtComputedAt, fmtPct } from './simFormat';
import '../styles/SeasonSim.css';

/**
 * Season projections: the football rest-of-season Monte Carlo (a shadow model).
 *
 * Reads GET /api/season-sim/:sport. Everything shown is a share of simulated seasons;
 * the copy says so at the top and the method page (/learn/season-sim.html) explains
 * what the simulation assumes. A missing table (404) is an empty state, not an error.
 */
export default function SeasonSimSection({ sport, season }) {
  const [week, setWeek] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, missing: false, data: null });
  const [selected, setSelected] = useState(null);

  useEffect(() => { setWeek(null); setSelected(null); }, [sport, season]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null, missing: false }));
    ApiService.getSeasonSim(sport, { season, week })
      .then((data) => {
        if (cancelled) return;
        if (!data.teams.length) setState({ loading: false, error: null, missing: true, data: null });
        else setState({ loading: false, error: null, missing: false, data });
      })
      .catch((err) => {
        if (cancelled) return;
        const missing = /not found/i.test(err?.message || '');
        setState({ loading: false, error: missing ? null : 'Could not load season projections.', missing, data: null });
      });
    return () => { cancelled = true; };
  }, [sport, season, week]);

  const data = state.data;
  const meta = data?.meta || {};
  const teamsByAbbr = useMemo(
    () => new Map((data?.teams || []).map((t) => [t.team, t])),
    [data]
  );
  const favourites = useMemo(
    () => [...(data?.teams || [])]
      .filter((t) => Number(t.p_champion) > 0)
      .sort((a, b) => Number(b.p_champion) - Number(a.p_champion))
      .slice(0, 5),
    [data]
  );
  const close = useCallback(() => setSelected(null), []);
  const select = useCallback((abbr) => { if (teamsByAbbr.has(abbr)) setSelected(abbr); }, [teamsByAbbr]);

  const methodUrl = meta.method_url || METHOD_URL;
  const shownWeek = meta.as_of_week ?? week;
  const exportParams = { season: meta.season || season, week: shownWeek };
  const weeks = meta.available_weeks || [];

  const intro = (
    <div className="ssim-rule">
      <strong>Experimental shadow model.</strong>{' '}
      {sport === 'nfl'
        ? 'Every remaining game is played out thousands of times from the current ratings, including how unsure those ratings are; then the playoffs are seeded and played out.'
        : 'Every remaining game is played out thousands of times from the current ratings, including how unsure those ratings are; then conference title games and a 12-team playoff are filled and played out. The CFP field comes from a committee-proxy ranking, not the real committee.'}
      {' '}These are odds, not predictions: a 30% team misses the playoffs 7 times in 10.
      {' '}<a href={methodUrl}>How the simulation works</a>
    </div>
  );

  if (state.loading && !data) {
    return <section className="ssim ft-panel"><p className="ssim-faint">Loading season projections…</p></section>;
  }
  if (!data) {
    return (
      <section className="ssim ft-panel" data-testid="ssim-empty">
        {intro}
        <p className="ssim-empty">
          {state.error || `No season projections have been published for ${season || 'this season'} yet.`}
        </p>
      </section>
    );
  }

  return (
    <div className="ssim" data-testid="season-sim">
      <section className="ft-panel ssim-panel">
        <div className="ssim-head">
          <div>
            <h2 className="ssim-h2">As of week {shownWeek}</h2>
            <p className="ssim-meta" data-testid="ssim-asof">
              Results through week {shownWeek} are fixed; the rest is simulated.
              {meta.n_sims ? ` ${Number(meta.n_sims).toLocaleString('en-US')} simulations` : ''}
              {meta.computed_at ? ` · run ${fmtComputedAt(meta.computed_at)}` : ''}
              {meta.model_version ? ` · ${meta.model_version}` : ''}
              {meta.source === 'fixture' ? ' · local fixture' : ''}
            </p>
          </div>
          {weeks.length > 1 && (
            <label className="ssim-field">
              <span>As of</span>
              <select value={shownWeek ?? ''} onChange={(e) => setWeek(Number(e.target.value))} aria-label="As of week">
                {[...weeks].sort((a, b) => b - a).map((w) => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </label>
          )}
        </div>
        {intro}
        {favourites.length > 0 && (
          <div className="ssim-favs" aria-label="Title odds leaders">
            <span className="ssim-favs-label">{sport === 'nfl' ? 'Super Bowl odds' : 'Title odds'}</span>
            {favourites.map((t) => (
              <button key={t.team} type="button" className="ssim-fav" onClick={() => select(t.team)}>
                <span className="ssim-team-abbr">{t.team}</span> {fmtPct(t.p_champion)}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="ft-panel ssim-panel">
        <div className="ssim-head"><h2 className="ssim-h2">Projected standings</h2></div>
        <ProjectionTable sport={sport} teams={data.teams} onSelect={select} />
      </section>

      <section className="ft-panel ssim-panel">
        <div className="ssim-head"><h2 className="ssim-h2">Most likely bracket</h2></div>
        <p className="ssim-note">
          The single likeliest field and path, built seed by seed. Each percentage is how
          often that team filled that spot across simulations; the likeliest bracket as a
          whole is still unlikely. Open a slot to see who else could be there.
        </p>
        {meta.note && <p className="ssim-note">{meta.note}</p>}
        <BracketView bracket={data.bracket} onSelect={select} />
      </section>

      <section className="ft-panel ssim-panel">
        <div className="ssim-head"><h2 className="ssim-h2">Download</h2></div>
        <div className="ssim-export" role="toolbar" aria-label="Export season projections">
          {[['team', 'Teams'], ['bracket', 'Bracket']].map(([table, label]) => (
            ['csv', 'json'].map((format) => (
              <a
                key={`${table}-${format}`}
                className="ssim-btn"
                href={ApiService.seasonSimExportUrl(sport, { ...exportParams, table, format })}
                download
                data-testid={`ssim-export-${table}-${format}`}
              >
                {label} {format.toUpperCase()}
              </a>
            ))
          ))}
        </div>
      </section>

      {selected && teamsByAbbr.get(selected) && (
        <TeamDrilldown sport={sport} team={teamsByAbbr.get(selected)} onClose={close} />
      )}
    </div>
  );
}
