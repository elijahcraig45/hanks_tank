/**
 * Contract-shaped fixtures for the unified predictions endpoints (contract v1).
 * Loaded only when REACT_APP_PREDICTIONS_MOCKS=true (dynamic import, its own chunk) and by
 * the tests. Values are made up but shaped exactly like the contract: Dist everywhere, a
 * model with `available: false`, a game where a model has no row, and a post-start row.
 */

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A discrete-count Dist around `mean` with spread `sd` (integers for percentiles). */
export function countDist(mean, sd, n = 3000, { floor = 0, discrete = true } = {}) {
  const q = (z) => mean + z * sd;
  const r = (x) => (discrete ? Math.max(floor, Math.round(x)) : Math.round(x * 10) / 10);
  return {
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(sd * 100) / 100,
    p05: r(q(-1.645)),
    p25: r(q(-0.674)),
    p50: r(q(0)),
    p75: r(q(0.674)),
    p95: r(q(1.645)),
    min: r(q(-3.2)),
    max: r(q(3.6)),
    n,
  };
}

const meanOnly = (mean) => ({
  mean, sd: null, p05: null, p25: null, p50: null, p75: null, p95: null, min: null, max: null, n: null,
});

function spreadOf(preds) {
  const ps = Object.values(preds).filter(Boolean).map((p) => p.home_win_prob);
  if (!ps.length) return { home_win_prob_mean: null, spread: null, models_n: 0 };
  const mean = ps.reduce((a, b) => a + b, 0) / ps.length;
  return {
    home_win_prob_mean: Math.round(mean * 1000) / 1000,
    spread: Math.round((Math.max(...ps) - Math.min(...ps)) * 1000) / 1000,
    models_n: ps.length,
  };
}
const disagreement = (s) => (s == null ? null : s < 0.08 ? 'low' : s < 0.15 ? 'medium' : 'high');

/* ── MLB ─────────────────────────────────────────────────────────────── */

const MLB_MODELS = [
  { key: 'v10', label: 'V10', role: 'production', available: true, outputs: ['win_prob'], learn: '/learn/mlb-v10-features.html' },
  { key: 'logit3', label: 'Logit-3', role: 'shadow', available: true, outputs: ['win_prob'], learn: '/learn/ml-lessons.html' },
  { key: 'sim_blend', label: 'Sim blend', role: 'shadow', available: true, outputs: ['win_prob', 'score', 'total', 'margin', 'dist', 'players'], learn: '/learn/mlb-pa-simulator.html' },
  { key: 'elo', label: 'Elo', role: 'reference', available: true, outputs: ['win_prob'], learn: '/learn/model-history.html' },
  { key: 'market', label: 'Market', role: 'benchmark', available: false, outputs: ['win_prob', 'total'], learn: '/learn/v10-vs-pa-sim.html' },
];

const MLB_GAMES = [
  ['824776', '19:05', { id: '144', name: 'Atlanta Braves', abbr: 'ATL' }, { id: '121', name: 'New York Mets', abbr: 'NYM' }],
  ['824777', '19:10', { id: '111', name: 'Boston Red Sox', abbr: 'BOS' }, { id: '116', name: 'Detroit Tigers', abbr: 'DET' }],
  ['824778', '20:10', { id: '112', name: 'Chicago Cubs', abbr: 'CHC' }, { id: '138', name: 'St. Louis Cardinals', abbr: 'STL' }],
  ['824779', '22:10', { id: '119', name: 'Los Angeles Dodgers', abbr: 'LAD' }, { id: '135', name: 'San Diego Padres', abbr: 'SD' }],
  ['824780', '16:05', { id: '147', name: 'New York Yankees', abbr: 'NYY' }, { id: '110', name: 'Baltimore Orioles', abbr: 'BAL' }],
  ['824781', '21:40', { id: '136', name: 'Seattle Mariners', abbr: 'SEA' }, { id: '117', name: 'Houston Astros', abbr: 'HOU' }],
];

function todayEt() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

const BATTERS = ['Acuña', 'Olson', 'Riley', 'Albies', 'Ozuna', 'Harris', 'Murphy', 'Arcia', 'Kelenic'];
const OTHER = ['Lindor', 'Soto', 'Alonso', 'Nimmo', 'Vientos', 'Marte', 'Alvarez', 'Taylor', 'Siri'];

