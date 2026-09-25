import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage, { fbsOnlyRecord } from './HomePage';
import apiService from '../services/api';
import { STORAGE_KEY } from '../utils/recentViews';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getMLBNews: jest.fn(),
    getBravesNews: jest.fn(),
    getStandings: jest.fn(),
    getGames: jest.fn(),
    getPredictionDiagnostics: jest.fn(),
    getPredictions: jest.fn(),
    getFootballPredictions: jest.fn(),
    getFootballRankings: jest.fn(),
    getFootballAccuracy: jest.fn(),
    getFootballDiagnostics: jest.fn(),
    refreshNews: jest.fn(),
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    apiService.getMLBNews.mockResolvedValue({
      articles: [
        {
          title: 'League headline',
          url: 'https://example.com/mlb',
          source: { name: 'MLB Wire' },
          publishedAt: '2026-04-20T10:00:00Z',
        },
      ],
    });

    apiService.getBravesNews.mockResolvedValue({
      articles: [
        {
          title: 'Braves headline',
          url: 'https://example.com/braves',
          source: { name: 'Braves Beat' },
          publishedAt: '2026-04-20T09:00:00Z',
        },
      ],
    });

    apiService.getStandings.mockResolvedValue({
      data: {
        standings: {
          records: [],
        },
      },
    });
    apiService.getGames.mockResolvedValue({
      dates: [
        {
          games: [],
        },
      ],
    });
    apiService.getPredictions.mockResolvedValue({ predictions: [] });
    apiService.getFootballPredictions.mockResolvedValue({ data: [] });
    apiService.getFootballRankings.mockResolvedValue({ data: [] });
    apiService.getPredictionDiagnostics.mockResolvedValue({
      diagnostics: [
        {
          gameDate: '2026-04-19',
          confidenceTier: 'HIGH',
          correct: true,
          edge: 0.12,
          predictedWinProbability: 0.68,
          brierScore: 0.1024,
          logLoss: 0.3857,
          lineupConfirmed: true,
        },
        {
          gameDate: '2026-04-20',
          confidenceTier: 'LOW',
          correct: false,
          edge: -0.03,
          predictedWinProbability: 0.52,
          brierScore: 0.2704,
          logLoss: 0.734,
          lineupConfirmed: false,
        },
      ],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  test('loads homepage news through the api service', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiService.getMLBNews).toHaveBeenCalledTimes(1);
      expect(apiService.getBravesNews).toHaveBeenCalledTimes(1);
      expect(apiService.getGames).toHaveBeenCalledTimes(1);
      expect(apiService.getPredictionDiagnostics).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('League headline')).toBeInTheDocument();
    expect(await screen.findByText('Braves headline')).toBeInTheDocument();
    // The MLB model record appears on its sport card and in the scoreboard.
    expect(screen.getAllByText('50.0%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Model · 30d')).toBeInTheDocument();
    expect(screen.getByText(/High-confidence picks 100\.0% \(n=1\)/)).toBeInTheDocument();
    // Three sports, each with its own card.
    ['MLB', 'NFL', 'College football'].forEach((name) => {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    });
  });

  test('ranks football and baseball picks on one board', async () => {
    apiService.getPredictions.mockResolvedValue({
      predictions: [
        {
          game_pk: 1,
          home_team_name: 'Atlanta Braves',
          away_team_name: 'New York Mets',
          home_win_probability: 0.55,
          confidence_tier: 'low',
          predicted_winner: 'Atlanta Braves',
          game_date: '2026-08-31',
        },
      ],
    });
    // Only NFL has a game, so the board has exactly one pick per sport.
    apiService.getFootballPredictions.mockImplementation((sport) =>
      Promise.resolve({
        data:
          sport === 'nfl'
            ? [
                {
                  game_id: 'g1',
                  week: 1,
                  home_team_name: 'SEA',
                  away_team_name: 'NE',
                  home_win_probability: 0.84,
                  confidence_tier: 'high',
                  predicted_winner: 'SEA',
                  game_date: new Date(Date.now() + 86400000).toISOString(),
                },
              ]
            : [],
      })
    );

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Model's best picks")).toBeInTheDocument();
    const picks = document.querySelectorAll('.pick');
    // High-confidence football outranks a low-confidence baseball pick.
    expect(picks[0]).toHaveClass('pick--nfl');
    expect(picks[1]).toHaveClass('pick--mlb');
  });

  test('shows recent views shortcuts when present', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          path: '/team/BOS',
          label: 'BOS Team',
          hint: 'Club dashboard',
          icon: '🏟️',
          visitedAt: new Date().toISOString(),
        },
      ])
    );

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/continue where you left off/i)).toBeInTheDocument();
    expect(screen.getByText('BOS Team')).toBeInTheDocument();
    expect(screen.getByText('Club dashboard')).toBeInTheDocument();
  });
});

