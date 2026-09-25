import { footballNav, footballPath, sportContext } from './sports';

const SECTIONS = [
  { key: 'picks', label: 'Picks' },
  { key: 'scoreboard', label: 'Scores', availableFor: (l) => l.sport === 'cfb' },
  { key: 'rankings', label: 'Power Rankings' },
  { key: 'models', label: 'Models' },
  { key: 'diagnostics', label: 'Diagnostics' },
  { key: 'leaders', label: 'Leaders' },
  { key: 'players', label: 'Players' },
  { key: 'stats', label: 'Team Stats' },
];

test('the models scoreboard leads the Models group, with diagnostics beside it', () => {
  const nav = footballNav('nfl', SECTIONS);
  const models = nav.find((n) => n.key === 'models');
  expect(models.to).toBe('/nfl/models');
  expect(models.children.map((c) => c.to)).toEqual(['/nfl/models', '/nfl/diagnostics']);
  expect(models.children.map((c) => c.label)).toEqual(['Model scoreboard', 'Diagnostics']);
});

test('football nav groups stats pages and skips sections a league lacks', () => {
  const nfl = footballNav('nfl', SECTIONS);
  expect(nfl.map((n) => n.key)).toEqual(['predictions', 'rankings', 'stats', 'models', 'pickem']);
  const cfb = footballNav('fcs', SECTIONS);
  expect(cfb.map((n) => n.key)).toEqual(['predictions', 'scores', 'rankings', 'stats', 'models', 'pickem']);
  expect(cfb.find((n) => n.key === 'stats').children.map((c) => c.to))
    .toEqual(['/cfb/fcs/leaders', '/cfb/fcs/players', '/cfb/fcs/stats']);
  expect(cfb.find((n) => n.key === 'pickem').to).toBe('/pickem/cfb');
});

test('an unknown section becomes its own top-level entry rather than vanishing', () => {
  const nav = footballNav('fbs', [...SECTIONS, { key: 'injuries', label: 'Injuries' }]);
  expect(nav.find((n) => n.key === 'injuries').to).toBe('/cfb/fbs/injuries');
});

test('paths and context round-trip', () => {
  expect(footballPath('nfl', 'rankings')).toBe('/nfl/rankings');
  expect(footballPath('fcs', 'rankings')).toBe('/cfb/fcs/rankings');
  expect(footballPath('bogus')).toBe('/cfb/fbs');
  expect(sportContext('/cfb/fcs/rankings')).toEqual({ sport: 'cfb', league: 'fcs' });
  expect(sportContext('/nfl')).toEqual({ sport: 'nfl', league: 'nfl' });
  expect(sportContext('/mlb/team/ATL').sport).toBe('mlb');
  expect(sportContext('/pickem').sport).toBe('cfb');
  expect(sportContext('/')).toEqual({ sport: 'all', league: null });
});
