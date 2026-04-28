import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScenarioSimulatorPage from './ScenarioSimulatorPage';
import apiService from '../services/api';

jest.mock('recharts', () => {
  const React = require('react');
  const Mock = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    BarChart: Mock,
    Bar: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
    XAxis: Mock,
    YAxis: Mock,
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPredictions: jest.fn(),
  },
}));

describe('ScenarioSimulatorPage', () => {
  beforeEach(() => {
    apiService.getPredictions.mockResolvedValue({
      predictions: [
        {
          game_pk: 12345,
          away_team_name: 'New York Yankees',
          home_team_name: 'Boston Red Sox',
          away_starter_name: 'Gerrit Cole',
          home_starter_name: 'Garrett Crochet',
          home_win_probability: 0.57,
          away_win_probability: 0.43,
          predicted_winner: 'Boston Red Sox',
          confidence_tier: 'MEDIUM',
          lineup_confirmed: true,
          sp_quality_composite_diff: 0.8,
          home_lineup_woba_vs_hand: 0.351,
          away_lineup_woba_vs_hand: 0.338,
          bullpen_fatigue_differential: -0.2,
          elo_home_win_prob: 0.54,
          venue_woba_differential: 0.012,
        },
      ],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders matchup controls and scenario summaries', async () => {
    render(
      <MemoryRouter initialEntries={['/scenario-simulator?date=2025-06-01&gamePk=12345&sims=5000']}>
        <ScenarioSimulatorPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/scenario simulator/i)).toBeInTheDocument();
    expect(await screen.findByText(/scenario adjustments/i)).toBeInTheDocument();
    expect(screen.getByText(/win distribution/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiService.getPredictions).toHaveBeenCalledWith('2025-06-01');
    });
  });
});
