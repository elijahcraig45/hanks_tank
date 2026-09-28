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
