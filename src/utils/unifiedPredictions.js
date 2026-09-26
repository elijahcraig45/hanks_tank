/**
 * Pure helpers for the unified predictions pages (GET /api/predictions/:sport/slate and
 * /players). Kept free of React so the rules — what counts as missing, how a game is
 * ranked, how an export URL is built — are testable on their own.
 *
 * Contract: scratchpad predictions_contract.md (v1, 2026-09-25). Every model gets the same
 * treatment; production is only the default "featured" model. Missing is explicit: a
 * model with no row for a game is `null`, and a model whose table does not exist is
 * `available: false`. Neither is ever hidden.
 */

/* ── Dist ──────────────────────────────────────────────────────────────── */

export const DIST_FIELDS = ['mean', 'sd', 'p05', 'p25', 'p50', 'p75', 'p95', 'min', 'max', 'n'];

/** A Dist, a bare number, or null → the mean (or null). */
export function distMean(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'object' && v.mean != null && Number.isFinite(Number(v.mean))) return Number(v.mean);
  return null;
}

/** True when a value carries a real distribution (not just a mean). */
export function hasRange(v) {
  return Boolean(v && typeof v === 'object' && v.p05 != null && v.p95 != null);
}

/** True when a model's prediction carries any simulated distribution. */
export function hasDist(pred) {
  if (!pred) return false;
  return ['home_score', 'away_score', 'total', 'margin'].some((k) => hasRange(pred[k]))
    || hasRange(pred.dist);
}

export const fmtNum = (x, d = 1) => (x == null || !Number.isFinite(Number(x)) ? '—' : Number(x).toFixed(d));
export const fmtPct = (x, d = 0) => (x == null || !Number.isFinite(Number(x)) ? '—' : `${(Number(x) * 100).toFixed(d)}%`);
export const fmtSigned = (x, d = 1) => {
  if (x == null || !Number.isFinite(Number(x))) return '—';
  const n = Number(x);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;
};

/** "2–7" for a Dist's 90% range, integers kept as integers. */
export function fmtRange(d, lo = 'p05', hi = 'p95') {
  if (!d || d[lo] == null || d[hi] == null) return '—';
  const f = (x) => (Number.isInteger(x) ? String(x) : Number(x).toFixed(1));
  return `${f(d[lo])}–${f(d[hi])}`;
}

/* ── Models and rows ──────────────────────────────────────────────────── */

/**
 * One entry per model for a game, in the slate's model order, and never skipping one.
 * state: 'ok' (has a row) | 'none' (model is live but has no row for this game)
 *        | 'unavailable' (the model's table does not exist yet).
 */
export function modelRowsFor(game, models, shownKeys = null) {
  const keys = shownKeys ? new Set(shownKeys) : null;
  return (models || [])
    .filter((m) => !keys || keys.has(m.key))
    .map((m) => {
      const pred = game?.predictions?.[m.key] ?? null;
      let state = 'ok';
      if (m.available === false) state = 'unavailable';
      else if (!pred) state = 'none';
      return { model: m, key: m.key, pred: state === 'ok' ? pred : null, state };
    });
}

/** Why a model row is empty, for its tooltip. */
export function missingReason(row, sport) {
  // The backend explains an empty model in `note` (e.g. "table has not been created");
  // prefer its words, which know why, over a generic line.
  if (row.state !== 'ok' && row.model.note) return `${row.model.label || row.key}: ${row.model.note}`;
  if (row.state === 'unavailable') {
    return `${row.model.label || row.key} is not available${sport ? ` for ${sport.toUpperCase()}` : ''} yet: `
      + 'its predictions table does not exist, so there is nothing to show.';
  }
  if (row.state === 'none') {
    return `${row.model.label || row.key} has no prediction stored for this game.`;
  }
  return '';
}

/** Win probability for the side the model favours. */
export function pickOf(pred) {
  const p = pred?.home_win_prob;
  if (p == null || !Number.isFinite(p)) return null;
  return p >= 0.5 ? { side: 'home', prob: p } : { side: 'away', prob: 1 - p };
}

/** The featured model's pick; falls back to null (the card then says so). */
export function featuredPick(game, featuredKey) {
  return pickOf(game?.predictions?.[featuredKey]);
}

export const DISAGREEMENT_RANK = { low: 0, medium: 1, high: 2 };

