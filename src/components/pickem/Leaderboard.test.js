/**
 * Tests for the standings.
 *
 * What matters is that the table says something a column of percentages cannot: the gap
 * to the market as one signed number, week-by-week form, and how much is still unscored.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import Leaderboard from './Leaderboard';
import ApiService from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getPickemLeaderboard: jest.fn() },
}));

const entrant = (over = {}) => ({
  rank: 1, user_id: 'u1', display_name: 'Jacob', picture_url: null,
  wins: 9, losses: 3, pushes: 1, win_pct: 0.75,
  vegas_wins: 8, vegas_win_pct: 0.667, vs_vegas: 0.083,
  underdog_hits: 2, picks_made: 20, picks_graded: 13,
  weeks_played: 3, weeks_graded: 3, best_week_wins: 5,
  by_week: [
    { week: 1, wins: 5, losses: 1, pushes: 0, win_pct: 0.833 },
    { week: 2, wins: 2, losses: 2, pushes: 1, win_pct: 0.5 },
    { week: 3, wins: 2, losses: 0, pushes: 0, win_pct: 1 },
  ],
  ...over,
});

const board = (rows, scope = 'season') => ({
  data: rows, meta: { scope, sport: 'cfb', season: 2026, pick_type: 'su', count: rows.length },
});

beforeEach(() => jest.clearAllMocks());

const renderBoard = (props = {}) => render(
  <Leaderboard sport="cfb" season={2026} pickType="su" week="" {...props} />,
);

describe('standings', () => {
  it('shows the gap to the market as one signed number', async () => {
    // Two percentages side by side make the reader do the subtraction.
    ApiService.getPickemLeaderboard.mockResolvedValue(board([entrant()]));
    renderBoard();
    expect(await screen.findByText('+8.3%')).toBeInTheDocument();
  });

  it('marks trailing the market as negative, not as an absence', async () => {
    ApiService.getPickemLeaderboard.mockResolvedValue(
      board([entrant({ vs_vegas: -0.125 })]),
    );
    renderBoard();
    const cell = await screen.findByText('-12.5%');
    expect(cell).toHaveClass('ft-neg');
  });

  it('separates scored picks from picks made', async () => {
    // A short record should read as "not scored yet", not as a thin week.
    ApiService.getPickemLeaderboard.mockResolvedValue(board([entrant()]));
    renderBoard();
    await waitFor(() => expect(screen.getByText('Jacob')).toBeInTheDocument());
    expect(screen.getByText(/of 20/)).toBeInTheDocument();
  });

  it('leaves out numbers that would need explaining', async () => {
    // Form, best week and underdog counts read as a green "5" and two zeroes with one
    // graded week. A number that needs explaining is worse than one left out.
    ApiService.getPickemLeaderboard.mockResolvedValue(board([entrant()]));
    renderBoard();
    await waitFor(() => expect(screen.getByText('Jacob')).toBeInTheDocument());
    for (const name of ['Form', 'Best', 'Dogs']) {
      expect(screen.queryByRole('columnheader', { name })).not.toBeInTheDocument();
    }
  });

  it('warns that records will move while most picks are unscored', async () => {
    ApiService.getPickemLeaderboard.mockResolvedValue(
      board([entrant({ pending: 170 })]),
    );
    renderBoard();
    expect(await screen.findByText(/will move a lot/)).toBeInTheDocument();
  });

  it('marks the viewer’s own row', async () => {
    ApiService.getPickemLeaderboard.mockResolvedValue(board([entrant()]));
    renderBoard({ you: 'u1' });
    await waitFor(() => expect(screen.getByText('you')).toBeInTheDocument());
  });

  it('explains what vs Vegas means rather than leaving a bare column', async () => {
    ApiService.getPickemLeaderboard.mockResolvedValue(board([entrant()]));
    renderBoard();
    expect(await screen.findByText(/on the games they actually picked/)).toBeInTheDocument();
  });

  it('says nothing is scored yet rather than showing an empty table', async () => {
    ApiService.getPickemLeaderboard.mockResolvedValue(board([]));
    renderBoard();
    expect(await screen.findByText('No standings yet')).toBeInTheDocument();
  });
});
