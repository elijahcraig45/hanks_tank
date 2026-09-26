import {
  buildExportUrl, disagreementOf, distMean, filterPlayers, filterSortGames, fmtRange,
  modelRowsFor, pivotPlayers, sortPlayers, statCalibration,
} from './unifiedPredictions';

describe('buildExportUrl', () => {
  test('builds the slate CSV URL with the page query', () => {
    expect(buildExportUrl('https://hankstank.com/api', 'mlb', 'slate', { date: '2026-09-26' }, 'csv'))
      .toBe('https://hankstank.com/api/predictions/mlb/slate?date=2026-09-26&format=csv');
  });
  test('drops empty params and trailing slashes, keeps football week and division', () => {
    expect(buildExportUrl('http://localhost:3110/api/', 'cfb', 'slate',
      { season: 2026, week: 5, division: 'fcs', date: null, extra: '' }, 'json'))
      .toBe('http://localhost:3110/api/predictions/cfb/slate?season=2026&week=5&division=fcs&format=json');
  });
  test('builds the players export with a game id', () => {
    expect(buildExportUrl('/api', 'mlb', 'players', { game_id: '824776' }, 'csv'))
      .toBe('/api/predictions/mlb/players?game_id=824776&format=csv');
  });
});

describe('model rows', () => {
  const models = [
    { key: 'v10', label: 'V10', available: true },
    { key: 'sim_blend', label: 'Sim', available: true },
    { key: 'market', label: 'Market', available: false },
  ];
  const game = { predictions: { v10: { home_win_prob: 0.56 }, sim_blend: null, market: null } };
  test('keeps every model and says why a row is empty', () => {
    const rows = modelRowsFor(game, models);
    expect(rows.map((r) => [r.key, r.state])).toEqual([
      ['v10', 'ok'], ['sim_blend', 'none'], ['market', 'unavailable'],
    ]);
  });
  test('a model missing from predictions entirely is "none", not dropped', () => {
    expect(modelRowsFor({ predictions: {} }, models.slice(0, 1))[0].state).toBe('none');
  });
  test('the model filter narrows the rows but keeps order', () => {
    expect(modelRowsFor(game, models, ['market', 'v10']).map((r) => r.key)).toEqual(['v10', 'market']);
  });
});

test('distMean reads a Dist, a number or nothing', () => {
  expect(distMean({ mean: 4.6 })).toBe(4.6);
  expect(distMean(3)).toBe(3);
  expect(distMean(null)).toBeNull();
  expect(distMean({ mean: null })).toBeNull();
  expect(fmtRange({ p05: 1, p95: 10 })).toBe('1–10');
});

test('disagreement falls back to the contract thresholds', () => {
  expect(disagreementOf({ consensus: { spread: 0.079 } })).toBe('low');
  expect(disagreementOf({ consensus: { spread: 0.08 } })).toBe('medium');
  expect(disagreementOf({ consensus: { spread: 0.15 } })).toBe('high');
  expect(disagreementOf({ disagreement: 'low', consensus: { spread: 0.5 } })).toBe('low');
});

describe('filterSortGames', () => {
  const g = (id, t, spread, p, dis) => ({
    game_id: id, start_time: t, consensus: { spread }, disagreement: dis,
    home: { abbr: `H${id}`, name: `Home ${id}` }, away: { abbr: `A${id}`, name: `Away ${id}` },
    predictions: { v10: p == null ? null : { home_win_prob: p } },
  });
  const games = [
    g('1', '2026-09-26T23:00:00Z', 0.02, 0.52, 'low'),
    g('2', '2026-09-26T17:00:00Z', 0.2, 0.7, 'high'),
    g('3', '2026-09-26T20:00:00Z', 0.1, 0.35, 'medium'),
    g('4', '2026-09-26T19:00:00Z', 0.05, null, 'low'),
  ];
  test('sorts by time, disagreement and featured confidence', () => {
    expect(filterSortGames(games, { featured: 'v10' }).map((x) => x.game_id)).toEqual(['2', '4', '3', '1']);
    expect(filterSortGames(games, { featured: 'v10', sort: 'disagreement' }).map((x) => x.game_id)).toEqual(['2', '3', '4', '1']);
    expect(filterSortGames(games, { featured: 'v10', sort: 'confidence' }).map((x) => x.game_id)).toEqual(['2', '3', '1', '4']);
  });
  test('filters by disagreement, confidence and search', () => {
    expect(filterSortGames(games, { featured: 'v10', disagreement: 'medium' }).map((x) => x.game_id)).toEqual(['2', '3']);
    expect(filterSortGames(games, { featured: 'v10', minConfidence: 0.6 }).map((x) => x.game_id)).toEqual(['2', '3']);
    expect(filterSortGames(games, { featured: 'v10', search: 'away 3' }).map((x) => x.game_id)).toEqual(['3']);
  });
});

describe('players', () => {
  const row = (pid, name, team, role, order, stat, mean, cal = false) => ({
    game_id: 'g1', player_id: pid, player_name: name, team_abbr: team, role, batting_order: order,
    stat, mean, p05: 0, p95: 3, calibrated: cal, calibration_note: cal ? 'ok' : 'hot',
  });
  const rows = [
    row('1', 'Acuña', 'ATL', 'batter', 1, 'H', 1.1), row('1', 'Acuña', 'ATL', 'batter', 1, 'PA', 4.6, true),
    row('2', 'Olson', 'ATL', 'batter', 2, 'H', 0.9),
    row('3', 'Lindor', 'NYM', 'batter', 1, 'H', 1.3),
    row('4', 'Sale', 'ATL', 'starter', null, 'K', 7.1, true),
  ];
  const players = pivotPlayers(rows);
  test('pivots long rows to one row per player', () => {
    expect(players).toHaveLength(4);
    expect(Object.keys(players[0].stats)).toEqual(['H', 'PA']);
  });
  test('filters by search, team and role', () => {
    expect(filterPlayers(players, { search: 'ols' }).map((p) => p.player_name)).toEqual(['Olson']);
    expect(filterPlayers(players, { team: 'NYM' }).map((p) => p.player_name)).toEqual(['Lindor']);
    expect(filterPlayers(players, { role: 'starter' }).map((p) => p.player_name)).toEqual(['Sale']);
  });
  test('sorts by batting order within team and by a stat', () => {
    const bat = players.filter((p) => p.role === 'batter');
    expect(sortPlayers(bat, { key: 'order', dir: 'asc' }).map((p) => p.player_name)).toEqual(['Acuña', 'Olson', 'Lindor']);
    expect(sortPlayers(bat, { key: 'H', dir: 'desc' }).map((p) => p.player_name)).toEqual(['Lindor', 'Acuña', 'Olson']);
  });
  test('a stat is calibrated only if every row is', () => {
    expect(statCalibration(players, 'PA')).toEqual({ calibrated: true, note: 'ok' });
    expect(statCalibration(players, 'H').calibrated).toBe(false);
  });
});