/** low < 0.08 ≤ medium < 0.15 ≤ high, as in the contract; used only when the API omits it. */
export function disagreementOf(game) {
  if (game?.disagreement) return game.disagreement;
  const s = game?.consensus?.spread;
  if (s == null) return null;
  if (s < 0.08) return 'low';
  if (s < 0.15) return 'medium';
  return 'high';
}

/* ── Slate filtering and sorting ──────────────────────────────────────── */

export const SORTS = [
  { key: 'time', label: 'Start time' },
  { key: 'disagreement', label: 'Most disagreement' },
  { key: 'confidence', label: 'Most confident (featured)' },
];

export const DISAGREEMENT_FILTERS = [
  { key: 'all', label: 'Any disagreement' },
  { key: 'medium', label: 'Medium or high' },
  { key: 'high', label: 'High only' },
];

export const CONFIDENCE_FILTERS = [
  { key: '0', label: 'Any confidence' },
  { key: '0.55', label: '55%+' },
  { key: '0.6', label: '60%+' },
  { key: '0.64', label: '64%+' },
];

const startMs = (g) => (g?.start_time ? new Date(g.start_time).getTime() : Number.MAX_SAFE_INTEGER);

/**
 * Filter and sort a slate.
 * opts: { featured, sort, disagreement, minConfidence, search, lineupsOnly, favoritesOnly,
 *         isFavorite(game), lineupConfirmed(game) }
 */
