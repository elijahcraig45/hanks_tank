/**
 * Pure helpers for the Season projections section (football rest-of-season Monte Carlo).
 *
 * Field names follow the season-sim contract exactly (season_sim_team /
 * season_sim_bracket). The JSON-array columns (wins_dist, p_seed) arrive as strings
 * from BigQuery; fixtures may carry real arrays, so both are accepted.
 */

export const METHOD_URL = '/learn/season-sim.html';

/** JSON-array column -> array of finite numbers (or []). */
export function parseDist(v) {
  let arr = v;
  if (typeof v === 'string') {
    try { arr = JSON.parse(v); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => (Number.isFinite(Number(x)) ? Number(x) : 0));
}

const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

/**
 * A share of simulations, never rounded to a certainty it does not have: anything
 * strictly between 0 and 1% reads "<1%", strictly between 99% and 100% reads ">99%".
 */
export function fmtPct(v) {
  if (!isNum(v)) return '—';
  const p = Number(v);
  if (p <= 0) return '0%';
  if (p >= 1) return '100%';
  if (p < 0.01) return '<1%';
  if (p > 0.99) return '>99%';
  return `${Math.round(p * 100)}%`;
}

export function fmtNum(v, digits = 1) {
  if (!isNum(v)) return '—';
  return Number(v).toFixed(digits);
}

export function fmtSigned(v, digits = 1) {
  if (!isNum(v)) return '—';
  const n = Number(v);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}`;
}

export function fmtRecord(w, l, t) {
  if (!isNum(w) || !isNum(l)) return '—';
  return Number(t) > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
}

export function fmtMeanRecord(team) {
  if (!isNum(team.mean_wins)) return '—';
  const w = Number(team.mean_wins).toFixed(1);
  return isNum(team.mean_losses) ? `${w}-${Number(team.mean_losses).toFixed(1)}` : w;
}

export function fmtComputedAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

/** Standings group: NFL division ('AFC West'); CFB conference, split by division if any. */
export function groupOf(team, sport) {
  if (sport === 'nfl') return team.division || team.conference || 'Other';
  const conf = team.conference || 'Other';
  return team.division ? `${conf} · ${team.division}` : conf;
}

/* ── per-sport configuration ─────────────────────────────────────────── */

export const TABLE_COLUMNS = {
  nfl: [
    { key: 'p_division', label: 'Div', title: 'Win the division' },
    { key: 'p_playoffs', label: 'Playoffs', title: 'Make the 14-team playoffs' },
    { key: 'p_bye', label: '#1 seed', title: 'Earn the #1 seed and the only bye' },
    { key: 'p_conf_title', label: 'Conf', title: 'Win the AFC/NFC (reach the Super Bowl)' },
    { key: 'p_champion', label: 'Title', title: 'Win the Super Bowl' },
  ],
  cfb: [
    { key: 'p_conf_title', label: 'Conf', title: 'Win the conference title' },
    { key: 'p_playoffs', label: 'CFP', title: 'Make the 12-team College Football Playoff' },
    { key: 'p_bye', label: 'Bye', title: 'Earn a top-4 seed (first-round bye)' },
    { key: 'p_semis', label: 'Semis', title: 'Reach a CFP semifinal' },
    { key: 'p_champion', label: 'Title', title: 'Win the national title' },
  ],
};

/** Round-by-round odds for the drill-down, in playing order. */
export const ROUND_ODDS = {
  nfl: [
    { key: 'p_division', label: 'Win division' },
    { key: 'p_playoffs', label: 'Make playoffs' },
    { key: 'p_bye', label: '#1 seed (bye)' },
    { key: 'p_quarters', label: 'Reach divisional round' },
    { key: 'p_conf_game', label: 'Reach conference championship' },
    { key: 'p_final', label: 'Reach Super Bowl' },
    { key: 'p_champion', label: 'Win Super Bowl' },
  ],
  cfb: [
    { key: 'p_conf_game', label: 'Reach conference title game' },
    { key: 'p_conf_title', label: 'Win conference' },
    { key: 'p_playoffs', label: 'Make the CFP' },
    { key: 'p_bye', label: 'Top-4 seed (bye)' },
    { key: 'p_quarters', label: 'Reach quarterfinal' },
    { key: 'p_semis', label: 'Reach semifinal' },
    { key: 'p_final', label: 'Reach title game' },
    { key: 'p_champion', label: 'Win national title' },
  ],
};

export const ROUND_LABEL = {
  seed: 'Seeds',
  wild_card: 'Wild card',
  divisional: 'Divisional',
  conference: 'Conference',
  super_bowl: 'Super Bowl',
  first_round: 'First round',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  final: 'National title',
};

export const BRACKET_ORDER = ['AFC', 'NFC', 'NFL', 'CFP'];
export const BRACKET_LABEL = { AFC: 'AFC', NFC: 'NFC', NFL: 'Super Bowl', CFP: 'College Football Playoff' };

/* ── bracket shaping ─────────────────────────────────────────────────── */

/**
 * Rows -> [{ bracket, rounds: [{ round, order, slots: [{ slot, label, modal, others }] }] }].
 * `modal` is the most-likely-bracket occupant(s) (1 for a seed, 2 for a game);
 * `others` the remaining candidates by p_slot. A slot with no is_modal row falls back to
 * its most likely team(s), so a partial write still draws.
 */
export function shapeBracket(rows = []) {
  const byBracket = new Map();
  rows.forEach((r) => {
    if (!byBracket.has(r.bracket)) byBracket.set(r.bracket, new Map());
    const rounds = byBracket.get(r.bracket);
    const rk = `${r.round_order}|${r.round}`;
    if (!rounds.has(rk)) rounds.set(rk, { round: r.round, order: Number(r.round_order), slots: new Map() });
    const slots = rounds.get(rk).slots;
    if (!slots.has(r.slot)) slots.set(r.slot, []);
    slots.get(r.slot).push(r);
  });
  const orderOf = (b) => {
    const i = BRACKET_ORDER.indexOf(b);
    return i < 0 ? BRACKET_ORDER.length : i;
  };
  return [...byBracket.entries()]
    .sort(([a], [b]) => orderOf(a) - orderOf(b) || String(a).localeCompare(String(b)))
    .map(([bracket, rounds]) => ({
      bracket,
      rounds: [...rounds.values()]
        .sort((a, b) => a.order - b.order)
        .map((rd) => ({
          round: rd.round,
          order: rd.order,
          slots: [...rd.slots.entries()]
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([slot, list]) => {
              const sorted = [...list].sort((a, b) => Number(b.p_slot) - Number(a.p_slot));
              const want = rd.round === 'seed' ? 1 : 2;
              let modal = sorted.filter((r) => r.is_modal === true || r.is_modal === 'true');
              if (!modal.length) modal = sorted.slice(0, want);
              const others = sorted.filter((r) => !modal.includes(r));
              return {
                slot: Number(slot),
                label: (modal[0] || sorted[0])?.slot_label || `#${slot}`,
                modal,
                others,
              };
            }),
        })),
    }));
}

