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
  home_rank: 5, away_rank: 12, home_rating: 800, away_rating: 700,
  home_record: '10-2', away_record: '8-4',
  home_record_season: 2025, away_record_season: 2025,
  home_ap_rank: 6, away_ap_rank: 14,
  home_coaches_rank: 6, away_coaches_rank: 15,
  home_fpi: 21.8, away_fpi: 12.4, home_fpi_rank: 7, away_fpi_rank: 19,
  home_streak: 'W3', away_streak: 'L1',
  model_home_win_prob: 0.62, model_pick: 'Michigan', model_confidence: 'medium',
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
    expect(await screen.findByText('Oklahoma')).toBeInTheDocument();
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
    expect(await screen.findByLabelText(/Hide games that have started/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Hide games that have started/));

    expect(await screen.findByText(/Final 17–24/)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /Oklahoma|Michigan/ });
    for (const b of buttons) expect(b).toBeDisabled();
  });

  it('offers no pick-type switch while only one type is enabled', async () => {
    // Against-the-spread is off because college lines only appear near kickoff, so a
    // switch with one option would be furniture that does nothing.
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    expect(await screen.findByText('Oklahoma')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Against the spread/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Straight up/ })).not.toBeInTheDocument();
  });

  it('lets every unlocked game be picked, line or no line', async () => {
    // Straight up needs no spread, so a sheet with none is fully pickable — which is
    // the whole reason ATS was the mode that felt broken.
    ApiService.getPickemGames.mockResolvedValue(sheet([
      game({ game_id: 'a', spread_line: null }),
      game({ game_id: 'b', spread_line: null }),
    ]));
    renderSheet();
    await waitFor(() => expect(screen.getAllByText('Oklahoma')).toHaveLength(2));
    for (const b of screen.getAllByRole('button', { name: /Oklahoma|Michigan/ })) {
      expect(b).toBeEnabled();
    }
    expect(screen.getByText(/0 of 2 open games picked/)).toBeInTheDocument();
  });

  it('saves the selected side and reports how many landed', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    ApiService.submitPicks.mockResolvedValue({
      data: { accepted: 1, rejected: [] }, meta: {},
    });
    renderSheet();

    expect(await screen.findByText('Oklahoma')).toBeInTheDocument();
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
    expect(await screen.findByText(/Saved 1 pick/)).toBeInTheDocument();
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

    expect(await screen.findByText(/Oklahoma at Michigan \(kicked off\)/)).toBeInTheDocument();
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

  it('groups games by kickoff day, so a sixty-game Saturday is scannable', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([
      game({ game_id: 'thu', kickoff: '2026-09-10T23:00:00.000Z' }),
      game({ game_id: 'sat1', kickoff: '2026-09-12T16:00:00.000Z' }),
      game({ game_id: 'sat2', kickoff: '2026-09-12T20:00:00.000Z' }),
    ]));
    renderSheet();

    // Two day groups, with the Saturday holding two games.
    const heads = await screen.findAllByRole('heading', { level: 3 });
    expect(heads).toHaveLength(2);
    expect(heads[1].textContent).toMatch(/2 games/);
    expect(heads[0].textContent).toMatch(/1 game$/);
  });

  it('shows only the clock on a row that already sits under a day heading', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([
      game({ kickoff: '2026-09-12T16:00:00.000Z' }),
    ]));
    renderSheet();
    const heads = await screen.findAllByRole('heading', { level: 3 });
    // The date belongs to the heading; repeating it on every row is noise.
    expect(heads[0].textContent).toMatch(/Sep/);
    expect(screen.getByRole('listitem').textContent).not.toMatch(/Sep/);
  });

  it('shows the context a pick actually turns on', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    expect(await screen.findByText('Oklahoma')).toBeInTheDocument();

    // Polls, form and the market, each labelled so a bare number is unambiguous.
    expect(screen.getByText('#6')).toBeInTheDocument();          // AP
    expect(screen.getByText('W3')).toBeInTheDocument();          // form
    expect(screen.getByText('45')).toBeInTheDocument();          // over/under
    expect(screen.getByText(/Michigan 62%/)).toBeInTheDocument(); // the model
    expect(screen.getByText('+21.8 (#7)')).toBeInTheDocument();  // FPI
  });

  it("labels a record from a previous season with its year", async () => {
    // The preseason board carries last year's record; "10-2" beside a 2026 week 1
    // game would otherwise read as this season's.
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    expect(await screen.findByText('Oklahoma')).toBeInTheDocument();
    expect(screen.getAllByText('2025').length).toBeGreaterThan(0);
    expect(screen.queryByText('Record')).not.toBeInTheDocument();
  });

  it('hides FPI and ratings when the reader turns detail off', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    expect(await screen.findByText('+21.8 (#7)')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Show FPI and ratings/));
    expect(screen.queryByText('+21.8 (#7)')).not.toBeInTheDocument();
    // Polls and form stay, because most picks turn on those.
    expect(screen.getByText('#6')).toBeInTheDocument();
    expect(screen.getByText('W3')).toBeInTheDocument();
  });

  it('omits a chip entirely when the value is missing', async () => {
    // An unranked opponent has no AP rank and no FPI, and an empty cell reads worse
    // than no chip.
    ApiService.getPickemGames.mockResolvedValue(sheet([game({
      away_ap_rank: null, away_coaches_rank: null, away_fpi: null,
      away_fpi_rank: null, away_streak: null, away_record: null,
    })]));
    renderSheet();
    expect(await screen.findByText('Oklahoma')).toBeInTheDocument();
    expect(screen.queryByText('#14')).not.toBeInTheDocument();
    expect(screen.queryByText('L1')).not.toBeInTheDocument();
    expect(screen.getByText('#6')).toBeInTheDocument();
  });

  it('switches sides rather than needing a deselect first', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    const away = await screen.findByRole('button', { name: /Oklahoma/ });
    const home = screen.getByRole('button', { name: /Michigan/ });

    await userEvent.click(away);
    expect(away).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(home);
    expect(home).toHaveAttribute('aria-pressed', 'true');
    expect(away).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears a pick when the chosen side is clicked again', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    const away = await screen.findByRole('button', { name: /Oklahoma/ });
    await userEvent.click(away);
    await userEvent.click(away);
    expect(away).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/0 of 1 open games picked/)).toBeInTheDocument();
  });

  it('keeps an unsaved pick through a reload the reader did not ask for', async () => {
    // Signing in mid-visit reloads the sheet. Dropping selections then is the worst
    // thing a pick sheet can do, and it is not something the reader triggered.
    ApiService.getPickemGames.mockResolvedValue(sheet([game()]));
    renderSheet();
    const away = await screen.findByRole('button', { name: /Oklahoma/ });
    await userEvent.click(away);
    expect(screen.getByText(/1 of 1 open games picked/)).toBeInTheDocument();

    // Force a reload by flipping a filter, which re-fetches.
    await userEvent.click(screen.getByLabelText(/Hide games that have started/));
    await userEvent.click(screen.getByLabelText(/Hide games that have started/));

    expect(screen.getByRole('button', { name: /Oklahoma/ }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('shows how a pick turned out on the card that made it', async () => {
    // The reason the separate "my picks" screen could go: a finished game is more
    // useful with its result attached to the pick than in a table elsewhere.
    ApiService.getPickemGames.mockResolvedValue(sheet([
      game({ completed: true, locked: true, home_score: 31, away_score: 17 }),
    ], {
      open: 0,
      picks: [{
        game_id: 'g1', pick_type: 'su', selected: 'home',
        is_correct: true, is_push: false, vegas_correct: false,
      }],
    }));
    renderSheet();

    expect(await screen.findByLabelText(/Hide games that have started/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Hide games that have started/));

    expect(await screen.findByText('Won')).toBeInTheDocument();
    // The market got it wrong and the entrant did not — worth calling out.
    expect(screen.getByText('beat the line')).toBeInTheDocument();
  });

  it('shows the season record on the sheet, so there is no second screen for it', async () => {
    ApiService.getPickemGames.mockResolvedValue(sheet([game()], {
      record: { wins: 9, losses: 3, pushes: 1, pending: 4, total: 17 },
    }));
    renderSheet();
    expect(await screen.findByText(/9–3–1/)).toBeInTheDocument();
    expect(screen.getByText(/4 still to be scored/)).toBeInTheDocument();
  });

  it('cannot save while signed out, and says why', async () => {
    googleAuth.getSession.mockReturnValue(null);
    ApiService.getPickemGames.mockResolvedValue(sheet([game()], { signed_in: false }));
    renderSheet();
    expect(await screen.findByText(/Sign in above to save/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save picks' })).toBeDisabled();
  });
});