export function mockSlate(sport, { date, season, week, division } = {}) {
  if (sport === 'mlb') return mlbSlate(date || todayEt());
  return footballSlate(sport, { season, week, division });
}

function mlbSlate(date) {
  const r = rng(Number(date.replace(/-/g, '')));
  const games = MLB_GAMES.map(([id, hhmm, home, away], i) => {
    const start = new Date(`${date}T${hhmm}:00-04:00`);
    const base = 0.4 + r() * 0.24;
    const iso = (mins) => new Date(start.getTime() + mins * 60000).toISOString();
    const status = i === 4 ? 'final' : i === 5 ? 'live' : 'scheduled';
    const hr = 4.1 + r() * 1.4; const ar = 3.9 + r() * 1.3;
    const simP = Math.min(0.75, Math.max(0.3, base + (r() - 0.5) * 0.06));
    const overs = {};
    for (let line = 6.5; line <= 11.5; line += 1) {
      const z = (line - (hr + ar)) / 3.1;
      overs[line.toFixed(1)] = Math.round((1 / (1 + Math.exp(1.7 * z))) * 1000) / 1000;
    }
    const predictions = {
      v10: i === 2 ? null : {
        home_win_prob: Math.round((base + (r() - 0.5) * (i === 3 ? 0.36 : 0.08)) * 1000) / 1000,
        predicted_at: iso(-95), pregame: true,
        home_score: null, away_score: null, total: null, margin: null, dist: null,
      },
      logit3: {
        home_win_prob: Math.round((base + (r() - 0.5) * 0.05) * 1000) / 1000,
        predicted_at: iso(i === 5 ? 12 : -300), pregame: i !== 5,
        home_score: null, away_score: null, total: null, margin: null, dist: null,
      },
      sim_blend: i === 1 ? null : {
        home_win_prob: Math.round(simP * 1000) / 1000,
        predicted_at: iso(-80), pregame: true,
        home_score: countDist(hr, 2.9),
        away_score: countDist(ar, 2.8),
        total: countDist(hr + ar, 4.1),
        margin: countDist(hr - ar, 4.2, 3000, { floor: -99 }),
        dist: null,
        extras: {
          p_extra_innings: Math.round((0.07 + r() * 0.04) * 1000) / 1000,
          p_home_cover_rl: Math.round((simP - 0.17) * 1000) / 1000,
          p_over_by_line: overs,
        },
        has_players: true,
      },
      elo: {
        home_win_prob: Math.round(Math.min(0.72, base + 0.05) * 1000) / 1000,
        predicted_at: iso(-600), pregame: true,
        home_score: null, away_score: null, total: null, margin: null, dist: null,
      },
      market: null,
    };
    const consensus = spreadOf(predictions);
    return {
      game_id: id,
      start_time: start.toISOString(),
      status,
      home, away,
      result: status === 'final' ? { home_score: 5, away_score: 3 }
        : status === 'live' ? { home_score: 1, away_score: 2 } : { home_score: null, away_score: null },
      predictions,
      consensus,
      disagreement: disagreement(consensus.spread),
    };
  });
  return {
    sport: 'mlb', date, season: Number(date.slice(0, 4)), week: null,
    models: MLB_MODELS, featured_default: 'v10', games,
  };
}

