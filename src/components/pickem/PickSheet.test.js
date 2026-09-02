/**
 * Tests for the pick sheet.
 *
 * The lock is the thing worth guarding. A game that has kicked off must not be
 * pickable, the server is what decides that, and a sheet left open while a game starts
 * has to explain itself rather than silently drop the pick.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PickSheet from './PickSheet';
import ApiService from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getPickemGames: jest.fn(), submitPicks: jest.fn() },
}));

jest.mock('../../services/googleAuth', () => ({
  getSession: jest.fn(),
  onAuthChange: jest.fn(),
}));

// eslint-disable-next-line global-require
const googleAuth = require('../../services/googleAuth');

const game = (over = {}) => ({
  game_id: 'g1', sport: 'cfb', season: 2026, week: 2,
  kickoff: '2026-09-12T16:00:00.000Z', start_time_tbd: false,
  home_team: 'Michigan', away_team: 'Oklahoma',
  home_display: 'Michigan', away_display: 'Oklahoma',
  neutral_site: false, spread_line: 2.0, total_line: 45,
  home_score: null, away_score: null, completed: false, locked: false,
  ...over,
});

const sheet = (games, over = {}) => ({
  data: games,
  meta: {
    sport: 'cfb', season: 2026, week: 2, weeks: [1, 2, 3],
    count: games.length,
    open: games.filter((g) => !g.locked).length,
    with_spread: games.filter((g) => g.spread_line !== null).length,
    signed_in: true, picks: [], ...over,
  },
});

// react-scripts sets jest's `resetMocks: true`, which discards any implementation
// passed to jest.fn(impl) before every test. So the signed-in session and the
// unsubscribe stub are established here rather than in the module factory — in the
// factory they silently become undefined and the sheet decides nobody is signed in.
beforeEach(() => {
  jest.clearAllMocks();
  googleAuth.getSession.mockReturnValue({
    profile: { userId: 'sub-1', name: 'Picker' },
  });
  googleAuth.onAuthChange.mockReturnValue(() => {});
});

const renderSheet = () => render(
  <PickSheet sport="cfb" season={2026} authConfigured />,
);

describe('pick sheet', () => {
  it('renders each game as two pickable sides', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    await waitFor(() => expect(screen.getByText('Oklahoma')).toBeInTheDocument());
    expect(screen.getByText('Michigan')).toBeInTheDocument();
  });

  it('will not let a game that has kicked off be picked', async () => {
    // The server decides this; the sheet only renders it.
    ApiService.getPickemGames.mockResolvedValue(sheet([
      game({ locked: true, completed: true, home_score: 24, away_score: 17 }),
    ], { open: 0 }));
    renderSheet();

    // The sheet hides started games by default, which is what you want while picking;
    // reviewing them means unticking the filter.
    await waitFor(() => expect(
      screen.getByLabelText(/Hide games that have started/),
    ).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Hide games that have started/));

    await waitFor(() => expect(screen.getByText(/Final 17–24/)).toBeInTheDocument());
    const buttons = screen.getAllByRole('button', { name: /Oklahoma|Michigan/ });
    for (const b of buttons) expect(b).toBeDisabled();
  });

  it('shows the spread from each side, not the stored convention', async () => {
    // Stored positive-means-home-favoured; a reader wants "Oklahoma +2" / "Michigan -2".
    ApiService.getPickemGames.mockResolvedValue(sheet([game({ spread_line: 2.0 })]));
    renderSheet();
    await waitFor(() => expect(screen.getByText('Oklahoma')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Against the spread/ }));
    await waitFor(() => expect(screen.getByText('+2')).toBeInTheDocument());
    expect(screen.getByText('-2')).toBeInTheDocument();
  });

  it('blocks an ATS pick on a game with no posted line', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game({ spread_line: null })]));
    renderSheet();
    await waitFor(() => expect(screen.getByText('Oklahoma')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Against the spread/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Oklahoma/ })).toBeDisabled();
    });
    expect(screen.getByText(/no line/)).toBeInTheDocument();
  });

  it('saves the selected side and reports how many landed', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    ApiService.submitPicks.mockResolvedValue({
      data: { accepted: 1, rejected: [] }, meta: {},
    });
    renderSheet();

    await waitFor(() => expect(screen.getByText('Oklahoma')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Oklahoma/ }));

    const save = screen.getByRole('button', { name: 'Save picks' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    await waitFor(() => expect(ApiService.submitPicks).toHaveBeenCalled());
    const [, payload] = ApiService.submitPicks.mock.calls[0];
    // A side, never a team name.
    expect(payload.picks).toEqual([
      { game_id: 'g1', pick_type: 'su', selected: 'away' },
    ]);
    await waitFor(() => expect(screen.getByText(/Saved 1 pick/)).toBeInTheDocument());
  });

  it('names the games it could not save rather than just counting them', async () => {
    // A sheet left open while a game starts is the normal case, and "1 rejected" tells
    // the reader nothing they can act on.
    ApiService.getPickemGames.mockResolvedValue(sheet([game(), game({ game_id: 'g2' })]));
    ApiService.submitPicks.mockResolvedValue({
      data: { accepted: 1, rejected: [{ game_id: 'g2', reason: 'kicked off' }] },
      meta: {},
    });
    renderSheet();

    await waitFor(() => expect(screen.getAllByText('Oklahoma')).toHaveLength(2));
    const rows = screen.getAllByRole('listitem');
    await userEvent.click(within(rows[0]).getByRole('button', { name: /Oklahoma/ }));
    await userEvent.click(within(rows[1]).getByRole('button', { name: /Michigan/ }));

    const save = screen.getByRole('button', { name: 'Save picks' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    await waitFor(() => {
      expect(screen.getByText(/Oklahoma at Michigan \(kicked off\)/)).toBeInTheDocument();
    });
  });

  it('seeds the sheet with picks already saved for this type', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()], {
      picks: [{ game_id: 'g1', pick_type: 'su', selected: 'home', spread_at_pick: 2 }],
    }));
    renderSheet();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Michigan/ }))
        .toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('button', { name: /Oklahoma/ }))
      .toHaveAttribute('aria-pressed', 'false');
  });

  it('cannot save while signed out, and says why', async () => {
    googleAuth.getSession.mockReturnValue(null);
    ApiService.getPickemGames.mockResolvedValue(sheet([game()], { signed_in: false }));
    renderSheet();
    await waitFor(() => expect(screen.getByText(/Sign in above to save/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save picks' })).toBeDisabled();
  });
});