/* ── sorting ─────────────────────────────────────────────────────────── */

export function compareBy(key, dir) {
  const sign = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === 'team_name') {
      return sign * String(va || a.team).localeCompare(String(vb || b.team));
    }
    if (key === 'record') {
      va = Number(a.wins) - Number(a.losses);
      vb = Number(b.wins) - Number(b.losses);
    }
    const na = isNum(va) ? Number(va) : null;
    const nb = isNum(vb) ? Number(vb) : null;
    if (na === null && nb === null) return 0;
    if (na === null) return 1; // missing values sink either way
    if (nb === null) return -1;
    return sign * (na - nb) || String(a.team).localeCompare(String(b.team));
  };
}

/* ── remaining schedule ──────────────────────────────────────────────── */

/**
 * P(win) -> the schedule label. Likely W at .65 and up, Lean W .55-.65, Toss-up between
 * .45 and .55, then Lean L and Likely L mirrored. The backend sends the same label; this
 * is the fallback when it does not.
 */
export const WIN_LABELS = [
  { min: 0.65, label: 'Likely W', tone: 'w2' },
  { min: 0.55, label: 'Lean W', tone: 'w1' },
  { min: 0.45, label: 'Toss-up', tone: 'even', open: true },
  { min: 0.35, label: 'Lean L', tone: 'l1', open: true },
  { min: -Infinity, label: 'Likely L', tone: 'l2' },
];

export function winLabel(p) {
  if (!isNum(p)) return null;
  const x = Number(p);
  return WIN_LABELS.find((b) => (b.open ? x > b.min : x >= b.min)) || null;
}

