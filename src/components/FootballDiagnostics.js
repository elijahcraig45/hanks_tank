import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';
import {
  buildCalibrationBins,
  buildConfidenceBreakdown,
  summarizePredictionDiagnostics,
} from '../utils/predictionDiagnostics';
import {
  buildConferenceBreakdown,
  buildContextSplits,
  buildSeasonBreakdown,
  buildVegasComparison,
  buildWeeklyTrend,
  filterFootballDiagnostics,
} from '../utils/footballDiagnostics';
import './styles/FootballDiagnostics.css';

/**
 * Model audit for football, mirroring the MLB diagnostics page and adding the slices
 * football supports: season, week, conference, game context, and the closing line.
 *
 * Every number here is out-of-sample. The backfill trains only on games played before
 * the week it predicts, so this is a record of what the model would have said at the
 * time, not a fit re-scored against its own training data.
 */

const SEASONS = [2026, 2025, 2024];
const TIERS = ['all', 'HIGH', 'MEDIUM', 'LOW'];
const CONTEXTS = [
  { key: 'all', label: 'All games' },
  { key: 'conference', label: 'Conference only' },
  { key: 'nonconference', label: 'Non-conference' },
  { key: 'neutral', label: 'Neutral site' },
];

const pct = (v, d = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(d)}%`;
const num = (v, d = 3) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d);

function Tile({ label, value, hint, tone }) {
  return (
    <div className={`fd-tile${tone ? ` fd-tile--${tone}` : ''}`}>
      <div className="fd-tile-value">{value}</div>
      <div className="fd-tile-label">{label}</div>
      {hint && <div className="fd-tile-hint">{hint}</div>}
    </div>
  );
}

/** A labelled horizontal bar, used wherever a rate is compared across buckets. */
function BarRow({ label, value, games, max = 1, accent }) {
  return (
    <div className="fd-bar-row">
      <span className="fd-bar-label">{label}</span>
      <div className="fd-bar-track">
        <div
          className={`fd-bar-fill${accent ? ` fd-bar-fill--${accent}` : ''}`}
          style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%` }}
        />
      </div>
      <span className="fd-bar-value">{pct(value)}</span>
      {games != null && <span className="fd-bar-games">{games}</span>}
    </div>
  );
}

