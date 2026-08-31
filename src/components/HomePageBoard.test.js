import { buildPicksBoard, upcomingFootball } from './HomePage';

const pick = (over) => ({
  homeProb: 0.6, tier: 'medium', crossDivision: false, sport: 'mlb', ...over,
});

describe('buildPicksBoard', () => {
  test('caps each sport so football cannot take every slot', () => {
    const football = Array.from({ length: 10 }, (_, i) =>
      pick({ sport: 'football', tier: 'high', homeProb: 0.9 - i * 0.01, key: `f${i}` })
    );
    const mlb = Array.from({ length: 10 }, (_, i) =>
      pick({ sport: 'mlb', tier: 'low', homeProb: 0.55, key: `m${i}` })
    );

    const board = buildPicksBoard(mlb, football);

    expect(board.filter((p) => p.sport === 'football')).toHaveLength(4);
    expect(board.filter((p) => p.sport === 'mlb')).toHaveLength(4);
  });

  test('drops cross-division blowouts', () => {
    const board = buildPicksBoard(
      [],
      [
        pick({ sport: 'football', tier: 'high', homeProb: 0.97, crossDivision: true, key: 'x' }),
        pick({ sport: 'football', tier: 'high', homeProb: 0.8, key: 'ok' }),
      ]
    );

    expect(board).toHaveLength(1);
    expect(board[0].key).toBe('ok');
  });
});

describe('upcomingFootball', () => {
  const now = new Date('2026-09-01T12:00:00Z').getTime();

  test('returns the whole next week, not a rolling day window', () => {
    const rows = [
      { game_id: 'a', week: 1, game_date: '2026-09-10T00:00:00Z' },
      { game_id: 'b', week: 1, game_date: '2026-09-14T00:00:00Z' }, // outside a 10-day window
      { game_id: 'c', week: 2, game_date: '2026-09-17T00:00:00Z' },
    ];

    const out = upcomingFootball(rows, now);

    expect(out.map((r) => r.game_id)).toEqual(['a', 'b']);
  });

  test('falls back to the last completed week once the season is over', () => {
    const rows = [
      { game_id: 'a', week: 16, game_date: '2025-12-20T00:00:00Z' },
      { game_id: 'b', week: 17, game_date: '2025-12-28T00:00:00Z' },
    ];

    expect(upcomingFootball(rows, now).map((r) => r.game_id)).toEqual(['b']);
  });
});
