import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PredictionsPage from './PredictionsPage';
import apiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPredictions: jest.fn(),
    getGames: jest.fn(),
  },
}));

const mockPrediction = {
  game_pk: 824776,
  model_version: 'v10',
  confidence_tier: 'LOW',
  lineup_confirmed: true,
  predicted_winner: 'Boston Red Sox',
  away_team_name: 'Detroit Tigers',
  home_team_name: 'Boston Red Sox',
  away_win_probability: 0.43,
  home_win_probability: 0.57,
  away_starter_name: 'Jack Flaherty',
  away_starter_hand: 'R',
  home_starter_name: 'Sonny Gray',
  home_starter_hand: 'R',
};

const mockSchedule = {
  dates: [
    {
      games: [
        {
          gamePk: 824776,
          teams: {
            away: { team: { id: 116 }, leagueRecord: { wins: 12, losses: 10 } },
            home: { team: { id: 111 }, leagueRecord: { wins: 8, losses: 13 } },
          },
        },
      ],
    },
  ],
};

function renderPredictionsPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PredictionsPage />
    </MemoryRouter>
  );
}

describe('PredictionsPage', () => {
  beforeEach(() => {
    apiService.getPredictions.mockResolvedValue({ predictions: [mockPrediction] });
    apiService.getGames.mockResolvedValue(mockSchedule);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('uses singular summary copy and points to the game center route', async () => {
    renderPredictionsPage();

    await waitFor(() => {
      expect(screen.getByText('1 game')).toBeInTheDocument();
    });

    expect(screen.getByText('1 confirmed lineup')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open game center/i })).toHaveAttribute(
      'href',
      '/game/824776'
    );
  });
});