export default function FootballDiagnostics({ league, conferenceOf, conferences }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [seasons, setSeasons] = useState(SEASONS);
  const [tier, setTier] = useState('all');
  const [context, setContext] = useState('all');
  const [conference, setConference] = useState('all');
  const [model, setModel] = useState('all');
  const [hideMismatch, setHideMismatch] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await ApiService.getFootballDiagnostics(league.sport, {
          seasons: SEASONS, division: league.division,
        });
        if (cancelled) return;
        setRows(res.diagnostics || []);
        setMeta(res.meta || null);
      } catch {
        if (!cancelled) { setRows([]); setMeta(null); setFailed(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [league.sport, league.division]);

  const filtered = useMemo(
    () => filterFootballDiagnostics(rows, {
      seasons, tier, context, conference, model, hideMismatch, search, conferenceOf,
    }),
    [rows, seasons, tier, context, conference, model, hideMismatch, search, conferenceOf]
  );

  const summary = useMemo(() => summarizePredictionDiagnostics(filtered), [filtered]);
  const byTier = useMemo(() => buildConfidenceBreakdown(filtered), [filtered]);
  const bySeason = useMemo(() => buildSeasonBreakdown(filtered), [filtered]);
  const byWeek = useMemo(() => buildWeeklyTrend(filtered), [filtered]);
  const calibration = useMemo(() => buildCalibrationBins(filtered), [filtered]);
  // The underlying flag means "conference game" in college and "divisional game" in
  // the NFL, so the label has to follow the sport.
  const inGroupLabel = league.sport === 'nfl' ? 'Division game' : 'Conference game';
  const splits = useMemo(
    () => buildContextSplits(filtered, inGroupLabel), [filtered, inGroupLabel]
  );
  const vegas = useMemo(() => buildVegasComparison(filtered), [filtered]);
  const byConference = useMemo(
    () => (conferenceOf ? buildConferenceBreakdown(filtered, conferenceOf) : []),
    [filtered, conferenceOf]
  );

  const toggleSeason = (year) => {
    setSeasons((current) => (
      current.includes(year)
        ? (current.length > 1 ? current.filter((y) => y !== year) : current)
        : [...current, year].sort((a, b) => b - a)
    ));
  };

  const exportCsv = useCallback(() => {
    const columns = [
      ['Season', (r) => r.season], ['Week', (r) => r.week],
      ['Date', (r) => String(r.gameDate).slice(0, 10)],
      ['Away', (r) => r.awayTeamName], ['Home', (r) => r.homeTeamName],
      ['Predicted', (r) => r.predictedWinner], ['Actual', (r) => r.actualWinner],
      ['Correct', (r) => (r.correct ? 'Yes' : 'No')],
      ['Tier', (r) => r.confidenceTier],
      ['Win probability', (r) => r.predictedWinProbability.toFixed(4)],
      ['Edge', (r) => r.edge.toFixed(4)],
      ['Brier', (r) => r.brierScore.toFixed(4)],
      ['Log loss', (r) => r.logLoss.toFixed(4)],
      ['Model', (r) => r.modelVersion],
    ];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      columns.map((c) => escape(c[0])).join(','),
      ...filtered.map((r) => columns.map((c) => escape(c[1](r))).join(',')),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${league.key}-diagnostics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered, league.key]);

  if (loading) return <div className="fd-state">Loading diagnostics…</div>;

  if (failed) {
    return (
      <div className="fd-empty">
        <div className="fd-empty-title">Could not load diagnostics</div>
        <p>The diagnostics endpoint did not respond.</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="fd-empty">
        <div className="fd-empty-title">No scored predictions for {league.label}</div>
        <p>
          {meta?.note
            || 'Diagnostics appear once predictions have been made and the games played.'}
        </p>
      </div>
    );
  }

  const models = meta?.models || [];

  return (
    <section className="fd">
      <div className="fd-head">
        <div>
          <h2>Model diagnostics — {league.label}</h2>
          <p className="fd-note">
            Every figure is out-of-sample: each week was predicted by a model trained
            only on games played before it, so this is what the model would have said at
            the time rather than a fit re-scored on its own data.
          </p>
        </div>
        <button className="fd-export" onClick={exportCsv}>Export CSV</button>
      </div>

      {/* ── Filters ── */}
      <div className="fd-filters">
        <div className="fd-filter">
          <span className="fd-filter-label">Seasons</span>
          <div className="fd-chips">
            {SEASONS.map((year) => (
              <button
                key={year}
                className={`fd-chip${seasons.includes(year) ? ' fd-chip--on' : ''}`}
                aria-pressed={seasons.includes(year)}
                onClick={() => toggleSeason(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="fd-filter">
          <span className="fd-filter-label">Confidence</span>
          <div className="fd-chips">
            {TIERS.map((t) => (
              <button
                key={t}
                className={`fd-chip${tier === t ? ' fd-chip--on' : ''}`}
                aria-pressed={tier === t}
                onClick={() => setTier(t)}
              >
                {t === 'all' ? 'All' : t[0] + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <label className="fd-field">
          <span className="fd-filter-label">Context</span>
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            {CONTEXTS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>

        {conferences?.length > 1 && (
          <label className="fd-field">
            <span className="fd-filter-label">Conference</span>
            <select value={conference} onChange={(e) => setConference(e.target.value)}>
              <option value="all">All conferences</option>
              {conferences.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        {models.length > 1 && (
          <label className="fd-field">
            <span className="fd-filter-label">Model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="all">All versions</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        )}

        <label className="fd-field">
          <span className="fd-filter-label">Team</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search teams"
          />
        </label>

        {rows.some((r) => r.crossDivision) && (
          <button
            className={`fd-chip${hideMismatch ? ' fd-chip--on' : ''}`}
            aria-pressed={hideMismatch}
            onClick={() => setHideMismatch((v) => !v)}
          >
            Hide mismatches
          </button>
        )}

        <span className="fd-count">{filtered.length} of {rows.length} games</span>
      </div>

      {filtered.length === 0 ? (
        <div className="fd-empty">
          <div className="fd-empty-title">No games match these filters</div>
        </div>
      ) : (
        <>
          {/* ── Headline ── */}
          <div className="fd-tiles">
            <Tile label="Games scored" value={summary.games} />
            <Tile label="Accuracy" value={pct(summary.accuracy)} tone="key" />
            <Tile label="Avg edge" value={pct(summary.avgEdge)}
                  hint="distance from a coin flip" />
            <Tile label="Brier" value={num(summary.brierScore)}
                  hint="lower is better" />
            <Tile label="Log loss" value={num(summary.logLoss)}
                  hint={`coin flip = ${num(Math.log(2))}`} />
          </div>

          {vegas && (
            <div className="fd-panel">
              <h3>Against the closing line</h3>
              <p className="fd-sub">
                Both measured on the {vegas.games} games where a line was stored, so
                neither gets an easier slate than the other.
              </p>
              <BarRow label="This model" value={vegas.modelAccuracy} accent="model" />
              <BarRow label="Vegas favourite" value={vegas.vegasAccuracy} accent="vegas" />
              <p className="fd-sub">
                They agree on {pct(vegas.agreementRate)} of games.
                {vegas.modelWinsDisagreements != null && (
                  <> Where they disagree, the model is right {pct(vegas.modelWinsDisagreements)} of the time.</>
                )}
              </p>
            </div>
          )}

          <div className="fd-grid">
            <div className="fd-panel">
              <h3>By confidence tier</h3>
              <p className="fd-sub">
                A tier only earns its name if accuracy rises with it.
              </p>
              {byTier.map((t) => (
                <BarRow key={t.tier} label={t.tier} value={t.accuracy} games={t.games} />
              ))}
            </div>

            <div className="fd-panel">
              <h3>By season</h3>
              <p className="fd-sub">Each season predicted from the ones before it.</p>
              {bySeason.map((s) => (
                <BarRow key={s.key} label={s.label} value={s.accuracy} games={s.games} />
              ))}
            </div>

            <div className="fd-panel">
              <h3>Calibration</h3>
              <p className="fd-sub">
                Of the games called at 70%, roughly 70% should have gone that way.
                Observed far below predicted means overconfidence.
              </p>
              <div className="fd-table-wrap">
                <table className="fd-table">
                  <thead>
                    <tr><th>Bucket</th><th>Games</th><th>Predicted</th><th>Observed</th><th>Gap</th></tr>
                  </thead>
                  <tbody>
                    {calibration.map((bin) => {
                      const gap = bin.observedRate - bin.predictedRate;
                      return (
                        <tr key={bin.label}>
                          <td>{bin.label}</td>
                          <td>{bin.games}</td>
                          <td>{pct(bin.predictedRate)}</td>
                          <td>{pct(bin.observedRate)}</td>
                          <td className={gap >= 0 ? 'fd-pos' : 'fd-neg'}>
                            {gap >= 0 ? '+' : ''}{pct(gap)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="fd-panel">
              <h3>By game context</h3>
              <p className="fd-sub">
                Where the model finds games easy, and where it does not.
              </p>
              {splits.map((s) => (
                <BarRow key={s.key} label={s.label} value={s.accuracy} games={s.games} />
              ))}
            </div>
          </div>

          {byConference.length > 0 && (
            <div className="fd-panel">
              <h3>By conference</h3>
              <p className="fd-sub">
                A game counts for both conferences when they differ, and conferences with
                fewer than five games are omitted.
              </p>
              {byConference.map((c) => (
                <BarRow key={c.key} label={c.label} value={c.accuracy} games={c.games} />
              ))}
            </div>
          )}

          {byWeek.length > 1 && (
            <div className="fd-panel">
              <h3>Week by week</h3>
              <p className="fd-sub">
                Early weeks are hardest: the model has least evidence and leans on last
                season.
              </p>
              {/* Drawn from a 50% floor rather than zero: every bar sits between
                  55% and 80%, so a zero baseline renders them all the same height and
                  hides the only thing the chart is for. */}
              <div className="fd-spark">
                {byWeek.map((w) => (
                  <div
                    className="fd-spark-col"
                    key={w.key}
                    title={`${w.label}: ${pct(w.accuracy)} of ${w.games} games`}
                  >
                    <div
                      className="fd-spark-bar"
                      style={{
                        height: `${Math.max(2, ((w.accuracy - 0.5) / 0.5) * 100)}%`,
                      }}
                    />
                    <span className="fd-spark-label">{w.key}</span>
                  </div>
                ))}
              </div>
              <p className="fd-sub fd-spark-note">
                Bars run from a 50% floor (a coin flip) to 100%.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