export function mockPlayers(sport, { date, gameId } = {}) {
  if (sport !== 'mlb') {
    return { available: false, note: 'Player projections are MLB-only for now.', rows: [] };
  }
  const slate = mlbSlate(date || todayEt());
  const rows = [];
  slate.games
    .filter((g) => g.predictions.sim_blend && (!gameId || String(g.game_id) === String(gameId)))
    .forEach((g, gi) => {
      const r = rng(Number(g.game_id));
      const at = g.predictions.sim_blend.predicted_at;
      [[g.home, BATTERS], [g.away, OTHER]].forEach(([team, names], ti) => {
        names.forEach((name, i) => {
          const pid = `${g.game_id}${ti}${i}`;
          const pa = 4.6 - i * 0.12;
          const stats = {
            PA: [pa, 0.7, null], H: [0.9 + r() * 0.4, 0.9, 0.62 - i * 0.02], HR: [0.12 + r() * 0.1, 0.35, 0.13],
            TB: [1.5 + r() * 0.6, 1.4, 0.64], BB: [0.35 + r() * 0.2, 0.6, 0.3], K: [0.9 + r() * 0.4, 0.9, 0.6],
          };
          Object.entries(stats).forEach(([stat, [m, sd, p1]]) => {
            rows.push({
              game_id: g.game_id, player_id: pid, player_name: `${name}${gi ? ` ${gi}` : ''}`,
              team_abbr: team.abbr, role: 'batter', batting_order: i + 1, stat,
              ...countDist(m, sd), p_at_least_1: p1,
              calibrated: stat === 'PA',
              calibration_note: stat === 'PA'
                ? 'Plate appearances: scored against 2025 box scores, within 1%.'
                : 'Over-predicts P(at least one): the sim plays every starter the full game (64.5% vs 60.8% for hits).',
              predicted_at: at, pregame: true,
            });
          });
        });
        const sp = { K: [5.4 + r(), 2.1], BF: [23 + r() * 2, 3.2], IP_outs: [16 + r() * 2, 3.5], ER: [2.4 + r(), 1.7], H_allowed: [5.1, 2.1], BB_allowed: [1.7, 1.2] };
        Object.entries(sp).forEach(([stat, [m, sd]]) => {
          rows.push({
            game_id: g.game_id, player_id: `${g.game_id}${ti}sp`, player_name: `${team.abbr} starter`,
            team_abbr: team.abbr, role: 'starter', batting_order: null, stat,
            ...countDist(m, sd), p_at_least_1: null,
            calibrated: stat === 'K',
            calibration_note: stat === 'K'
              ? 'Starter strikeouts: CRPS beats a Poisson baseline on 4,800 starts.'
              : 'Not yet scored against outcomes.',
            predicted_at: at, pregame: true,
          });
        });
      });
    });
  return { available: true, rows };
}

/* ── Football ────────────────────────────────────────────────────────── */

const NFL_MODELS = [
  { key: 'market', label: 'Market', role: 'benchmark', available: true, outputs: ['win_prob', 'margin', 'total'], learn: '/learn/football-model-compare.html' },
  { key: 'ridge', label: 'Ridge', role: 'shadow', available: true, outputs: ['win_prob', 'margin'], learn: '/learn/football-models.html' },
  { key: 'xgb', label: 'XGBoost', role: 'production', available: true, outputs: ['win_prob'], learn: '/learn/football-models.html' },
  { key: 'fpi', label: 'FPI', role: 'reference', available: true, outputs: ['win_prob', 'margin'], learn: '/learn/football-model-compare.html' },
  { key: 'drive_sim', label: 'Drive sim', role: 'shadow', available: true, outputs: ['win_prob', 'score', 'total', 'margin', 'dist'], learn: '/learn/football-drive-sim.html' },
];
const CFB_MODELS = NFL_MODELS.filter((m) => m.key !== 'drive_sim')
  .map((m) => (m.key === 'xgb' ? { ...m, role: 'production' } : m));

const NFL_TEAMS = [
  [{ id: 'KC', name: 'Kansas City Chiefs', abbr: 'KC' }, { id: 'BUF', name: 'Buffalo Bills', abbr: 'BUF' }],
  [{ id: 'PHI', name: 'Philadelphia Eagles', abbr: 'PHI' }, { id: 'DAL', name: 'Dallas Cowboys', abbr: 'DAL' }],
  [{ id: 'DET', name: 'Detroit Lions', abbr: 'DET' }, { id: 'GB', name: 'Green Bay Packers', abbr: 'GB' }],
  [{ id: 'SF', name: 'San Francisco 49ers', abbr: 'SF' }, { id: 'LAR', name: 'Los Angeles Rams', abbr: 'LAR' }],
];
const CFB_TEAMS = [
  [{ id: '333', name: 'Alabama', abbr: 'ALA' }, { id: '61', name: 'Georgia', abbr: 'UGA' }],
  [{ id: '194', name: 'Ohio State', abbr: 'OSU' }, { id: '130', name: 'Michigan', abbr: 'MICH' }],
  [{ id: '251', name: 'Texas', abbr: 'TEX' }, { id: '201', name: 'Oklahoma', abbr: 'OU' }],
];

