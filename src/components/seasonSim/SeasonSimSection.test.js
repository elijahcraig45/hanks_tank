import { fireEvent, render, screen, within } from '@testing-library/react';
import SeasonSimSection from './SeasonSimSection';
import ApiService from '../../services/api';
import { fmtPct, parseDist, shapeBracket } from './simFormat';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getSeasonSim: jest.fn(),
    seasonSimExportUrl: jest.fn(),
  },
}));

const base = {
  sport: 'nfl', season: 2026, as_of_week: 4, computed_at: '2026-09-28T09:00:00.000Z',
  model_version: 'season_sim_v1', n_sims: 10000,
};

const team = (abbr, name, division, extra = {}) => ({
  ...base, team: abbr, team_name: name, conference: division.slice(0, 3), division,
  wins: 3, losses: 1, ties: 0, rating: 5.1, rating_sd: 2.2, power_rank: 2,
  remaining_games: 13, remaining_sos: 1.4, mean_wins: 11.3, mean_losses: 5.7,
  wins_p10: 9, wins_p50: 11, wins_p90: 13,
  wins_dist: JSON.stringify([0, 0, 0, 0.01, 0.02, 0.04, 0.07, 0.1, 0.14, 0.17, 0.16, 0.13, 0.08, 0.05, 0.02, 0.01, 0, 0]),
  p_division: 0.62, p_conf_game: 0.3, p_conf_title: 0.18, p_playoffs: 0.87, p_bye: 0.24,
  p_seed: JSON.stringify([0.24, 0.16, 0.12, 0.1, 0.1, 0.08, 0.07]),
  p_quarters: 0.55, p_semis: 0.3, p_final: 0.18, p_champion: 0.1,
  exp_final_rank: 3, rank_p10: 1, rank_p90: 7,
  ...extra,
});

const nfl = {
  teams: [
    team('KC', 'Kansas City Chiefs', 'AFC West'),
    team('DEN', 'Denver Broncos', 'AFC West', { mean_wins: 8.1, p_playoffs: 0.004, p_champion: 0 }),
    team('PHI', 'Philadelphia Eagles', 'NFC East', { mean_wins: 12.0, p_champion: 0.14 }),
  ],
  bracket: [
    { ...base, bracket: 'AFC', round: 'seed', round_order: 0, slot: 1, slot_label: '#1 seed', team: 'KC', team_name: 'Kansas City Chiefs', p_slot: 0.24, p_win: 0.24, is_modal: true, modal_opponent: null },
    { ...base, bracket: 'AFC', round: 'seed', round_order: 0, slot: 1, slot_label: '#1 seed', team: 'DEN', team_name: 'Denver Broncos', p_slot: 0.05, p_win: 0.05, is_modal: false, modal_opponent: null },
    { ...base, bracket: 'AFC', round: 'wild_card', round_order: 1, slot: 1, slot_label: '2 vs 7', team: 'KC', team_name: 'Kansas City Chiefs', p_slot: 0.4, p_win: 0.3, is_modal: true, modal_opponent: 'DEN' },
    { ...base, bracket: 'AFC', round: 'wild_card', round_order: 1, slot: 1, slot_label: '2 vs 7', team: 'DEN', team_name: 'Denver Broncos', p_slot: 0.2, p_win: 0.08, is_modal: true, modal_opponent: 'KC' },
    { ...base, bracket: 'NFL', round: 'super_bowl', round_order: 4, slot: 1, slot_label: 'Super Bowl', team: 'PHI', team_name: 'Philadelphia Eagles', p_slot: 0.25, p_win: 0.14, is_modal: true, modal_opponent: 'KC' },
    { ...base, bracket: 'NFC', round: 'seed', round_order: 0, slot: 1, slot_label: '#1 seed', team: 'PHI', team_name: 'Philadelphia Eagles', p_slot: 0.3, p_win: 0.3, is_modal: true, modal_opponent: null },
  ],
  meta: { ...base, available_weeks: [3, 4], source: 'bigquery', method_url: '/learn/season-sim.html' },
};

const cfb = {
  teams: [
    team('UGA', 'Georgia Bulldogs', 'SEC', { sport: 'cfb', conference: 'Southeastern Conference', division: null, p_division: null }),
    team('APP', 'App State', 'East', { sport: 'cfb', conference: 'Sun Belt Conference', division: 'East', p_division: null, exp_final_rank: 31.6 }),
  ],
  bracket: [
    { ...base, sport: 'cfb', bracket: 'CFP', round: 'seed', round_order: 0, slot: 1, slot_label: '#1 seed', team: 'UGA', team_name: 'Georgia Bulldogs', p_slot: 0.2, p_win: 0.2, is_modal: true },
    { ...base, sport: 'cfb', bracket: 'CFP', round: 'quarterfinal', round_order: 2, slot: 1, slot_label: 'Rose Bowl QF (1 vs 8/9)', team: 'UGA', team_name: 'Georgia Bulldogs', p_slot: 0.3, p_win: 0.2, is_modal: true },
  ],
  meta: { ...base, sport: 'cfb', available_weeks: [4], source: 'fixture', method_url: '/learn/season-sim.html' },
};

