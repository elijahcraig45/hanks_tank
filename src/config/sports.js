/**
 * The site's information architecture in one place.
 *
 * The sport is the primary axis: MLB, NFL and college football each get the same
 * section order (Predictions · Scores · Rankings · Stats · Models · extras), so moving
 * between sports never means relearning the navigation. Paths are built here rather
 * than as string literals in components, so a URL change is one edit.
 */

export const SPORTS = [
  { key: 'mlb', label: 'MLB', name: 'Baseball', icon: '⚾', home: '/mlb' },
  { key: 'nfl', label: 'NFL', name: 'Pro football', icon: '🏈', home: '/nfl' },
  { key: 'cfb', label: 'CFB', name: 'College football', icon: '🏟️', home: '/cfb' },
];

export const SPORT_BY_KEY = Object.fromEntries(SPORTS.map((s) => [s.key, s]));

/* ── Football ────────────────────────────────────────────────────────── */

/** League keys used by FootballPage (nfl | fbs | fcs), mapped to the sport they sit in. */
export const FOOTBALL_LEAGUES = [
  { key: 'nfl', sport: 'nfl', label: 'NFL' },
  { key: 'fbs', sport: 'cfb', label: 'FBS' },
  { key: 'fcs', sport: 'cfb', label: 'FCS' },
];
export const CFB_DIVISIONS = ['fbs', 'fcs'];

export function footballSportOf(leagueKey) {
  return leagueKey === 'nfl' ? 'nfl' : 'cfb';
}

/** `/nfl/<section>` or `/cfb/<fbs|fcs>/<section>`. */
export function footballPath(leagueKey, section) {
  const base = leagueKey === 'nfl' ? '/nfl' : `/cfb/${CFB_DIVISIONS.includes(leagueKey) ? leagueKey : 'fbs'}`;
  return section ? `${base}/${section}` : base;
}

export function footballGamePath(leagueKey, gameId) {
  return `${footballPath(leagueKey)}/game/${gameId}`;
}

/**
 * Which top-level section each FootballPage section belongs to. FootballPage's own
 * SECTIONS list stays the source of truth for what exists; this only says where it sits,
 * so a section added there (e.g. `models`, the model comparison) lands in the right group
 * without a nav change. Anything unlisted becomes its own top-level entry.
 */
export const FOOTBALL_SECTION_GROUP = {
  picks: 'predictions',
  scoreboard: 'scores',
  rankings: 'rankings',
  stats: 'stats',
  leaders: 'stats',
  players: 'stats',
  diagnostics: 'models',
  models: 'models',
};

const GROUPS = {
  predictions: 'Predictions',
  scores: 'Scores',
  rankings: 'Rankings',
  stats: 'Stats',
  models: 'Models',
};
const GROUP_ORDER = ['predictions', 'scores', 'rankings', 'stats', 'models'];

/** Shorter labels for the section pills, where the page's own label is long. */
const FOOTBALL_CHILD_LABEL = {
  picks: 'Model picks',
  scoreboard: 'Scores & schedule',
  rankings: 'Power rankings',
  stats: 'Team stats',
  diagnostics: 'Diagnostics',
};

/**
 * Nav tree for one football league, from FootballPage's SECTIONS.
 * @param {string} leagueKey nfl | fbs | fcs
 * @param {Array<{key,label,availableFor?}>} sections
 */
export function footballNav(leagueKey, sections = []) {
  const league = { key: leagueKey, sport: footballSportOf(leagueKey) };
  const available = sections.filter((s) => !s.availableFor || s.availableFor(league));
  const groups = new Map();
  available.forEach((s) => {
    const g = FOOTBALL_SECTION_GROUP[s.key] || s.key;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({
      key: s.key,
      label: FOOTBALL_CHILD_LABEL[s.key] || s.label,
      to: footballPath(leagueKey, s.key),
    });
  });
  const order = [...GROUP_ORDER, ...[...groups.keys()].filter((g) => !GROUP_ORDER.includes(g))];
  const nav = order.filter((g) => groups.has(g)).map((g) => {
    const children = groups.get(g);
    return {
      key: g,
      label: GROUPS[g] || children[0].label,
      to: children[0].to,
      children: children.length > 1 ? children : null,
    };
  });
  nav.push({
    key: 'pickem',
    label: 'Pick’em',
    to: `/pickem/${league.sport}`,
    match: [`/pickem/${league.sport}`],
  });
  return nav;
}

/* ── MLB ─────────────────────────────────────────────────────────────── */

export const MLB = {
  home: '/mlb',
  predictions: '/mlb/predictions',
  games: '/mlb/games',
  game: (gamePk) => `/mlb/game/${gamePk}`,
  rankings: '/mlb/rankings',
  teamBatting: '/mlb/stats/team-batting',
  teamPitching: '/mlb/stats/team-pitching',
  playerBatting: '/mlb/stats/player-batting',
  playerPitching: '/mlb/stats/player-pitching',
  transactions: '/mlb/transactions',
  teamTransactions: (abbr) => `/mlb/transactions/${abbr}`,
  team: (abbr) => `/mlb/team/${abbr}`,
  player: (id) => `/mlb/player/${id}`,
  diagnostics: '/mlb/models',
  scenarioSimulator: '/mlb/models/scenario-simulator',
  splitExplorer: '/mlb/lab/split-explorer',
  statcastLab: '/mlb/lab/statcast-lab',
  advancedAnalysis: '/mlb/lab/advanced-analysis',
  comparisonWorkbench: '/mlb/lab/comparison-workbench',
  teamComparison: '/mlb/lab/team-comparison',
  playerComparison: '/mlb/lab/player-comparison',
  seasonComparison: '/mlb/lab/season-comparison',
  researchWorkflow: '/mlb/lab/research-workflow',
  assistedAnalysis: '/mlb/lab/assisted-analysis',
};

