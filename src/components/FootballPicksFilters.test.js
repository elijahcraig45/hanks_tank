import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FootballPage from './FootballPage';
import ApiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getFootballPredictions: jest.fn(),
    getFootballAccuracy: jest.fn(),
    getRankings: jest.fn(),
    getFootballLeaders: jest.fn(),
    getFootballPlayers: jest.fn(),
    getFootballTeamStats: jest.fn(),
  },
}));

const game = (over) => ({
  game_id: Math.random().toString(36).slice(2),
  week: 1,
  game_date: '2026-09-05T16:00:00Z',
  home_team_name: 'Ohio State Buckeyes',
  away_team_name: 'Ball State Cardinals',
  home_win_probability: 0.93,
  confidence_tier: 'high',
  predicted_winner: 'Ohio State Buckeyes',
  cross_division: 0,
  ...over,
});

const PREDICTIONS = [
  game({ game_id: 'ranked', home_team_name: 'Ohio State Buckeyes', away_team_name: 'Ball State Cardinals' }),
  game({ game_id: 'unranked', home_team_name: 'Navy Midshipmen', away_team_name: 'Tulane Green Wave', confidence_tier: 'low', home_win_probability: 0.55 }),
  game({ game_id: 'mismatch', home_team_name: 'Georgia Bulldogs', away_team_name: 'Tennessee State Tigers', cross_division: 1, confidence_tier: 'high' }),
];

function renderPicks() {
  return render(
    <MemoryRouter initialEntries={['/football/fbs/picks']}>
      <FootballPage />
    </MemoryRouter>
  );
}

describe('football picks filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ApiService.getFootballPredictions.mockResolvedValue({ data: PREDICTIONS });
    ApiService.getFootballAccuracy.mockResolvedValue({ data: null });
    // Only Ohio State and Georgia are ranked.
    ApiService.getRankings.mockResolvedValue({
      data: [
        { team: 'Ohio State Buckeyes', rank: 3, conference: 'Big Ten Conference' },
        { team: 'Georgia Bulldogs', rank: 8, conference: 'Southeastern Conference' },
        { team: 'Ball State Cardinals', rank: 90, conference: 'Mid-American Conference' },
        { team: 'Navy Midshipmen', rank: 40, conference: 'American Conference' },
        { team: 'Tulane Green Wave', rank: 44, conference: 'American Conference' },
        { team: 'Tennessee State Tigers', rank: 200, conference: 'Big South' },
      ],
      meta: {},
    });
  });

  test('shows every game and a count before filtering', async () => {
    renderPicks();
    expect(await screen.findByText('3 of 3')).toBeInTheDocument();
  });

  test('top 25 filter keeps only games involving a ranked team', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.click(screen.getByRole('button', { name: /top 25 only/i }));

    await waitFor(() => expect(screen.getByText('2 of 3')).toBeInTheDocument());
    // Navy vs Tulane has no ranked side and drops out.
    expect(screen.queryByText('Navy Midshipmen')).not.toBeInTheDocument();
    expect(screen.getByText('Ohio State Buckeyes')).toBeInTheDocument();
  });

  test('renders the rank beside a ranked team', async () => {
    renderPicks();
    await screen.findByText('3 of 3');
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#8')).toBeInTheDocument();
  });

  test('hide mismatches drops cross-division games', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.click(screen.getByRole('button', { name: /hide mismatches/i }));

    await waitFor(() => expect(screen.getByText('2 of 3')).toBeInTheDocument());
    expect(screen.queryByText('Tennessee State Tigers')).not.toBeInTheDocument();
  });

  test('confidence filter narrows to one tier', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.click(screen.getByRole('button', { name: 'Low' }));

    await waitFor(() => expect(screen.getByText('1 of 3')).toBeInTheDocument());
    expect(screen.getByText('Navy Midshipmen')).toBeInTheDocument();
  });

  test('search matches either side of the matchup', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.type(screen.getByLabelText(/search teams/i), 'tulane');

    await waitFor(() => expect(screen.getByText('1 of 3')).toBeInTheDocument());
  });

  test('offers a way out when filters match nothing', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.type(screen.getByLabelText(/search teams/i), 'nonexistent team');

    expect(await screen.findByText('No games match these filters')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(screen.getByText('3 of 3')).toBeInTheDocument());
  });

  test('conference filter keeps games with either side in that conference', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.selectOptions(
      screen.getByLabelText(/conference/i), 'Big Ten Conference'
    );

    // Ohio State is Big Ten; its opponent Ball State is not, and the game still counts.
    await waitFor(() => expect(screen.getByText('1 of 3')).toBeInTheDocument());
    expect(screen.getByText('Ohio State Buckeyes')).toBeInTheDocument();
    expect(screen.queryByText('Navy Midshipmen')).not.toBeInTheDocument();
  });

  test('conference filter only offers conferences playing this week', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    const select = screen.getByLabelText(/conference/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('Big Ten Conference');
    expect(options).toContain('American Conference');
    // No team from this conference plays this week.
    expect(options).not.toContain('Pac-12 Conference');
  });

  test('combining conference and confidence narrows further', async () => {
    renderPicks();
    await screen.findByText('3 of 3');

    await userEvent.selectOptions(
      screen.getByLabelText(/conference/i), 'American Conference'
    );
    await waitFor(() => expect(screen.getByText('1 of 3')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'High' }));
    // Navy vs Tulane is the only American game and it is low confidence.
    expect(await screen.findByText('No games match these filters')).toBeInTheDocument();
  });

  test('hides the top 25 toggle when the league has no board', async () => {
    ApiService.getRankings.mockResolvedValue({ data: [], meta: {} });
    renderPicks();
    await screen.findByText('3 of 3');
    expect(screen.queryByRole('button', { name: /top 25 only/i })).not.toBeInTheDocument();
  });
});