beforeEach(() => {
  jest.clearAllMocks();
  ApiService.getSeasonSim.mockImplementation(async (sport) => (sport === 'cfb' ? cfb : nfl));
  ApiService.seasonSimExportUrl.mockImplementation((sport, { season, week, table, format }) => (
    `http://api.test/api/season-sim/${sport}/export?season=${season}&week=${week}&table=${table}&format=${format}`
  ));
});

test('shows the as-of week, run facts, the shadow caveat and the method link', async () => {
  render(<SeasonSimSection sport="nfl" season={2026} />);
  expect(await screen.findByRole('heading', { name: 'As of week 4' })).toBeInTheDocument();
  expect(screen.getByTestId('ssim-asof')).toHaveTextContent('10,000 simulations');
  expect(screen.getByTestId('ssim-asof')).toHaveTextContent('season_sim_v1');
  expect(screen.getByText(/Experimental shadow model/)).toBeInTheDocument();
  expect(screen.getByText(/odds, not predictions/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /how the simulation works/i }))
    .toHaveAttribute('href', '/learn/season-sim.html');
  expect(ApiService.getSeasonSim).toHaveBeenCalledWith('nfl', { season: 2026, week: null });
});

test('groups the NFL table by division and sorts by a column', async () => {
  render(<SeasonSimSection sport="nfl" season={2026} />);
  const table = await screen.findByTestId('ssim-table');
  expect(within(table).getByText('AFC West')).toBeInTheDocument();
  expect(within(table).getByText('NFC East')).toBeInTheDocument();
  // Division, playoffs, #1 seed, conference, title columns.
  ['Div', 'Playoffs', '#1 seed', 'Conf', 'Title'].forEach((h) => (
    expect(within(table).getByRole('button', { name: h })).toBeInTheDocument()
  ));
  const kc = within(screen.getByTestId('ssim-row-KC'));
  expect(kc.getByText('3-1')).toBeInTheDocument();
  expect(kc.getByText('11.3-5.7')).toBeInTheDocument();
  expect(kc.getByText('62%')).toBeInTheDocument();
  expect(within(screen.getByTestId('ssim-row-DEN')).getByText('<1%')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: /group by division/i }));
  const rows = () => within(screen.getByTestId('ssim-table')).getAllByRole('row')
    .map((r) => r.getAttribute('data-testid')).filter(Boolean);
  expect(rows()).toEqual(['ssim-row-PHI', 'ssim-row-KC', 'ssim-row-DEN']);
  fireEvent.click(within(screen.getByTestId('ssim-table')).getByRole('button', { name: /Proj/ }));
  expect(rows()).toEqual(['ssim-row-DEN', 'ssim-row-KC', 'ssim-row-PHI']);
  expect(within(screen.getByTestId('ssim-table')).getByRole('button', { name: /Proj/ }).closest('th'))
    .toHaveAttribute('aria-sort', 'ascending');
});

test('CFB uses conference groups and CFP columns, including expected rank', async () => {
  render(<SeasonSimSection sport="cfb" season={2026} />);
  const table = await screen.findByTestId('ssim-table');
  expect(within(table).getByText('Sun Belt Conference · East')).toBeInTheDocument();
  ['CFP', 'Bye', 'Semis', 'Exp rk'].forEach((h) => (
    expect(within(table).getByRole('button', { name: h })).toBeInTheDocument()
  ));
  expect(within(table).queryByRole('button', { name: 'Div' })).toBeNull();
  expect(within(screen.getByTestId('ssim-row-APP')).getByText('32')).toBeInTheDocument();
  expect(screen.getByTestId('ssim-asof')).toHaveTextContent('local fixture');
});

test('renders the most-likely bracket from is_modal rows, alternatives behind a disclosure', async () => {
  render(<SeasonSimSection sport="nfl" season={2026} />);
  const bracket = await screen.findByTestId('ssim-bracket');
  const afc = within(within(bracket).getByRole('region', { name: 'AFC bracket' }));
  expect(afc.getByText('Seeds')).toBeInTheDocument();
  expect(afc.getByText('Wild card')).toBeInTheDocument();
  const [seed1, wc] = afc.getAllByTestId('ssim-slot');
  // Seed 1: KC is modal, DEN only an alternative.
  expect(within(seed1).getAllByRole('listitem')[0]).toHaveTextContent('Kansas City Chiefs');
  expect(within(seed1).getByText(/Other candidates \(1\)/)).toBeInTheDocument();
  expect(within(seed1).getByText('5%')).toBeInTheDocument();
  // Wild card game: both modal participants, with play and win odds.
  expect(within(wc).getByText('2 vs 7')).toBeInTheDocument();
  expect(within(wc).getByText('Denver Broncos')).toBeInTheDocument();
  expect(within(wc).getByText('W 30%')).toBeInTheDocument();
  expect(within(bracket).getByRole('region', { name: 'Super Bowl bracket' })).toBeInTheDocument();
  // AFC, then NFC, then the Super Bowl.
  expect(within(bracket).getAllByRole('region').map((r) => r.getAttribute('aria-label')))
    .toEqual(['AFC bracket', 'NFC bracket', 'Super Bowl bracket']);
});