export const MLB_NAV = [
  { key: 'predictions', label: 'Predictions', to: MLB.predictions },
  { key: 'scores', label: 'Scores', to: MLB.games, match: ['/mlb/game/'] },
  { key: 'rankings', label: 'Rankings', to: MLB.rankings },
  {
    key: 'stats',
    label: 'Stats',
    to: MLB.teamBatting,
    match: ['/mlb/stats', '/mlb/team/', '/mlb/player/', '/mlb/transactions'],
    children: [
      { key: 'team-batting', label: 'Team batting', to: MLB.teamBatting },
      { key: 'team-pitching', label: 'Team pitching', to: MLB.teamPitching },
      { key: 'player-batting', label: 'Player batting', to: MLB.playerBatting },
      { key: 'player-pitching', label: 'Player pitching', to: MLB.playerPitching },
      { key: 'transactions', label: 'Transactions', to: MLB.transactions },
    ],
  },
  {
    key: 'models',
    label: 'Models',
    to: MLB.diagnostics,
    children: [
      { key: 'diagnostics', label: 'Diagnostics', to: MLB.diagnostics, exact: true },
      { key: 'scenario-simulator', label: 'Scenario simulator', to: MLB.scenarioSimulator },
    ],
  },
  {
    key: 'lab',
    label: 'Lab',
    to: MLB.splitExplorer,
    children: [
      { key: 'split-explorer', label: 'Split explorer', to: MLB.splitExplorer },
      { key: 'statcast-lab', label: 'Statcast lab', to: MLB.statcastLab },
      { key: 'comparison-workbench', label: 'Comparison workbench', to: MLB.comparisonWorkbench },
      { key: 'team-comparison', label: 'Team comparison', to: MLB.teamComparison },
      { key: 'player-comparison', label: 'Player comparison', to: MLB.playerComparison },
      { key: 'season-comparison', label: 'Season comparison', to: MLB.seasonComparison },
      { key: 'advanced-analysis', label: 'Advanced analysis', to: MLB.advancedAnalysis },
      { key: 'research-workflow', label: 'Research workflow', to: MLB.researchWorkflow },
    ],
  },
];

/* ── Legacy paths ────────────────────────────────────────────────────── */

/** Pre-redesign MLB paths. Each redirects, keeping its query string. */
export const LEGACY_MLB_REDIRECTS = [
  ['/games', MLB.games],
  ['/predictions', MLB.predictions],
  ['/rankings', MLB.rankings],
  ['/prediction-diagnostics', MLB.diagnostics],
  ['/scenario-simulator', MLB.scenarioSimulator],
  ['/TeamBatting', MLB.teamBatting],
  ['/TeamPitching', MLB.teamPitching],
  ['/PlayerBatting', MLB.playerBatting],
  ['/PlayerPitching', MLB.playerPitching],
  ['/transactions', MLB.transactions],
  ['/split-explorer', MLB.splitExplorer],
  ['/statcast-lab', MLB.statcastLab],
  ['/comparison-workbench', MLB.comparisonWorkbench],
  ['/team-comparison', MLB.teamComparison],
  ['/player-comparison', MLB.playerComparison],
  ['/season-comparison', MLB.seasonComparison],
  ['/advanced-analysis', MLB.advancedAnalysis],
  ['/research-workflow', MLB.researchWorkflow],
  ['/AssistedAnalysis', MLB.assistedAnalysis],
];

/** Parameterised legacy paths: [from pattern, builder(params)]. */
export const LEGACY_PARAM_REDIRECTS = [
  ['/game/:gamePk', (p) => MLB.game(p.gamePk)],
  ['/team/:teamAbbr', (p) => MLB.team(p.teamAbbr)],
  ['/player/:playerId', (p) => MLB.player(p.playerId)],
  ['/transactions/:teamAbbr', (p) => MLB.teamTransactions(p.teamAbbr)],
  ['/football', () => '/nfl'],
  ['/football/:league', (p) => footballPath(p.league)],
  ['/football/:league/:section', (p) => footballPath(p.league, p.section)],
  ['/football/:league/game/:gameId', (p) => footballGamePath(p.league, p.gameId)],
  ['/nfl/predictions', () => footballPath('nfl', 'picks')],
];

/* ── Where am I ──────────────────────────────────────────────────────── */

/**
 * The sport a path belongs to, and the football league when there is one.
 * Pick'em pages belong to their sport, so the NFL bar stays up on the NFL contest.
 */
export function sportContext(pathname = '/') {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] === 'mlb') return { sport: 'mlb', league: null };
  if (seg[0] === 'nfl') return { sport: 'nfl', league: 'nfl' };
  if (seg[0] === 'cfb') {
    return { sport: 'cfb', league: CFB_DIVISIONS.includes(seg[1]) ? seg[1] : 'fbs' };
  }
  if (seg[0] === 'pickem') {
    const s = seg[1] === 'nfl' ? 'nfl' : 'cfb';
    return { sport: s, league: s === 'nfl' ? 'nfl' : 'fbs', pickem: true };
  }
  return { sport: 'all', league: null };
}
