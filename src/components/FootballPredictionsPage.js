import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import './styles/PredictionsPage.css';
import './styles/FootballPage.css';

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
 * "Why" cards, ported from generateWhyV8 on the MLB predictions page — the Elo,
 * Pythagorean, form and streak logic transfers straight to football; only the wording
 * changes ("runs" -> "points"). Signals a league doesn't have are skipped, which is how
 * CFB (no EPA, no betting lines) shares this with NFL.
 */
function generateWhy(p) {
  const reasons = [];
  const favName = p.home_win_probability > 0.5 ? p.home_team_name : p.away_team_name;

  if (p.elo_differential != null) {
    const d = p.elo_differential;
    reasons.push({
      tone: Math.abs(d) > 100 ? 'positive' : 'neutral',
      title: 'Team rating',
      detail:
        Math.abs(d) < 15
          ? 'Both teams rate almost identically — close to a coin flip on strength alone.'
          : `${d > 0 ? p.home_team_name : p.away_team_name} rates ${Math.abs(d).toFixed(0)} points higher, including home field.`,
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
      detail: 'FBS vs FCS games are usually lopsided — a confident pick here is cheap.',
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
      detail: 'No home-field advantage applied to either team.',
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
  const tierClass = p.confidence_tier === 'medium' ? 'med' : p.confidence_tier;

  return (
    <div className="ft-card">
      <div className="ft-card-head">
        <span className={`pred-chip pred-chip--${tierClass}`}>{p.confidence_tier}</span>
        {settled && (
          <span className={`ft-result ft-result--${p.prediction_correct ? 'hit' : 'miss'}`}>
            {p.prediction_correct ? '✓ correct' : '✗ missed'}
          </span>
        )}
      </div>

      <div className="ft-matchup">
        <span className={`ft-team ft-team--away${homeFav ? ' ft-team--fade' : ''}`}>
          {p.away_team_name}
        </span>
        <span className="ft-at">@</span>
        <span className={`ft-team ft-team--home${homeFav ? '' : ' ft-team--fade'}`}>
          {p.home_team_name}
        </span>
      </div>

      <div className="ft-prob-bar">
        <div className="ft-seg-away" style={{ width: `${100 - homePct}%` }} />
        <div className="ft-seg-home" style={{ width: `${homePct}%` }} />
      </div>
      <div className="ft-bar-labels">
        <span>{100 - homePct}% {p.away_team_name}</span>
        <span>{homePct}% {p.home_team_name}</span>
      </div>

      {settled && <div className="ft-final">Winner: <strong>{p.actual_winner}</strong></div>}

      <button className="ft-why-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide reasoning' : 'Why this pick?'}
      </button>

      {open && (
        <div className="ft-why">
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
  if (!accuracy?.overall?.games) return null;
  const o = accuracy.overall;

  const bars = [
    { label: 'This model', value: o.model_accuracy, cls: 'ft-bar--model' },
    { label: 'Always pick home', value: o.always_home_accuracy, cls: 'ft-bar--base' },
    { label: 'Team rating alone', value: o.elo_accuracy, cls: 'ft-bar--base' },
    { label: 'Vegas closing favorite', value: o.vegas_accuracy, cls: 'ft-bar--vegas' },
  ].filter((b) => b.value != null);

  return (
    <div className="ft-panel">
      <h2>How the model is doing — {league.label} {accuracy.season}</h2>
      <p className="ft-note">
        {o.games} games scored. Football is far more predictable than baseball, so the
        raw number matters less than the gap to these baselines.
      </p>
      {bars.map((b) => (
        <div key={b.label} className="ft-bar-row">
          <span className="ft-bar-label">{b.label}</span>
          <div className="ft-bar-track">
            <div className={`ft-bar-fill ${b.cls}`} style={{ width: `${(b.value || 0) * 100}%` }} />
          </div>
          <span className="ft-bar-value">{pct(b.value)}</span>
        </div>
      ))}

      {accuracy.by_tier?.length > 0 && (
        <>
          <h3>By confidence</h3>
          <div className="ft-table-wrap">
            <table className="ft-table">
              <thead><tr><th>Tier</th><th>Games</th><th>Accuracy</th></tr></thead>
              <tbody>
                {[...accuracy.by_tier]
                  .sort((a, b) => (TIER_ORDER[a.confidence_tier] ?? 9) - (TIER_ORDER[b.confidence_tier] ?? 9))
                  .map((t) => (
                    <tr key={t.confidence_tier}>
                      <td>
                        <span className={`pred-chip pred-chip--${t.confidence_tier === 'medium' ? 'med' : t.confidence_tier}`}>
                          {t.confidence_tier}
                        </span>
                      </td>
                      <td>{t.games}</td>
                      <td>{pct(t.accuracy)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Group the board into tiers.
 *
 * A flat 1..N list implies a precision the data doesn't have — #4 and #5 are separated
 * by less than a point. Tiers are the honest unit: a break starts wherever the gap to
 * the next team is large relative to the spread of gaps, so teams inside a tier are
 * genuinely interchangeable and teams across tiers are genuinely separated.
 */
function buildTiers(rows) {
  if (!rows.length) return [];
  const gaps = rows.map((r) => r.gap_to_next).filter((g) => g != null && !Number.isNaN(g));
  if (!gaps.length) return [{ label: 'All teams', desc: '', rows }];

  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  const breakAt = Math.max(median * 3, 25);

  const tiers = [];
  let current = [];
  rows.forEach((r, i) => {
    current.push(r);
    const gap = r.gap_to_next;
    const isLast = i === rows.length - 1;
    if (!isLast && gap != null && gap >= breakAt && current.length >= 1) {
      tiers.push(current);
      current = [];
    }
  });
  if (current.length) tiers.push(current);

  const NAMES = [
    ['In a class alone', 'clear separation from everyone below'],
    ['Real contenders', 'separated from the pack, not from each other'],
    ['The pack', 'interchangeable on this season’s results'],
    ['Solid', 'good teams without a distinguishing result'],
    ['The rest', 'ordering here is close to arbitrary'],
  ];

  return tiers.map((group, i) => {
    const [label, desc] = NAMES[Math.min(i, NAMES.length - 1)];
    return {
      label: tiers.length > NAMES.length && i >= NAMES.length - 1
        ? `${label} (${group[0].rank}–${group[group.length - 1].rank})`
        : label,
      desc,
      rows: group,
    };
  });
}

function RankRow({ r, floor, top }) {
  const width = Math.max(3, ((r.rating - floor) / (top - floor)) * 100);
  return (
    <div className="ft-rank-row">
      <span className="ft-rank-num">{r.rank}</span>
      <span>
        <span className="ft-rank-team">{r.team}</span>
        <span className="ft-rank-strength">
          <span className="ft-rank-strength-fill" style={{ width: `${width}%` }} />
        </span>
      </span>
      <span className="ft-rank-rec">{r.record}</span>
      <span className="ft-rank-rating">{Math.round(r.rating)}</span>
      <span className="ft-rank-range">
        {r.rank_p05 != null ? `${r.rank_p05}–${r.rank_p95}` : '—'}
      </span>
    </div>
  );
}

function PowerRankings({ league, season }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setExpanded(false);
      try {
        const res = await ApiService.getFootballRankings(league.sport, season, 400);
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

  const top25 = useMemo(() => rows.slice(0, 25), [rows]);
  const tiers = useMemo(() => buildTiers(top25), [top25]);
  const rest = useMemo(() => rows.slice(25), [rows]);

  if (loading || meta?.note || !rows.length) return null;

  const top = rows[0]?.rating || 1;
  const floor = (rows[Math.min(rows.length, 25) - 1]?.rating || 0) * 0.85;

  return (
    <div className="ft-panel">
      <h2>Power rankings — {season}</h2>
      <p className="ft-note">
        One global fit over every game rather than a week-by-week rating walk, so the
        result doesn’t depend on the order games were played. Home field is fit
        explicitly ({meta?.home_field_points?.toFixed(0)} points) and last season carries
        in as a decaying prior
        {meta?.prior_weight != null && ` (down to ${(meta.prior_weight * 100).toFixed(0)}% weight by now)`}.
        Teams are grouped into tiers because that’s the level the results actually
        support — within a tier the teams are effectively even.
      </p>

      {tiers.map((tier) => (
        <div key={tier.label}>
          <div className="ft-tier-head">
            <span className="ft-tier-name">{tier.label}</span>
            <span className="ft-tier-desc">{tier.desc}</span>
          </div>
          {tier.rows.map((r) => <RankRow key={r.team} r={r} floor={floor} top={top} />)}
        </div>
      ))}

      {rest.length > 0 && (
        <>
          {expanded && (
            <div>
              <div className="ft-tier-head">
                <span className="ft-tier-name">26–{rows.length}</span>
                <span className="ft-tier-desc">everyone else, same model</span>
              </div>
              {rest.map((r) => <RankRow key={r.team} r={r} floor={floor} top={top} />)}
            </div>
          )}
          <button className="ft-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Show top 25 only' : `Show all ${rows.length} teams`}
          </button>
        </>
      )}
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
      setRows([]); setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [league.sport, season, team, week, sort, direction]);

  useEffect(() => { load(); }, [load]);

  if (meta?.note) return null;
  const fields = (meta?.sortable_fields || []).filter(
    (f) => !['season', 'week', 'team'].includes(f)
  );

  return (
    <div className="ft-panel">
      <h2>Team stat explorer</h2>
      <div className="ft-filters">
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
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
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

      <div className="ft-meta">{loading ? 'Loading…' : `${rows.length} of ${meta?.total ?? 0} rows`}</div>

      <div className="ft-table-wrap">
        <table className="ft-table">
          <thead>
            <tr>
              <th>Season</th><th>Wk</th><th>Team</th><th>Off EPA</th>
              <th>Def EPA</th><th>Off SR</th><th>Def SR</th><th>Explosive</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.season}-${r.week}-${r.team}`}>
                <td>{r.season}</td>
                <td>{r.week}</td>
                <td><strong>{r.team}</strong></td>
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

  const [season, setSeason] = useState(2026);
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
    <div className="ft-page">
      <div className="ft-inner">
        <header className="ft-header">
          <h1>{league.label}</h1>
          <p className="ft-sub">
            Win probabilities generated before each week and scored against the result,
            built on team ratings fit over every game since 1999 (NFL) or 2016 (college).
          </p>
        </header>

        <div className="ft-controls">
          <label>
            League
            <select value={league.key} onChange={(e) => navigate(`/football/${e.target.value}`)}>
              {LEAGUES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </label>
          <label>
            Season
            <select value={season} onChange={(e) => setSeason(Number(e.target.value))}>
              {[2026, 2025, 2024].map((s) => <option key={s} value={s}>{s}</option>)}
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

        {loading && <div className="ft-state">Loading predictions…</div>}
        {error && <div className="ft-state ft-state--error">{error}</div>}
        {!loading && !error && ordered.length === 0 && (
          <div className="ft-state">
            No predictions stored for {league.label} {season}, week {week}.
          </div>
        )}

        {ordered.length > 0 && (
          <div className="ft-grid">
            {ordered.map((p) => <PredictionCard key={p.game_id} p={p} />)}
          </div>
        )}

        <StatExplorer league={league} season={season} />
      </div>
    </div>
  );
}
