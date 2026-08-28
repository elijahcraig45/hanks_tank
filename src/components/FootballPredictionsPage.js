import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import './styles/PredictionsPage.css';
import './styles/NflPredictionsPage.css';

const TIER_ORDER = { high: 0, medium: 1, low: 2 };

const LEAGUES = [
  { key: 'nfl', sport: 'nfl', division: null, label: 'NFL' },
  { key: 'fbs', sport: 'cfb', division: 'fbs', label: 'College FBS' },
  { key: 'fcs', sport: 'cfb', division: 'fcs', label: 'College FCS' },
];

function pct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

/**
 * "Why" cards. Ported from generateWhyV8 on the MLB predictions page — the Elo,
 * Pythagorean, form and streak logic transfers directly to football; only the wording
 * changes ("runs" -> "points"). Signals absent for a given league are simply skipped,
 * which is how CFB (no EPA, no betting lines) shares this code with NFL.
 */
function generateWhy(p) {
  const reasons = [];
  const favName = p.home_win_probability > 0.5 ? p.home_team_name : p.away_team_name;

  if (p.elo_differential != null) {
    const d = p.elo_differential;
    reasons.push({
      tone: Math.abs(d) > 100 ? 'positive' : 'neutral',
      title: 'Team rating (Elo)',
      detail:
        Math.abs(d) < 15
          ? 'Both teams rate almost identically — close to a coin flip on strength alone.'
          : `${d > 0 ? p.home_team_name : p.away_team_name} rates ${Math.abs(d).toFixed(0)} Elo points higher, including home-field.`,
    });
  }

  if (p.pythag_differential != null && Math.abs(p.pythag_differential) > 0.04) {
    const d = p.pythag_differential;
    reasons.push({
      tone: 'positive',
      title: 'Scoring quality',
      detail: `${d > 0 ? p.home_team_name : p.away_team_name} has the stronger points-for/points-against profile (${pct(Math.abs(d))} edge in expected win rate).`,
    });
  }

  if (p.net_epa_8g != null && Math.abs(p.net_epa_8g) > 0.05) {
    reasons.push({
      tone: 'positive',
      title: 'EPA per play, last 8',
      detail: `${p.net_epa_8g > 0 ? p.home_team_name : p.away_team_name} has the better net EPA over the last eight games (${p.net_epa_8g > 0 ? '+' : ''}${p.net_epa_8g.toFixed(3)}/play).`,
    });
  }

  const hs = p.home_current_streak || 0;
  const as = p.away_current_streak || 0;
  if (Math.abs(hs) >= 3 || Math.abs(as) >= 3) {
    const parts = [];
    if (Math.abs(hs) >= 3) parts.push(`${p.home_team_name} on a ${Math.abs(hs)}-game ${hs > 0 ? 'win' : 'loss'} streak`);
    if (Math.abs(as) >= 3) parts.push(`${p.away_team_name} on a ${Math.abs(as)}-game ${as > 0 ? 'win' : 'loss'} streak`);
    reasons.push({ tone: 'neutral', title: 'Form', detail: `${parts.join('; ')}.` });
  }

  if (p.cross_division) {
    reasons.push({
      tone: 'neutral',
      title: 'Cross-division matchup',
      detail: 'FBS vs FCS games are usually lopsided — treat a confident pick here as cheap.',
    });
  } else if (p.is_divisional) {
    reasons.push({
      tone: 'neutral',
      title: 'Conference game',
      detail: 'Conference matchups tend to be tighter than ratings alone suggest.',
    });
  }

  if (p.neutral_site) {
    reasons.push({
      tone: 'neutral',
      title: 'Neutral site',
      detail: 'No home-field advantage applied for either team.',
    });
  }

  if (p.model_vs_vegas_edge != null && Math.abs(p.model_vs_vegas_edge) > 0.07) {
    reasons.push({
      tone: Math.abs(p.model_vs_vegas_edge) > 0.12 ? 'positive' : 'neutral',
      title: 'Disagrees with the market',
      detail: `The model is ${pct(Math.abs(p.model_vs_vegas_edge))} ${p.model_vs_vegas_edge > 0 ? 'higher' : 'lower'} on ${p.home_team_name} than the closing line implies.`,
    });
  }

  if (!reasons.length) {
    reasons.push({
      tone: 'neutral',
      title: 'Low signal',
      detail: `Nothing separates these teams strongly; ${favName} is a marginal pick.`,
    });
  }
  return reasons;
}