function marginExact(mean) {
  // Same shape the drive simulator stores: -60..60 plus the "<=-61" / ">=61" tails, summing to 1.
  const raw = {};
  let total = 0;
  const w = (k) => {
    let p = Math.exp(-((k - mean) ** 2) / (2 * 13 * 13));
    if (Math.abs(k) === 3) p *= 2.6;
    if (Math.abs(k) === 7) p *= 1.9;
    if (k === 0) p *= 0.05;
    return p;
  };
  let lo = 0; let hi = 0;
  for (let k = -100; k <= 100; k += 1) {
    const p = w(k); total += p;
    if (k <= -61) lo += p; else if (k >= 61) hi += p; else raw[String(k)] = p;
  }
  const out = { '<=-61': Math.round((lo / total) * 1e6) / 1e6 };
  Object.keys(raw).forEach((k) => { out[k] = Math.round((raw[k] / total) * 1e6) / 1e6; });
  out['>=61'] = Math.round((hi / total) * 1e6) / 1e6;
  return out;
}

function footballSlate(sport, { season, week, division }) {
  const nfl = sport === 'nfl';
  const s = Number(season) || 2026;
  const w = Number(week) || 4;
  const r = rng(s * 100 + w + (division === 'fcs' ? 7 : 0));
  const teams = nfl ? NFL_TEAMS : CFB_TEAMS;
  const kick = new Date(Date.now() + 2 * 86400000);
  kick.setUTCHours(17, 0, 0, 0);
  const games = teams.map(([home, away], i) => {
    const start = new Date(kick.getTime() + i * 3.5 * 3600000);
    const spread = Math.round((r() * 14 - 5) * 2) / 2;
    const p = (m, sd) => Math.round((1 / (1 + Math.exp(-m / (sd * 0.58)))) * 1000) / 1000;
    const total = Math.round((41 + r() * 12) * 2) / 2;
    const at = new Date(start.getTime() - 26 * 3600000).toISOString();
    const hs = (total + spread) / 2; const as = (total - spread) / 2;
    const overs = {};
    for (let line = total - 7; line <= total + 7; line += 1) {
      overs[line.toFixed(1)] = Math.round((1 / (1 + Math.exp((line - total) / 5.8))) * 1000) / 1000;
    }
    const predictions = {
      market: { home_win_prob: p(spread, 13.45), predicted_at: at, pregame: true, home_score: null, away_score: null, total: meanOnly(total), margin: meanOnly(spread), dist: null },
      ridge: { home_win_prob: p(spread + (r() - 0.5) * 4, 12.5), predicted_at: at, pregame: true, home_score: null, away_score: null, total: null, margin: meanOnly(Math.round((spread + (r() - 0.5) * 4) * 10) / 10), dist: null },
      xgb: i === 2 ? null : { home_win_prob: p(spread + (r() - 0.5) * 10, 12), predicted_at: at, pregame: true, home_score: null, away_score: null, total: null, margin: null, dist: null },
      fpi: { home_win_prob: p(spread + (r() - 0.5) * 3, 13), predicted_at: at, pregame: true, home_score: null, away_score: null, total: null, margin: meanOnly(Math.round((spread + (r() - 0.5) * 3) * 10) / 10), dist: null },
    };
    if (nfl) {
      predictions.drive_sim = {
        home_win_prob: p(spread + (r() - 0.5) * 2, 13.2), predicted_at: at, pregame: true,
        home_score: countDist(hs, 9.6), away_score: countDist(as, 9.4),
        total: countDist(total, 13.5), margin: countDist(spread, 13.4, 3000, { floor: -99 }), dist: null,
        extras: {
          p_ot: 0.054, p_home_cover: Math.round((0.47 + r() * 0.06) * 1000) / 1000,
          spread_line: -spread, p_over_by_line: overs, margin_exact: marginExact(spread),
        },
        has_players: false,
      };
    }
    const consensus = spreadOf(predictions);
    return {
      game_id: `${nfl ? '4017' : '4016'}${s}${w}${i}`,
      start_time: start.toISOString(), status: 'scheduled', home, away,
      result: { home_score: null, away_score: null },
      predictions, consensus, disagreement: disagreement(consensus.spread),
    };
  });
  return {
    sport, date: null, season: s, week: w, division: nfl ? null : (division || 'fbs'),
    models: nfl ? NFL_MODELS : CFB_MODELS, featured_default: nfl ? 'xgb' : 'xgb', games,
  };
}