test('opens a team drill-down with distributions, round odds and rating uncertainty', async () => {
  render(<SeasonSimSection sport="nfl" season={2026} />);
  await screen.findByTestId('ssim-table');
  fireEvent.click(within(screen.getByTestId('ssim-row-KC')).getByRole('button'));
  const dlg = screen.getByRole('dialog');
  expect(within(dlg).getByRole('heading', { name: 'Kansas City Chiefs' })).toBeInTheDocument();
  expect(within(dlg).getByText('± 2.2')).toBeInTheDocument();
  expect(within(dlg).getByText(/13 games/)).toBeInTheDocument();
  expect(within(dlg).getByText(/tougher/)).toBeInTheDocument();
  expect(within(within(dlg).getByTestId('ssim-wins-chart')).getAllByRole('listitem')).toHaveLength(18);
  // 7 seeds + "Out".
  const seeds = within(within(dlg).getByTestId('ssim-seed-chart')).getAllByRole('listitem');
  expect(seeds).toHaveLength(8);
  expect(seeds[7]).toHaveAttribute('aria-label', 'Out: 13%');
  const odds = within(within(dlg).getByTestId('ssim-odds'));
  expect(odds.getByText('Win Super Bowl')).toBeInTheDocument();
  expect(odds.getByText('Reach divisional round')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('the bracket opens the drill-down too', async () => {
  render(<SeasonSimSection sport="cfb" season={2026} />);
  const bracket = await screen.findByTestId('ssim-bracket');
  fireEvent.click(within(bracket).getAllByRole('button', { name: /Georgia Bulldogs/ })[0]);
  const dlg = screen.getByRole('dialog');
  expect(within(dlg).getByText('Make the CFP')).toBeInTheDocument();
  expect(within(dlg).getByText('Exp. final rank')).toBeInTheDocument();
  fireEvent.click(within(dlg).getByRole('button', { name: /close/i }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('export links point at the backend export for the shown slice', async () => {
  render(<SeasonSimSection sport="nfl" season={2026} />);
  await screen.findByTestId('ssim-table');
  expect(screen.getByTestId('ssim-export-team-csv'))
    .toHaveAttribute('href', 'http://api.test/api/season-sim/nfl/export?season=2026&week=4&table=team&format=csv');
  expect(screen.getByTestId('ssim-export-bracket-json'))
    .toHaveAttribute('href', 'http://api.test/api/season-sim/nfl/export?season=2026&week=4&table=bracket&format=json');
});

test('the week selector refetches that week', async () => {
  render(<SeasonSimSection sport="nfl" season={2026} />);
  fireEvent.change(await screen.findByRole('combobox', { name: 'As of week' }), { target: { value: '3' } });
  expect(ApiService.getSeasonSim).toHaveBeenLastCalledWith('nfl', { season: 2026, week: 3 });
  await screen.findByTestId('ssim-table');
});

test('a missing table is an empty state, not an error', async () => {
  ApiService.getSeasonSim.mockRejectedValue(new Error('Resource not found'));
  render(<SeasonSimSection sport="nfl" season={2026} />);
  expect(await screen.findByTestId('ssim-empty')).toHaveTextContent(/No season projections have been published/);
  expect(screen.getByRole('link', { name: /how the simulation works/i })).toBeInTheDocument();
});

test('format helpers stay honest about extremes', () => {
  expect(fmtPct(0.004)).toBe('<1%');
  expect(fmtPct(0.996)).toBe('>99%');
  expect(fmtPct(0)).toBe('0%');
  expect(fmtPct(null)).toBe('—');
  expect(parseDist('[0.5,0.5]')).toEqual([0.5, 0.5]);
  expect(parseDist([0.2])).toEqual([0.2]);
  expect(parseDist('nope')).toEqual([]);
  const shaped = shapeBracket(nfl.bracket);
  expect(shaped.map((b) => b.bracket)).toEqual(['AFC', 'NFC', 'NFL']);
  expect(shaped[0].rounds[1].slots[0].modal.map((r) => r.team)).toEqual(['KC', 'DEN']);
});