describe('college football card accuracy', () => {
  const game = (crossDivision, correct) => ({ crossDivision, correct });

  test('fbsOnlyRecord scores only FBS v FBS games', () => {
    const rows = [
      game(false, true), game(false, false), game(false, true), game(false, true),
      game(true, true), game(true, true), game(true, true),
    ];
    const rec = fbsOnlyRecord(rows);
    expect(rec.n).toBe(4);
    expect(rec.accuracy).toBeCloseTo(0.75);
    expect(rec.ci).toBeCloseTo(1.96 * Math.sqrt((0.75 * 0.25) / 4));
  });

  test('fbsOnlyRecord refuses to guess when the flag is missing', () => {
    expect(fbsOnlyRecord(null)).toBeNull();
    expect(fbsOnlyRecord([])).toBeNull();
    expect(fbsOnlyRecord([game(false, true), { correct: true }])).toBeNull();
    expect(fbsOnlyRecord([game(true, true)])).toBeNull();
  });

  function mockHomeBasics() {
    apiService.getMLBNews.mockResolvedValue({ articles: [] });
    apiService.getBravesNews.mockResolvedValue({ articles: [] });
    apiService.getStandings.mockResolvedValue({ data: { standings: { records: [] } } });
    apiService.getGames.mockResolvedValue({ dates: [{ games: [] }] });
    apiService.getPredictions.mockResolvedValue({ predictions: [] });
    apiService.getFootballPredictions.mockResolvedValue({ data: [] });
    apiService.getFootballRankings.mockResolvedValue({ data: [] });
    apiService.getPredictionDiagnostics.mockResolvedValue({ diagnostics: [] });
    apiService.getFootballAccuracy.mockImplementation((sport) => Promise.resolve(
      sport === 'cfb'
        ? { data: { overall: { games: 10, model_accuracy: 0.9 } } }
        : { data: null }
    ));
  }

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  const cfbCard = () => screen.getByRole('heading', { name: 'College football' }).closest('section');

  test('headlines FBS v FBS with its interval and n, and shows all games second', async () => {
    mockHomeBasics();
    apiService.getFootballDiagnostics.mockResolvedValue({
      diagnostics: [
        game(false, true), game(false, true), game(false, true), game(false, false),
        ...Array.from({ length: 6 }, () => game(true, true)),
      ],
    });
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'College football' });
    const card = cfbCard();
    expect(card).toHaveTextContent(/Model · FBS\sv\sFBS/);
    expect(card).toHaveTextContent('75.0%');
    expect(card).toHaveTextContent('±42');
    expect(card).toHaveTextContent('4 games');
    expect(card).toHaveTextContent('All games 90.0% (n=10) incl. FCS');
    expect(apiService.getFootballDiagnostics).toHaveBeenCalledWith(
      'cfb', expect.objectContaining({ division: 'fbs' })
    );
  });

  test('falls back to all games with an explicit caveat when the split is unavailable', async () => {
    mockHomeBasics();
    apiService.getFootballDiagnostics.mockResolvedValue(null);
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'College football' });
    const card = cfbCard();
    expect(card).toHaveTextContent('Model · season');
    expect(card).toHaveTextContent('90.0%');
    expect(card).toHaveTextContent('Includes FCS opponents');
    expect(card).not.toHaveTextContent('FBS v FBS');
  });
});