function PredictionCard({ p }) {
  const [open, setOpen] = useState(false);
  const homeFav = p.home_win_probability > 0.5;
  const homePct = Math.round(p.home_win_probability * 100);
  const settled = p.prediction_correct !== null && p.prediction_correct !== undefined;

  return (
    <div className="pred-card nfl-card">
      <div className="nfl-card-head">
        <span className={`pred-conf-badge pred-chip--${p.confidence_tier === 'medium' ? 'med' : p.confidence_tier}`}>
          {p.confidence_tier}
        </span>
        {settled && (
          <span className={`nfl-result nfl-result--${p.prediction_correct ? 'hit' : 'miss'}`}>
            {p.prediction_correct ? '✓ correct' : '✗ missed'}
          </span>
        )}
      </div>

      <div className="pred-matchup-row">
        <div className={`pred-team-cell ${!homeFav ? 'pred-team-winner' : 'pred-team-loser'}`}>
          <span className="pred-team-name">{p.away_team_name}</span>
        </div>
        <span className="pred-at">@</span>
        <div className={`pred-team-cell pred-team-cell--home ${homeFav ? 'pred-team-winner' : 'pred-team-loser'}`}>
          <span className="pred-team-name">{p.home_team_name}</span>
        </div>
      </div>

      <div className="pred-prob-bar">
        <div className="pred-prob-segment nfl-seg-away" style={{ width: `${100 - homePct}%` }} />
        <div className="pred-prob-segment nfl-seg-home" style={{ width: `${homePct}%` }} />
      </div>
      <div className="pred-bar-labels">
        <span>{100 - homePct}% {p.away_team_name}</span>
        <span>{homePct}% {p.home_team_name}</span>
      </div>

      {settled && (
        <div className="nfl-final">Actual winner: <strong>{p.actual_winner}</strong></div>
      )}

      <button className="nfl-why-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide reasoning' : 'Why this pick?'}
      </button>

      {open && (
        <div className="nfl-why">
          {generateWhy(p).map((r, i) => (
            <div key={i} className={`pred-reason pred-reason--${r.tone}`}>
              <div className="pred-reason-title">{r.title}</div>
              <div className="pred-reason-detail">{r.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccuracyPanel({ accuracy, league }) {
  if (!accuracy?.overall || !accuracy.overall.games) return null;
  const o = accuracy.overall;

  // The baselines are the point of this panel. Football is far more predictable than
  // baseball, so a raw accuracy number flatters any model; the gap to always-home and
  // to Elo-alone is what actually says whether the features are doing work.
  const bars = [
    { label: 'This model', value: o.model_accuracy, cls: 'nfl-bar--model' },
    { label: 'Always pick home', value: o.always_home_accuracy, cls: 'nfl-bar--base' },
    { label: 'Elo rating alone', value: o.elo_accuracy, cls: 'nfl-bar--base' },
    { label: 'Vegas closing favorite', value: o.vegas_accuracy, cls: 'nfl-bar--vegas' },
  ].filter((b) => b.value != null);

  return (
    <div className="nfl-accuracy">
      <h3>Model vs. baselines — {league.label} {accuracy.season}</h3>
      <p className="nfl-accuracy-note">
        {o.games} games scored. Football has strong base rates, so raw accuracy is not
        the story — the honest test is whether the model clears <em>Elo alone</em>, and
        how close it lands to the closing line.
      </p>
      {bars.map((b) => (
        <div key={b.label} className="nfl-bar-row">
          <span className="nfl-bar-label">{b.label}</span>
          <div className="nfl-bar-track">
            <div className={`nfl-bar-fill ${b.cls}`} style={{ width: `${(b.value || 0) * 100}%` }} />
          </div>
          <span className="nfl-bar-value">{pct(b.value)}</span>
        </div>
      ))}

      {accuracy.by_tier?.length > 0 && (
        <div className="nfl-tiers">
          <h4>By confidence tier</h4>
          <table className="nfl-table">
            <thead><tr><th>Tier</th><th>Games</th><th>Accuracy</th></tr></thead>
            <tbody>
              {[...accuracy.by_tier]
                .sort((a, b) => (TIER_ORDER[a.confidence_tier] ?? 9) - (TIER_ORDER[b.confidence_tier] ?? 9))
                .map((t) => (
                  <tr key={t.confidence_tier}>
                    <td><span className={`pred-chip pred-chip--${t.confidence_tier === 'medium' ? 'med' : t.confidence_tier}`}>{t.confidence_tier}</span></td>
                    <td>{t.games}</td>
                    <td>{pct(t.accuracy)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Bradley-Terry power rankings.
 *
 * Presented with the uncertainty attached rather than as a clean ladder, because the
 * ladder is the misleading part: outside the top couple of spots the bootstrap rank
 * ranges overlap almost completely, so a team "ranked 5th" is genuinely anywhere from
 * 2nd to 20th. The bar and the range column are doing the honest work here.
 */
function PowerRankings({ league, season }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ApiService.getFootballRankings(league.sport, season, 25);
        if (cancelled) return;
        setRows(res.data || []);
        setMeta(res.meta || null);
      } catch {
        if (!cancelled) { setRows([]); setMeta(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [league.sport, season]);

  if (loading) return null;
  if (meta?.note || !rows.length) return null;

  const top = rows[0]?.rating || 1;
  const floor = Math.min(...rows.map((r) => r.rating)) * 0.9;

  return (
    <div className="nfl-accuracy ft-rankings">
      <h3>Power rankings — {season}</h3>
      <p className="nfl-accuracy-note">
        A single global fit over every game, not a week-by-week rating walk, so the
        result does not depend on the order games were played. Home field is fit as an
        explicit term ({meta?.home_field_points?.toFixed(0)} points), and last season is
        carried in as a decaying prior
        {meta?.prior_weight != null && ` (now down to ${(meta.prior_weight * 100).toFixed(0)}% weight)`}
        so early-season ranks are not built on three games.{' '}
        <strong>The ordering below is mostly not meaningful.</strong> The “range” column
        is where each team lands across 300 bootstrap resamples — anywhere those ranges
        overlap, the teams are indistinguishable.
      </p>

      <div className="nfl-table-wrap">
        <table className="nfl-table ft-rank-table">
          <thead>
            <tr>
              <th>#</th><th>Team</th><th>Rec</th><th>Rating</th>
              <th>Beats next</th><th>Range (5–95%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const width = Math.max(2, ((r.rating - floor) / (top - floor)) * 100);
              const tossup = r.p_beat_next != null && r.p_beat_next < 0.55;
              return (
                <tr key={r.team}>
                  <td>{r.rank}</td>
                  <td className="nfl-team-cell">
                    {r.team}
                    <div className="ft-rank-bar">
                      <div className="ft-rank-bar-fill" style={{ width: `${width}%` }} />
                    </div>
                  </td>
                  <td>{r.record}</td>
                  <td>{Math.round(r.rating)}</td>
                  <td className={tossup ? 'ft-tossup' : undefined}>
                    {r.p_beat_next != null ? `${(r.p_beat_next * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="ft-range">{r.rank_p05}–{r.rank_p95}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatExplorer({ league, season }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [team, setTeam] = useState('');
  const [week, setWeek] = useState('');
  const [sort, setSort] = useState('off_epa_play');
  const [direction, setDirection] = useState('desc');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getFootballTeamStats(league.sport, {
        season, team: team || undefined, week: week || undefined,
        sort, direction, limit: 50,
      });
      setRows(res.data || []);
      setMeta(res.meta || null);
    } catch {
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [league.sport, season, team, week, sort, direction]);

  useEffect(() => { load(); }, [load]);

  const fields = meta?.sortable_fields?.length ? meta.sortable_fields : [];

  if (meta?.note) {
    return (
      <div className="nfl-explorer">
        <h3>Team stat explorer</h3>
        <p className="nfl-accuracy-note">{meta.note}</p>
      </div>
    );
  }

  return (
    <div className="nfl-explorer">
      <h3>Team stat explorer</h3>
      <div className="nfl-filters">
        <label>
          Team
          <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. PHI" />
        </label>
        <label>
          Week
          <input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="all" />
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {fields.filter((f) => !['season', 'week', 'team'].includes(f))
              .map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label>
          Order
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="desc">High → low</option>
            <option value="asc">Low → high</option>
          </select>
        </label>
      </div>

      <div className="nfl-explorer-meta">
        {loading ? 'Loading…' : `${rows.length} of ${meta?.total ?? 0} rows`}
      </div>

      <div className="nfl-table-wrap">
        <table className="nfl-table">
          <thead>
            <tr>
              <th>Season</th><th>Wk</th><th>Team</th>
              <th>Off EPA</th><th>Def EPA</th><th>Off SR</th>
              <th>Def SR</th><th>Explosive</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.season}-${r.week}-${r.team}`}>
                <td>{r.season}</td>
                <td>{r.week}</td>
                <td className="nfl-team-cell">{r.team}</td>
                <td>{r.off_epa_play?.toFixed(3) ?? '—'}</td>
                <td>{r.def_epa_play?.toFixed(3) ?? '—'}</td>
                <td>{pct(r.off_success_rate)}</td>
                <td>{pct(r.def_success_rate)}</td>
                <td>{pct(r.off_explosive_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FootballPredictionsPage() {
  const { league: leagueParam } = useParams();
  const navigate = useNavigate();

  const league = useMemo(
    () => LEAGUES.find((l) => l.key === leagueParam) || LEAGUES[0],
    [leagueParam]
  );

  const [season, setSeason] = useState(2025);
  const [week, setWeek] = useState(1);
  const [predictions, setPredictions] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [preds, acc] = await Promise.all([
          ApiService.getFootballPredictions(league.sport, {
            season, week, division: league.division,
          }),
          ApiService.getFootballAccuracy(league.sport, season, league.division),
        ]);
        if (cancelled) return;
        setPredictions(preds.data || []);
        setAccuracy(acc.data || null);
      } catch {
        if (!cancelled) setError('Could not load predictions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [league, season, week]);

  const ordered = useMemo(
    () => [...predictions].sort(
      (a, b) => (TIER_ORDER[a.confidence_tier] ?? 9) - (TIER_ORDER[b.confidence_tier] ?? 9)
        || b.home_win_probability - a.home_win_probability
    ),
    [predictions]
  );

  return (
    <div className="nfl-page">
      <header className="nfl-header">
        <h1>Football Predictions</h1>
        <p className="nfl-sub">
          Win probabilities for the NFL and college football, generated before each week
          and scored against the result. Ratings are Elo-based, with EPA-per-play added
          where play-by-play exists.
        </p>
      </header>

      <div className="nfl-controls">
        <label>
          League
          <select
            value={league.key}
            onChange={(e) => navigate(`/football/${e.target.value}`)}
          >
            {LEAGUES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </label>
        <label>
          Season
          <select value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {[2025, 2024, 2023].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Week
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: 21 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </label>
      </div>

      <AccuracyPanel accuracy={accuracy} league={league} />

      <PowerRankings league={league} season={season} />

      {loading && <div className="nfl-loading">Loading predictions…</div>}
      {error && <div className="nfl-error">{error}</div>}
      {!loading && !error && ordered.length === 0 && (
        <div className="nfl-empty">
          No predictions stored for {league.label} {season}, week {week}.
        </div>
      )}

      <div className="nfl-grid">
        {ordered.map((p) => <PredictionCard key={p.game_id} p={p} />)}
      </div>

      <StatExplorer league={league} season={season} />
    </div>
  );
}
