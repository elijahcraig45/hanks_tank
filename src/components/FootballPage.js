import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ApiService from '../services/api';
import ScoreboardSection from './football/ScoreboardSection';
import RankingsBoard from './RankingsBoard';
import FootballDiagnostics from './FootballDiagnostics';
import './styles/FootballPage.css';

/**
 * The football tab.
 *
 * One page for all three leagues. Leagues and sections are sub-navigation rather than
 * separate top-level tabs, because the three leagues share a model, a schema and a
 * vocabulary — splitting them into three nav entries would triple the shell to say the
 * same thing three times.
 *
 * Coverage is uneven and that is a fact about the feeds, not a bug: NFL has per-week
 * EPA but no power rankings yet, CFB has rankings but no advanced team stats. Sections
 * a league genuinely lacks render an explicit note instead of vanishing, so a missing
 * panel never reads as a broken page.
 */

export const LEAGUES = [
  { key: 'nfl', sport: 'nfl', division: null, label: 'NFL', short: 'NFL' },
  { key: 'fbs', sport: 'cfb', division: 'fbs', label: 'College FBS', short: 'FBS' },
  { key: 'fcs', sport: 'cfb', division: 'fcs', label: 'College FCS', short: 'FCS' },
];

const SECTIONS = [
  { key: 'picks', label: 'Picks' },
  // College only for now: the live feed behind it publishes no NFL data.
  { key: 'scoreboard', label: 'Scores', availableFor: (l) => l.sport === 'cfb' },
  { key: 'rankings', label: 'Power Rankings' },
  { key: 'diagnostics', label: 'Diagnostics' },
  { key: 'leaders', label: 'Leaders' },
  { key: 'players', label: 'Players' },
  { key: 'stats', label: 'Team Stats' },
];

const TIER_ORDER = { high: 0, medium: 1, low: 2 };
const SEASONS = [2026, 2025, 2024];

function pct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

function num(v, digits = 3) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

