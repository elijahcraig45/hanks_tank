/**
 * Tests for the football game page.
 *
 * The behaviour worth pinning is partial coverage. A game can arrive with a
 * win-probability curve and no box score — the upstream box-score feed needs a week that
 * a new fixture has not been recorded with yet — so the page must render what it has and
 * say why the rest is absent, using the API's reason rather than a guess of its own.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FootballGamePage from './FootballGamePage';
import ApiService from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getFootballGame: jest.fn() },
}));

// Recharts needs layout; the MLB chart tests mock it the same way.
jest.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    AreaChart: Stub, Area: Stub, LineChart: Stub, Line: Stub,
    XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub,
    ReferenceLine: Stub, ResponsiveContainer: Stub,
  };
});

const game = (over = {}) => ({
  game_id: '401856766',
  status: 'completed',
  start_date: '2026-08-29T16:00:00.000Z',
  tv: 'ESPN',
  venue: { name: 'Aviva Stadium', city: 'Dublin', state: '' },
  weather: { temperature: 63.7, description: 'Overcast' },
  last_play: 'End of 4th quarter.',
  neutral_site: true,
  home: { name: 'TCU Horned Frogs', points: 10, line_scores: [10, 0, 0, 0] },
  away: { name: 'North Carolina Tar Heels', points: 15, line_scores: [10, 2, 3, 0] },
  ...over,
});

const payload = (over = {}) => ({
  success: true,
  data: {
    game: game(),
    win_probability: [
      { playNumber: 0, homeWinProbability: 0.59, playText: 'Kickoff' },
      { playNumber: 1, homeWinProbability: 0.62, playText: 'Pass complete' },
    ],
    drives: [{
      id: 1, driveNumber: 1, offense: 'TCU', isHomeOffense: true,
      startYardsToGoal: 75, endYardsToGoal: 40, yards: 35, plays: 6,
      driveResult: 'PUNT',
    }],
    team_box: [{ id: 401856766, teams: [
      { team: 'TCU', points: 10, stats: [{ category: 'totalYards', stat: '312' }] },
      { team: 'North Carolina', points: 15, stats: [{ category: 'totalYards', stat: '401' }] },
    ] }],
    player_box: [{ id: 401856766, teams: [
      { team: 'TCU', categories: [
        { name: 'passing', types: [
          { name: 'YDS', athletes: [{ id: 'a1', name: 'B. Edwards Jr.', stat: '212' }] },
        ] },
      ] },
    ] }],
    prediction: {
      home_team_name: 'TCU Horned Frogs',
      predicted_winner: 'TCU Horned Frogs',
      home_win_probability: 0.61,
      confidence_tier: 'medium',
      model_version: 'cfb_v1',
      prediction_correct: false,
    },
    ...(over.data || {}),
  },
  meta: {
    sport: 'cfb', season: 2026, game_id: '401856766', week: 1, completed: true,
    available: ['win_probability', 'drives', 'team_box', 'player_box', 'prediction'],
    missing: ['live_plays'],
    ...(over.meta || {}),
  },
});

function renderGame() {
  return render(
    <MemoryRouter initialEntries={['/football/fbs/game/401856766?season=2026']}>
      <Routes>
        <Route path="/football/:league/game/:gameId" element={<FootballGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('football game page', () => {
  it('renders the score, venue and linescore', async () => {
    ApiService.getFootballGame.mockResolvedValue(payload());
    renderGame();

    await waitFor(() => {
      expect(screen.getAllByText('TCU Horned Frogs').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText(/Aviva Stadium/)).toBeInTheDocument();
    // linescore quarters
    expect(screen.getByRole('columnheader', { name: 'Q1' })).toBeInTheDocument();
  });

  it('shows both teams in the win-probability legend, not colour alone', async () => {
    ApiService.getFootballGame.mockResolvedValue(payload());
    renderGame();
    await waitFor(() => {
      expect(screen.getByText('Win probability')).toBeInTheDocument();
    });
    // Two complementary bands, so both closing percentages are named.
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('38%')).toBeInTheDocument();
  });

  it("shows the model's own pick and whether it landed", async () => {
    ApiService.getFootballGame.mockResolvedValue(payload());
    renderGame();
    await waitFor(() => {
      expect(screen.getByText(/Picked/)).toBeInTheDocument();
    });
    expect(screen.getByText('✗ missed')).toBeInTheDocument();
  });

  it('draws the drive chart with a legend, so colour is not the only cue', async () => {
    ApiService.getFootballGame.mockResolvedValue(payload());
    renderGame();
    await waitFor(() => expect(screen.getByText('Drives')).toBeInTheDocument());
    expect(screen.getByText('PUNT')).toBeInTheDocument();
    // Two series -> a legend naming both is always present.
    const legendKeys = screen.getAllByText('TCU Horned Frogs');
    expect(legendKeys.length).toBeGreaterThan(1);
  });

  it('renders the panels it has and explains the ones it does not', async () => {
    ApiService.getFootballGame.mockResolvedValue(payload({
      data: { team_box: null, player_box: null },
      meta: {
        week: null,
        available: ['win_probability', 'drives', 'prediction'],
        missing: ['team_box', 'player_box', 'live_plays'],
        notes: {
          team_box: "Cannot load the team box score without knowing the game's week.",
          player_box: "Cannot load the player box score without knowing the game's week.",
        },
      },
    }));
    renderGame();

    await waitFor(() => expect(screen.getByText('Drives')).toBeInTheDocument());
    // The API's reason, verbatim — not a sentence invented here.
    expect(
      screen.getByText(/Cannot load the team box score without knowing/),
    ).toBeInTheDocument();
    // And what it does have is still drawn.
    expect(screen.getByText('PUNT')).toBeInTheDocument();
  });

  it('reports a league with no live feed rather than an empty page', async () => {
    ApiService.getFootballGame.mockResolvedValue({
      success: true,
      data: { game: null },
      meta: {
        sport: 'nfl', available: [], missing: [],
        note: 'Live game detail is college-only for now.',
      },
    });
    renderGame();
    await waitFor(() => {
      expect(screen.getByText('Not available for this league')).toBeInTheDocument();
    });
    expect(screen.getByText(/college-only/)).toBeInTheDocument();
  });

  it('offers a way back when the game cannot be loaded', async () => {
    ApiService.getFootballGame.mockRejectedValue(new Error('nope'));
    renderGame();
    await waitFor(() => {
      expect(screen.getByText('Could not load this game')).toBeInTheDocument();
    });
    expect(screen.getByText('Back to the scoreboard')).toBeInTheDocument();
  });
});