export function filterSortGames(games, opts = {}) {
  const {
    featured, sort = 'time', disagreement = 'all', minConfidence = 0, search = '',
    lineupsOnly = false, favoritesOnly = false, isFavorite = () => false,
    lineupConfirmed = () => false,
  } = opts;
  const needle = search.trim().toLowerCase();
  const minDis = disagreement === 'all' ? -1 : DISAGREEMENT_RANK[disagreement];
  const min = Number(minConfidence) || 0;

  const out = (games || []).filter((g) => {
    if (minDis >= 0 && (DISAGREEMENT_RANK[disagreementOf(g)] ?? -1) < minDis) return false;
    if (min > 0) {
      const p = featuredPick(g, featured);
      if (!p || p.prob < min) return false;
    }
    if (lineupsOnly && !lineupConfirmed(g)) return false;
    if (favoritesOnly && !isFavorite(g)) return false;
    if (needle) {
      const hay = [g.home?.name, g.home?.abbr, g.away?.name, g.away?.abbr]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const byTime = (a, b) => startMs(a) - startMs(b);
  out.sort((a, b) => {
    if (sort === 'disagreement') {
      const d = (b.consensus?.spread ?? -1) - (a.consensus?.spread ?? -1);
      if (d !== 0) return d;
    } else if (sort === 'confidence') {
      const d = (featuredPick(b, featured)?.prob ?? 0) - (featuredPick(a, featured)?.prob ?? 0);
      if (d !== 0) return d;
    }
    return byTime(a, b);
  });
  return out;
}

/* ── Export ───────────────────────────────────────────────────────────── */

/**
 * `${apiBase}/predictions/${sport}/${kind}?…&format=csv|json`. Empty params are dropped so
 * an export means exactly what the page is showing.
 */
export function buildExportUrl(apiBase, sport, kind, params = {}, format = 'csv') {
  const base = String(apiBase || '').replace(/\/+$/, '');
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    qs.set(k, String(v));
  });
  if (format) qs.set('format', format);
  const q = qs.toString();
  return `${base}/predictions/${encodeURIComponent(sport)}/${kind}${q ? `?${q}` : ''}`;
}

/* ── Player projections ───────────────────────────────────────────────── */

export const BATTER_STATS = ['PA', 'H', 'HR', 'TB', 'BB', 'K', 'R', 'RBI'];
export const STARTER_STATS = ['K', 'BF', 'IP_outs', 'ER', 'H_allowed', 'BB_allowed'];
export const STAT_LABEL = {
  PA: 'PA', H: 'H', HR: 'HR', TB: 'TB', BB: 'BB', K: 'K', R: 'R', RBI: 'RBI',
  BF: 'BF', IP_outs: 'Outs', ER: 'ER', H_allowed: 'H', BB_allowed: 'BB',
};
export const STAT_TITLE = {
  PA: 'Plate appearances', H: 'Hits', HR: 'Home runs', TB: 'Total bases', BB: 'Walks',
  K: 'Strikeouts', R: 'Runs', RBI: 'Runs batted in', BF: 'Batters faced',
  IP_outs: 'Outs recorded (3 = one inning)', ER: 'Earned runs', H_allowed: 'Hits allowed',
  BB_allowed: 'Walks allowed',
};

/**
 * Long rows (player × stat) → one row per player with `stats[stat] = row`.
 * Stats are listed in the canonical order, then any extra the API sends.
 */
export function pivotPlayers(rows) {
  const byPlayer = new Map();
  (rows || []).forEach((r) => {
    const key = `${r.game_id}|${r.player_id}|${r.role}`;
    if (!byPlayer.has(key)) {
      byPlayer.set(key, {
        key,
        game_id: r.game_id,
        player_id: r.player_id,
        player_name: r.player_name,
        team_abbr: r.team_abbr,
        role: r.role,
        batting_order: r.batting_order ?? null,
        predicted_at: r.predicted_at,
        pregame: r.pregame,
        stats: {},
      });
    }
    byPlayer.get(key).stats[r.stat] = r;
  });
  return [...byPlayer.values()];
}

/** Stats present for a role, in canonical order. */
export function statsForRole(players, role) {
  const canon = role === 'starter' ? STARTER_STATS : BATTER_STATS;
  const seen = new Set();
  players.filter((p) => p.role === role).forEach((p) => Object.keys(p.stats).forEach((s) => seen.add(s)));
  return [...canon.filter((s) => seen.has(s)), ...[...seen].filter((s) => !canon.includes(s)).sort()];
}

/** Calibration of one stat across the shown rows: calibrated only when every row says so. */
export function statCalibration(players, stat) {
  const cells = players.map((p) => p.stats[stat]).filter(Boolean);
  if (!cells.length) return null;
  const calibrated = cells.every((c) => c.calibrated === true);
  const notes = [...new Set(cells.map((c) => c.calibration_note).filter(Boolean))];
  return { calibrated, note: notes.join(' · ') };
}

/** opts: { search, team, role, game } */
export function filterPlayers(players, opts = {}) {
  const { search = '', team = 'all', role = 'all', game = 'all' } = opts;
  const needle = search.trim().toLowerCase();
  return players.filter((p) => {
    if (team !== 'all' && p.team_abbr !== team) return false;
    if (role !== 'all' && p.role !== role) return false;
    if (game !== 'all' && String(p.game_id) !== String(game)) return false;
    if (needle && !`${p.player_name || ''} ${p.team_abbr || ''}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/**
 * sort: { key: 'order' | 'name' | 'team' | <stat>, dir: 'asc' | 'desc' }.
 * Batting order sorts team then slot; a stat sorts by its mean with missing last.
 */
export function sortPlayers(players, sort = { key: 'order', dir: 'asc' }) {
  const sign = sort.dir === 'desc' ? -1 : 1;
  const val = (p) => {
    if (sort.key === 'name') return p.player_name || '';
    if (sort.key === 'team') return p.team_abbr || '';
    if (sort.key === 'order') return null;
    return p.stats[sort.key]?.mean ?? null;
  };
  return [...players].sort((a, b) => {
    if (sort.key === 'order') {
      const t = String(a.game_id).localeCompare(String(b.game_id))
        || (a.team_abbr || '').localeCompare(b.team_abbr || '');
      if (t) return t;
      return sign * ((a.batting_order ?? 99) - (b.batting_order ?? 99));
    }
    const va = val(a); const vb = val(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') return sign * va.localeCompare(vb);
    return sign * (va - vb);
  });
}

/* ── Football favourites ──────────────────────────────────────────────── */

/** Football favourites are kept per sport so they never leak into the MLB team links. */
export function loadSportFavorites(sport) {
  try {
    const raw = window.localStorage.getItem(`ht-favorite-teams-${sport}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function toggleSportFavorite(sport, abbr) {
  const cur = loadSportFavorites(sport);
  const next = cur.includes(abbr) ? cur.filter((a) => a !== abbr) : [abbr, ...cur];
  try { window.localStorage.setItem(`ht-favorite-teams-${sport}`, JSON.stringify(next)); } catch { /* private mode */ }
  return next;
}