function EmptyState({ title, detail, action, children }) {
  return (
    <div className="ft-empty">
      <div className="ft-empty-title">{title}</div>
      {detail && <p className="ft-empty-detail">{detail}</p>}
      {action && (
        <button className="ft-empty-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

function Tier({ tier }) {
  const cls = tier === 'medium' ? 'med' : tier;
  return <span className={`ft-chip ft-chip--${cls}`}>{tier}</span>;
}

/* ── Why cards ──────────────────────────────────────────────────────────────
   Signals a league does not carry are skipped rather than rendered empty, which
   is how CFB (no EPA, no betting lines) shares this with NFL. */
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

function kickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function PredictionCard({ p, homeRank, awayRank }) {
  const [open, setOpen] = useState(false);
  const homeFav = p.home_win_probability > 0.5;
  const homePct = Math.round(p.home_win_probability * 100);
  const settled = p.prediction_correct !== null && p.prediction_correct !== undefined;

  return (
    <div className={`ft-card${settled ? ' ft-card--settled' : ''}`}>
      <div className="ft-card-head">
        <Tier tier={p.confidence_tier} />
        <span className="ft-card-date">{kickoff(p.game_date)}</span>
        {settled && (
          <span className={`ft-result ft-result--${p.prediction_correct ? 'hit' : 'miss'}`}>
            {p.prediction_correct ? '✓' : '✗'}
          </span>
        )}
      </div>

      <div className="ft-matchup">
        <div className={`ft-side${homeFav ? ' ft-side--fade' : ''}`}>
          <span className="ft-side-team">
            {awayRank && <span className="ft-rank">#{awayRank}</span>}
            {p.away_team_name}
          </span>
          <span className="ft-side-pct">{100 - homePct}%</span>
        </div>
        <div className={`ft-side${homeFav ? '' : ' ft-side--fade'}`}>
          <span className="ft-side-team">
            <span className="ft-at">@</span>
            {homeRank && <span className="ft-rank">#{homeRank}</span>}
            {p.home_team_name}
          </span>
          <span className="ft-side-pct">{homePct}%</span>
        </div>
      </div>

      <div className="ft-prob-bar" role="img"
           aria-label={`${homePct} percent ${p.home_team_name}`}>
        <div className="ft-seg-away" style={{ width: `${100 - homePct}%` }} />
        <div className="ft-seg-home" style={{ width: `${homePct}%` }} />
      </div>

      {settled && (
        <div className="ft-final">
          Final · <strong>{p.actual_winner}</strong>
        </div>
      )}

      <button className="ft-why-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide reasoning' : 'Why this pick?'}
      </button>

      {open && (
        <div className="ft-why">
          {generateWhy(p).map((r, i) => (
            <div key={i} className={`ft-reason ft-reason--${r.tone}`}>
              <div className="ft-reason-title">{r.title}</div>
              <div className="ft-reason-detail">{r.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccuracyStrip({ accuracy, league }) {
  if (!accuracy?.overall?.games) return null;
  const o = accuracy.overall;

  const bars = [
    { label: 'This model', value: o.model_accuracy, cls: 'ft-bar--model' },
    { label: 'Always pick home', value: o.always_home_accuracy, cls: 'ft-bar--base' },
    { label: 'Team rating alone', value: o.elo_accuracy, cls: 'ft-bar--base' },
    { label: 'Vegas closing favorite', value: o.vegas_accuracy, cls: 'ft-bar--vegas' },
  ].filter((b) => b.value != null);

  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>Model accuracy — {league.label} {accuracy.season}</h2>
        <span className="ft-panel-meta">{o.games} games scored</span>
      </div>
      <p className="ft-note">
        Football is far more predictable than baseball, so the raw number matters less
        than the gap to these baselines.
      </p>

      <div className="ft-bars">
        {bars.map((b) => (
          <div key={b.label} className="ft-bar-row">
            <span className="ft-bar-label">{b.label}</span>
            <div className="ft-bar-track">
              <div className={`ft-bar-fill ${b.cls}`} style={{ width: `${(b.value || 0) * 100}%` }} />
            </div>
            <span className="ft-bar-value">{pct(b.value)}</span>
          </div>
        ))}
      </div>

      {accuracy.by_tier?.length > 0 && (
        <div className="ft-tier-strip">
          {[...accuracy.by_tier]
            .sort((a, b) => (TIER_ORDER[a.confidence_tier] ?? 9) - (TIER_ORDER[b.confidence_tier] ?? 9))
            .map((t) => (
              <div key={t.confidence_tier} className="ft-tier-stat">
                <Tier tier={t.confidence_tier} />
                <span className="ft-tier-acc">{pct(t.accuracy)}</span>
                <span className="ft-tier-games">{t.games} games</span>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}


/* ── League leaders ─────────────────────────────────────────────────────── */
function LeadersSection({ league, season, setSeason }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setCategory(null);
      setFailed(false);
      try {
        const res = await ApiService.getFootballLeaders(league.sport, { season });
        if (cancelled) return;
        setRows(res.data || []);
        setMeta(res.meta || null);
      } catch {
        // A request that failed is not the same as a season with no leaders, and
        // saying "no leaders" would blame the data for a transport problem.
        if (!cancelled) { setRows([]); setMeta(null); setFailed(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [league.sport, season]);

  const categories = meta?.categories || [];
  const active = category || categories[0]?.key;
  const shown = useMemo(
    () => rows.filter((r) => r.category === active).sort((a, b) => a.rank - b.rank),
    [rows, active]
  );

  if (loading) return <div className="ft-state">Loading leaders…</div>;

  if (failed) {
    return (
      <EmptyState
        title="Could not load league leaders"
        detail="The leaders endpoint did not respond. It may not be deployed yet."
      />
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        title={`No league leaders for ${league.label} ${season}`}
        detail={
          meta?.note
          || `Leaders appear once ${season} has games to rank. The completed ${season - 1} season is available now.`
        }
        action={
          setSeason
            ? { label: `Show ${season - 1} leaders`, onClick: () => setSeason(season - 1) }
            : null
        }
      />
    );
  }

  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>League leaders — {league.label} {season}</h2>
        <span className="ft-panel-meta">{categories.length} categories</span>
      </div>
      {league.sport === 'cfb' && (
        <p className="ft-note">
          The college leaders feed is a single national board, so FBS and FCS players
          appear together.
        </p>
      )}

      <div className="ft-cats" role="tablist" aria-label="Stat category">
        {categories.map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={c.key === active}
            className={`ft-cat${c.key === active ? ' ft-cat--active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ol className="ft-leaders">
        {shown.map((r) => (
          <li key={`${r.category}-${r.rank}-${r.player_name}`} className="ft-leader">
            <span className="ft-leader-rank">{r.rank}</span>
            <span className="ft-leader-name">
              {r.player_name || '—'}
              {r.position && <span className="ft-leader-pos">{r.position}</span>}
            </span>
            <span className="ft-leader-team">{r.team}</span>
            <span className="ft-leader-value">{r.display_value}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Player lookup ──────────────────────────────────────────────────────── */
function PlayersSection({ league, season, setSeason }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [sort, setSort] = useState('passing_yards');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await ApiService.getFootballPlayers(league.sport, {
        season, search: search || undefined, position: position || undefined,
        sort, limit: 50,
      });
      setRows(res.data || []);
      setMeta(res.meta || null);
    } catch {
      // Distinguished from an empty result: rendering "no players match those
      // filters" after a failed request blames the filters for a broken endpoint.
      setRows([]); setMeta(null); setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [league.sport, season, search, position, sort]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  if (loading && !meta) return <div className="ft-state">Loading players…</div>;

  if (failed) {
    return (
      <EmptyState
        title="Could not load player stats"
        detail="The player endpoint did not respond. It may not be deployed yet."
      />
    );
  }

  if (meta?.note) {
    return <EmptyState title={`No player table for ${league.label}`} detail={meta.note} />;
  }

  // A season the league has not played yet is a dead end unless the page offers the
  // one that has data — otherwise the filters look broken rather than the season empty.
  if (!loading && !rows.length && !search && !position && meta?.total === 0) {
    return (
      <EmptyState
        title={`No player stats for ${league.label} ${season}`}
        detail={`The ${season} season has not produced stats yet. The completed ${season - 1} season is available now.`}
        action={
          setSeason
            ? { label: `Show ${season - 1} players`, onClick: () => setSeason(season - 1) }
            : null
        }
      />
    );
  }

  const fields = meta?.sortable_fields || [];

  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>Players — {league.label} {season}</h2>
        <span className="ft-panel-meta">
          {loading ? 'Loading…' : `${rows.length} of ${meta?.total ?? 0}`}
        </span>
      </div>

      <div className="ft-filters">
        <label>
          Name
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Stafford"
          />
        </label>
        <label>
          Position
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="QB"
          />
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>

      <div className="ft-table-wrap">
        <table className="ft-table">
          <thead>
            <tr>
              <th>Player</th><th>Pos</th><th>Team</th><th>G</th>
              <th>Pass yds</th><th>Pass TD</th><th>Rush yds</th>
              <th>Rec yds</th><th>Rec</th><th>Sacks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player_id}>
                <td><strong>{r.player_display_name}</strong></td>
                <td>{r.position ?? '—'}</td>
                <td>{r.recent_team ?? '—'}</td>
                <td>{r.games ?? '—'}</td>
                <td>{r.passing_yards ?? '—'}</td>
                <td>{r.passing_tds ?? '—'}</td>
                <td>{r.rushing_yards ?? '—'}</td>
                <td>{r.receiving_yards ?? '—'}</td>
                <td>{r.receptions ?? '—'}</td>
                <td>{r.def_sacks ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (
        <div className="ft-state">No players match those filters.</div>
      )}
    </section>
  );
}

/* ── Team stats ─────────────────────────────────────────────────────────── */
/**
 * Format a value according to the column spec the API sent.
 *
 * The spec comes from the response, not from this file. That is the whole point: NFL's
 * per-week EPA table and college's 154-column season table share no column names, and
 * hardcoding either set here is what kept the college table off the site.
 */
function formatCell(value, format) {
  if (value === null || value === undefined || value === '') return '—';
  switch (format) {
    case 'text': return value;
    case 'integer': return Number(value).toLocaleString();
    case 'decimal1': return Number(value).toFixed(1);
    case 'decimal2': return Number(value).toFixed(2);
    case 'decimal3': return num(value, 3);
    case 'percent': return `${Number(value).toFixed(1)}%`;
    case 'rate': return pct(value);
    default: return String(value);
  }
}

/**
 * Good/bad colouring, where the column says which direction is good.
 *
 * `higher_is_better` is null for identity and volume columns — a play count is neither
 * good nor bad — and those stay unstyled rather than being forced into a colour.
 */
function cellTone(value, col) {
  if (col.higher_is_better === null || col.higher_is_better === undefined) return '';
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const n = Number(value);
  if (n === 0) return '';
  const good = col.higher_is_better ? n > 0 : n < 0;
  return good ? 'ft-pos' : 'ft-neg';
}

/**
 * One table, driven entirely by `meta.columns`.
 *
 * Adding a sport or widening a feed needs a catalog entry on the server and nothing
 * here. RankingsBoard already worked this way; this brings the stats tables in line.
 */
function ColumnDrivenTable({ columns, rows: dataRows, rowKey }) {
  return (
    <div className="ft-table-wrap">
      <table className="ft-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} title={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  className={ci === 0 ? undefined : cellTone(r[c.key], c)}
                >
                  {ci === 0 ? <strong>{formatCell(r[c.key], c.format)}</strong>
                            : formatCell(r[c.key], c.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Scopes a league can offer, decided by what the API says exists. */
const STAT_SCOPES = [
  { key: 'season', label: 'Season totals' },
  { key: 'week', label: 'By week' },
];

/**
 * Team stats, at whichever grain the league actually has.
 *
 * Two endpoints sit behind this: `/stats/teams` is a per-team-per-week game log and
 * `/stats/teams/season` is per-team season totals. They are separate resources with
 * different filters — the season table has no week column at all — so the section picks
 * one and renders whatever columns come back.
 *
 * Which scopes appear is discovered, not assumed: each response advertises the other's
 * path when it exists, so college showing season-only and the NFL showing week-only is
 * data, not a hardcoded per-sport branch.
 */
function StatsSection({ league, season }) {
  const [scope, setScope] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [group, setGroup] = useState('core');
  const [team, setTeam] = useState('');
  const [week, setWeek] = useState('');
  const [sort, setSort] = useState('');
  const [direction, setDirection] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState({ week: false, season: false });

  // Reset per-scope choices when the league or scope changes: a sort field from the
  // college season table is not a valid sort on the NFL week table.
  useEffect(() => { setSort(''); setGroup('core'); setWeek(''); }, [league.sport, scope]);
  useEffect(() => { setScope(null); }, [league.sport]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // First load probes the week endpoint, which reports whether a season table
      // exists via meta.season_endpoint, so one request settles what this league has.
      const effective = scope
        || (league.sport === 'cfb' ? 'season' : 'week');

      const res = effective === 'season'
        ? await ApiService.getFootballTeamSeasonStats(league.sport, {
          season,
          team: team || undefined,
          group: group === 'core' ? undefined : group,
          sort: sort || undefined,
          direction,
          limit: 50,
        })
        : await ApiService.getFootballTeamStats(league.sport, {
          season,
          team: team || undefined,
          week: week || undefined,
          sort: sort || undefined,
          direction,
          limit: 50,
        });

      const m = res.meta || null;
      setRows(res.data || []);
      setMeta(m);
      if (!scope) setScope(effective);
      setAvailable({
        week: effective === 'week'
          ? !m?.note
          : Boolean(m?.week_endpoint),
        season: effective === 'season'
          ? !m?.note
          : Boolean(m?.season_endpoint),
      });
    } catch {
      setRows([]); setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [league.sport, season, scope, team, week, group, sort, direction]);

  useEffect(() => { load(); }, [load]);

  if (loading && !meta) return <div className="ft-state">Loading team stats…</div>;

  const columns = meta?.columns || [];
  const scopes = STAT_SCOPES.filter((sc) => available[sc.key]);
  const activeScope = meta?.scope || scope;

  const scopeSwitch = scopes.length > 1 && (
    <div className="ft-scope-switch">
      {scopes.map((sc) => (
        <button
          key={sc.key}
          className={`ft-scope${activeScope === sc.key ? ' ft-scope--on' : ''}`}
          onClick={() => setScope(sc.key)}
        >
          {sc.label}
        </button>
      ))}
    </div>
  );

  // A note means this scope has nothing to show. The reason comes from the API rather
  // than from a sentence written here, because a sentence here goes stale silently the
  // moment the feed lands.
  if (meta?.note && !rows.length) {
    return (
      <>
        {scopeSwitch}
        <EmptyState
          title={`No ${activeScope === 'season' ? 'season' : 'per-week'} team stats for ${league.label}`}
          detail={meta.note}
        />
      </>
    );
  }

  const sortable = meta?.sortable_fields || [];
  const labelFor = (key) => {
    const col = columns.find((c) => c.key === key);
    return col ? col.label : key;
  };

  return (
    <section className="ft-panel">
      <div className="ft-panel-head">
        <h2>Team stats — {league.label} {season}</h2>
        <span className="ft-panel-meta">
          {loading ? 'Loading…' : `${rows.length} of ${meta?.total ?? 0} rows`}
        </span>
      </div>

      {scopeSwitch}

      <p className="ft-note">
        {activeScope === 'season'
          ? 'One row is one team\u2019s whole season. Opponent columns are what teams did against them \u2014 the only defensive view this feed carries.'
          : 'One row is one team\u2019s one game, not a season average \u2014 filter to a team to read it as a game log.'}
      </p>

      {meta?.coverage && <p className="ft-note ft-note--warn">{meta.coverage}</p>}

      <div className="ft-filters">
        <label>
          Team
          <input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder={activeScope === 'season' ? 'e.g. Ohio State' : 'e.g. PHI'}
          />
        </label>

        {activeScope === 'week' && (
          <label>
            Week
            <input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="all" />
          </label>
        )}

        {activeScope === 'season' && (meta?.groups || []).length > 1 && (
          <label>
            Columns
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {(meta.groups || []).map((g) => (
                <option key={g.key} value={g.key}>{g.label} ({g.count})</option>
              ))}
              <option value="all">Everything</option>
            </select>
          </label>
        )}

        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Default</option>
            {sortable.map((f) => (
              <option key={f} value={f}>{labelFor(f)}</option>
            ))}
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

      <ColumnDrivenTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.season}-${r.week ?? 's'}-${r.team ?? i}`}
      />

      {!loading && rows.length === 0 && (
        <div className="ft-state">No rows match those filters.</div>
      )}
    </section>
  );
}

/* ── Picks ─────────────────────────────────────────────── */

/** Filters that only make sense for some leagues are hidden, not disabled. */
const TIERS = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

function PicksSection({ league, season, week, setWeek, weeks, predictions,
                       loading, error, ranks, conferences }) {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [rankedOnly, setRankedOnly] = useState(false);
  const [hideMismatch, setHideMismatch] = useState(false);
  const [conference, setConference] = useState('all');

  // Only offer to hide mismatches where the league actually has them.
  const hasMismatches = useMemo(
    () => predictions.some((p) => p.cross_division),
    [predictions]
  );

  // Memoized so the filter and conference-list memos can depend on them honestly
  // rather than silencing the exhaustive-deps rule.
  const rankOf = useCallback(
    (name) => (ranks ? ranks.get(name) : undefined), [ranks]
  );
  const confOf = useCallback(
    (name) => (conferences ? conferences.get(name) : undefined), [conferences]
  );

  // Only conferences with a game this week, so the picker never offers an empty option.
  const weekConferences = useMemo(() => {
    if (!conferences) return [];
    const found = new Set();
    predictions.forEach((p) => {
      [confOf(p.home_team_name), confOf(p.away_team_name)].forEach((c) => c && found.add(c));
    });
    return [...found].sort((a, b) => a.localeCompare(b));
  }, [predictions, conferences, confOf]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return predictions
      .filter((p) => {
        if (tier !== 'all' && (p.confidence_tier || '').toLowerCase() !== tier) return false;
        if (hideMismatch && p.cross_division) return false;
        if (rankedOnly && !(rankOf(p.home_team_name) || rankOf(p.away_team_name))) return false;
        if (conference !== 'all'
            && confOf(p.home_team_name) !== conference
            && confOf(p.away_team_name) !== conference) return false;
        if (needle) {
          const haystack = `${p.home_team_name} ${p.away_team_name}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort(
        (a, b) => (TIER_ORDER[a.confidence_tier] ?? 9) - (TIER_ORDER[b.confidence_tier] ?? 9)
          || b.home_win_probability - a.home_win_probability
      );
  }, [predictions, search, tier, rankedOnly, hideMismatch, conference, rankOf, confOf]);

  if (loading) return <div className="ft-state">Loading picks…</div>;
  if (error) return <div className="ft-state ft-state--error">{error}</div>;

  if (!weeks.length) {
    return (
      <EmptyState
        title={`No stored picks for ${league.label} ${season}`}
        detail="Predictions are written before each week and scored after. Nothing has been generated for this season yet."
      />
    );
  }

  const filtered = shown.length !== predictions.length;
  const clearAll = () => {
    setSearch(''); setTier('all'); setRankedOnly(false);
    setHideMismatch(false); setConference('all');
  };

  return (
    <>
      <div className="ft-weeks" role="tablist" aria-label="Week">
        {weeks.map((w) => (
          <button
            key={w}
            role="tab"
            aria-selected={w === week}
            className={`ft-week${w === week ? ' ft-week--active' : ''}`}
            onClick={() => setWeek(w)}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="ft-pickbar">
        <input
          className="ft-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams…"
          aria-label="Search teams"
        />

        <div className="ft-toggles" role="group" aria-label="Confidence">
          {TIERS.map((t) => (
            <button
              key={t.key}
              className={`ft-toggle${tier === t.key ? ' ft-toggle--on' : ''}`}
              aria-pressed={tier === t.key}
              onClick={() => setTier(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {weekConferences.length > 1 && (
          <select
            className="ft-conf"
            value={conference}
            onChange={(e) => setConference(e.target.value)}
            aria-label="Conference"
          >
            <option value="all">All conferences</option>
            {weekConferences.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {ranks && (
          <button
            className={`ft-toggle${rankedOnly ? ' ft-toggle--on' : ''}`}
            aria-pressed={rankedOnly}
            onClick={() => setRankedOnly((v) => !v)}
            title="Only games involving a top-25 team"
          >
            Top 25 only
          </button>
        )}

        {hasMismatches && (
          <button
            className={`ft-toggle${hideMismatch ? ' ft-toggle--on' : ''}`}
            aria-pressed={hideMismatch}
            onClick={() => setHideMismatch((v) => !v)}
            title="FBS-vs-FCS games are lopsided, so a confident pick there is cheap"
          >
            Hide mismatches
          </button>
        )}

        <span className="ft-count">
          {shown.length} of {predictions.length}
          {filtered && (
            <button className="ft-clear" onClick={clearAll}>clear</button>
          )}
        </span>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No games match these filters"
          detail={`Week ${week} has ${predictions.length} games; none of them match.`}
          action={{ label: 'Clear filters', onClick: clearAll }}
        />
      ) : (
        <div className="ft-grid">
          {shown.map((p) => (
            <PredictionCard
              key={p.game_id}
              p={p}
              homeRank={rankOf(p.home_team_name)}
              awayRank={rankOf(p.away_team_name)}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function FootballPage() {
  const { league: leagueParam, section: sectionParam } = useParams();
  const navigate = useNavigate();

  const league = useMemo(
    () => LEAGUES.find((l) => l.key === leagueParam) || LEAGUES[0],
    [leagueParam]
  );
  const sectionDef = SECTIONS.find((s) => s.key === sectionParam);
  const section = (sectionDef
    && (!sectionDef.availableFor || sectionDef.availableFor(league)))
    ? sectionDef.key
    : 'picks';

  const [season, setSeason] = useState(SEASONS[0]);
  // Fetched once for the whole page: the picks filters, the diagnostics conference
  // breakdown and the rank badges all read from the same board.
  const [ranks, setRanks] = useState(null);
  const [conferences, setConferences] = useState(null);
  const [week, setWeek] = useState(null);
  const [seasonPreds, setSeasonPreds] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // One season-wide fetch rather than one per week: it yields the list of weeks that
  // actually have predictions, so the week selector never offers an empty week.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [preds, acc] = await Promise.all([
          ApiService.getFootballPredictions(league.sport, {
            season, division: league.division,
          }),
          ApiService.getFootballAccuracy(league.sport, season, league.division).catch(() => null),
        ]);
        if (cancelled) return;
        const rows = preds.data || [];
        setSeasonPreds(rows);
        setAccuracy(acc?.data || null);

        const available = [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b);
        setWeek(pickDefaultWeek(rows, available));
      } catch {
        if (!cancelled) { setError('Could not load football data.'); setSeasonPreds([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [league, season]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.getRankings(league.sport, {
          season, division: league.division, limit: 400,
        });
        if (cancelled) return;
        const rows = res.data || [];
        // Null rather than an empty Map: an empty Map is truthy, so the controls that
        // depend on a board existing would render with nothing behind them.
        const ranked = new Map(
          rows.filter((r) => r.rank <= 25).map((r) => [r.team, r.rank])
        );
        const confs = new Map(
          rows.filter((r) => r.conference).map((r) => [r.team, r.conference])
        );
        setRanks(ranked.size ? ranked : null);
        setConferences(confs.size ? confs : null);
      } catch {
        if (!cancelled) { setRanks(null); setConferences(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [league.sport, league.division, season]);

  const confOf = useCallback(
    (name) => (conferences ? conferences.get(name) : undefined), [conferences]
  );
  const allConferences = useMemo(
    () => (conferences ? [...new Set(conferences.values())].sort((a, b) => a.localeCompare(b)) : []),
    [conferences]
  );

  const weeks = useMemo(
    () => [...new Set(seasonPreds.map((r) => r.week))].sort((a, b) => a - b),
    [seasonPreds]
  );
  const weekPreds = useMemo(
    () => seasonPreds.filter((r) => r.week === week),
    [seasonPreds, week]
  );

  const go = (l, s) => navigate(`/football/${l}/${s}`);

  return (
    <div className="ft-page">
      <header className="ft-hero">
        <div className="ft-hero-inner">
          <div className="ft-hero-top">
            <h1>Football</h1>
            <select
              className="ft-season"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              aria-label="Season"
            >
              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="ft-leagues" role="tablist" aria-label="League">
            {LEAGUES.map((l) => (
              <button
                key={l.key}
                role="tab"
                aria-selected={l.key === league.key}
                className={`ft-league${l.key === league.key ? ' ft-league--active' : ''}`}
                onClick={() => go(l.key, section)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="ft-sections" aria-label="Section">
          {/* A section a league genuinely cannot serve is not shown at all. Sections
              whose data merely is not built yet DO show, and say so — the difference
              between "this sport has no such feed" and "not loaded yet" is worth
              keeping visible. */}
          {SECTIONS.filter((s) => !s.availableFor || s.availableFor(league)).map((s) => (
            <button
              key={s.key}
              className={`ft-section${s.key === section ? ' ft-section--active' : ''}`}
              onClick={() => go(league.key, s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="ft-body">
        {section === 'picks' && (
          <>
            <AccuracyStrip accuracy={accuracy} league={league} />
            <PicksSection
              league={league} season={season} week={week} setWeek={setWeek}
              weeks={weeks} predictions={weekPreds} loading={loading} error={error}
              ranks={ranks} conferences={conferences}
            />
          </>
        )}
        {section === 'diagnostics' && (
          <FootballDiagnostics
            league={league}
            conferenceOf={confOf}
            conferences={allConferences}
          />
        )}
        {section === 'rankings' && (
          <RankingsBoard
            sport={league.sport}
            season={season}
            division={league.division}
            accent="ftbl"
            title={league.label}
          />
        )}
        {section === 'leaders' && (
          <LeadersSection league={league} season={season} setSeason={setSeason} />
        )}
        {section === 'players' && (
          <PlayersSection league={league} season={season} setSeason={setSeason} />
        )}
        {section === 'scoreboard' && (
          <ScoreboardSection league={league} season={season} />
        )}
        {section === 'stats' && <StatsSection league={league} season={season} />}

        <p className="ft-foot">
          Ratings are fit over every game since 1999 (NFL) or 2014 (college).{' '}
          <Link to="/">Back to the scoreboard</Link>
        </p>
      </div>
    </div>
  );
}

/** The week a visitor means by "now": the earliest week still holding an unplayed game,
 *  else the most recent week with results. */
export function pickDefaultWeek(rows, available) {
  if (!available.length) return null;
  const now = Date.now();
  const upcoming = rows
    .filter((r) => r.game_date && new Date(r.game_date).getTime() >= now)
    .map((r) => r.week);
  if (upcoming.length) return Math.min(...upcoming);
  return available[available.length - 1];
}
