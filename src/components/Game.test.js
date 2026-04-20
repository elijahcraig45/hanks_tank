import { render, screen, waitFor } from '@testing-library/react';
import GameDetailsPage from './Game';
import apiService from '../services/api';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ gamePk: '824776' }),
}));

jest.mock('./LiveGameStrikeZone', () => () => <div>StrikeZone</div>);
jest.mock('./BoxScore', () => () => <div>BoxScore</div>);
jest.mock('./ScoutingReport', () => ({ report }) => (
  <div data-testid="scouting-report">
    {report?.prediction?.predicted_winner || report?.predicted_winner || 'report'}
  </div>
));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPredictions: jest.fn(),
    getScoutingReportByGame: jest.fn(),
  },
}));

const mockGameDetails = {
  gameData: {
    teams: {
      away: { abbreviation: 'DET', name: 'Detroit Tigers', teamName: 'Tigers' },
      home: { abbreviation: 'BOS', name: 'Boston Red Sox', teamName: 'Red Sox' },
    },
    status: {
      abstractGameState: 'Live',
      detailedState: 'In Progress',
    },
    datetime: {
      dateTime: '2026-04-20T15:10:00Z',
    },
    venue: {
      name: 'Fenway Park',
    },
    weather: {
      condition: 'Partly Cloudy',
      temp: 47,
      wind: '9 mph, Out To RF',
    },
    probablePitchers: {},
  },
  liveData: {
    linescore: {},
    plays: {
      allPlays: [],
    },
    boxscore: {
      teams: {
        away: { players: {}, batters: [], pitchers: [] },
        home: { players: {}, batters: [], pitchers: [] },
      },
    },
  },
};

const mockPrediction = {
  game_pk: 824776,
  confidence_tier: 'LOW',
  predicted_winner: 'Detroit Tigers',
  away_team_name: 'Detroit Tigers',
  home_team_name: 'Boston Red Sox',
  away_win_probability: 0.55,
  home_win_probability: 0.45,
};

describe('GameDetailsPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGameDetails,
    });
    apiService.getPredictions.mockResolvedValue({ predictions: [mockPrediction] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders a scouting report for a live game when one exists', async () => {
    apiService.getScoutingReportByGame.mockResolvedValue({
      report: JSON.stringify({
        prediction: {
          predicted_winner: 'Detroit Tigers',
        },
      }),
    });

    render(<GameDetailsPage />);

    await waitFor(() => {
      expect(apiService.getScoutingReportByGame).toHaveBeenCalledWith('824776');
    });

    expect(await screen.findByText(/scouting report/i)).toBeInTheDocument();
    expect(screen.getByTestId('scouting-report')).toHaveTextContent('Detroit Tigers');
    expect(
      screen.queryByText(/full pregame scouting detail is not available/i)
    ).not.toBeInTheDocument();
  });

  test('falls back to model outlook when no scouting report exists', async () => {
    apiService.getScoutingReportByGame.mockRejectedValue(new Error('Resource not found'));

    render(<GameDetailsPage />);

    await waitFor(() => {
      expect(apiService.getScoutingReportByGame).toHaveBeenCalledWith('824776');
    });

    expect(await screen.findByText(/model outlook/i)).toBeInTheDocument();
    expect(screen.getByText(/full pregame scouting detail is not available/i)).toBeInTheDocument();
  });
});