/** 'YYYY-MM-DD' -> 'Sat, Oct 10' without a timezone shift (the date is already local). */
export function fmtGameDate(d) {
  if (!d || typeof d !== 'string') return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** 'vs' at home or on a neutral field, 'at' away. */
export const sitePrefix = (g) => (g.site === 'away' ? 'at' : 'vs');

/** A game from the team's side, whether or not the backend already derived it. */
export function teamGame(g, team) {
  if (g.p_win != null && g.site) return g;
  const home = g.home === team;
  const pHome = isNum(g.p_home_win) ? Number(g.p_home_win) : null;
  const m = isNum(g.margin_mean) ? Number(g.margin_mean) : null;
  return {
    ...g,
    opponent: home ? g.away : g.home,
    opponent_name: home ? g.away_name : g.home_name,
    site: g.neutral === true ? 'neutral' : home ? 'home' : 'away',
    p_win: pHome == null ? null : home ? pHome : 1 - pHome,
    margin: m == null ? null : home ? m : -m,
  };
}

/** JSON-array-of-ids column (or a real array) -> array of strings, or null. */
export function parseIdList(v) {
  let arr = v;
  if (typeof v === 'string') {
    try { arr = JSON.parse(v); } catch { return null; }
  }
  return Array.isArray(arr) ? arr.map(String) : null;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const oppShort = (g) => g.opponent_name || g.opponent;

/**
 * The drill-down's summary, built only from the numbers:
 *   "Projected 4.1–7.9: the 3 likeliest remaining wins are vs X (81%), vs Y (49%) and
 *    vs Z (43%). Most common exact finish: 4-8 (25% of simulations)."
 * plus the honest caveat that expected wins are not a claim about which games.
 * Returns { lead, caveat } strings, or null when nothing is left to play.
 */
export function scheduleCallout(team, games) {
  if (!games?.length) return null;
  const mean = isNum(team.rem_wins_mean)
    ? Number(team.rem_wins_mean)
    : games.reduce((a, g) => a + (Number(g.p_win) || 0), 0);
  const k = Math.floor(mean + 0.5);
  const ranked = [...games].sort((a, b) => Number(b.p_win) - Number(a.p_win));
  const ids = parseIdList(team.projected_wins_games);
  const byId = new Map(games.map((g) => [String(g.game_id), g]));
  const top = (ids && ids.length === k && ids.every((i) => byId.has(String(i))))
    ? ids.map((i) => byId.get(String(i)))
    : ranked.slice(0, k);
  const list = top.map((g) => `${sitePrefix(g)} ${oppShort(g)} (${fmtPct(g.p_win)})`);
  const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
  const proj = `Projected ${fmtMeanRecord(team)}`;
  let lead;
  if (k === 0) {
    const best = ranked[0];
    lead = `${proj}: the expected ${fmtNum(mean)} remaining wins round to none; the likeliest is ${sitePrefix(best)} ${oppShort(best)} (${fmtPct(best.p_win)}).`;
  } else {
    lead = `${proj}: the ${k === 1 ? 'likeliest remaining win is' : `${k} likeliest remaining wins are`} ${joined}.`;
  }
  const dist = parseDist(team.rem_wins_dist);
  if (dist.length) {
    const mode = dist.indexOf(Math.max(...dist));
    const w = Number(team.wins) + mode;
    const l = Number(team.losses) + (games.length - mode);
    lead += ` Most common exact finish: ${fmtRecord(w, l, team.ties)} (${fmtPct(dist[mode])} of simulations).`;
  }
  const favoured = top.filter((g) => Number(g.p_win) > 0.5).length;
  const parts = [`That is not a forecast of those exact games: ${fmtNum(mean)} wins from ${plural(games.length, 'game', 'games')} can come from any mix of them`];
  if (k > 0 && favoured < k) {
    parts.push(favoured === 0
      ? `and none of these ${k === 1 ? 'is' : 'are'} better than a coin flip`
      : `and only ${favoured} of the ${k} ${favoured === 1 ? 'is' : 'are'} better than a coin flip`);
  }
  let caveat = `${parts.join(', ')}.`;
  if (team.modal_sequence && isNum(team.modal_sequence_freq)) {
    caveat += ` The single most common win-loss sequence (${team.modal_sequence.split('').join('\u2011')}) came up in only ${fmtPct(team.modal_sequence_freq)} of simulations.`;
  }
  return { lead, caveat };
}
