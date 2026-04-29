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
    getTeamRoster: jest.fn(),
    getSplits: jest.fn(),
  },
}));

function buildRoster(prefix, startId) {
  return Array.from({ length: 10 }, (_, index) => ({
    person: {
      id: startId + index,
      fullName: `${prefix} Bat ${index + 1}`,
    },
    position: {
      abbreviation: index === 9 ? 'C' : 'OF',
    },
    status: {
      description: 'Active',
    },
  }));
}

function buildSplitResponse(seed) {
  const avg = (0.230 + seed * 0.002).toFixed(3);
  const obp = (0.305 + seed * 0.0025).toFixed(3);
  const slg = (0.385 + seed * 0.004).toFixed(3);
  const ops = (Number(obp) + Number(slg)).toFixed(3);

  return {
    baseline: {
      stat: {
        plateAppearances: 120 + seed,
        atBats: 100 + seed,
        hits: Math.round((100 + seed) * Number(avg)),
        totalBases: Math.round((100 + seed) * Number(slg)),
        homeRuns: 6 + Math.floor(seed / 2),
        strikeOuts: 18 + seed,
        baseOnBalls: 10 + Math.floor(seed / 3),
        avg,
        obp,
        slg,
        ops,
      },
    },
    splits: [
      {
        split: { code: 'vr', description: 'vs RHP' },
        stat: {
          plateAppearances: 70 + seed,
          atBats: 60 + seed,
          hits: Math.round((60 + seed) * Number(avg)),
          totalBases: Math.round((60 + seed) * Number(slg)),
          homeRuns: 4 + Math.floor(seed / 3),
          strikeOuts: 10 + seed,
          baseOnBalls: 7 + Math.floor(seed / 4),
          avg,
          obp,
          slg,
          ops,
        },
      },
      {
        split: { code: 'vl', description: 'vs LHP' },
        stat: {
          plateAppearances: 50 + seed,
          atBats: 40 + seed,
          hits: Math.round((40 + seed) * (Number(avg) + 0.01)),
          totalBases: Math.round((40 + seed) * (Number(slg) + 0.02)),
          homeRuns: 2 + Math.floor(seed / 4),
          strikeOuts: 8 + seed,
          baseOnBalls: 4 + Math.floor(seed / 5),
          avg: (Number(avg) + 0.01).toFixed(3),
          obp: (Number(obp) + 0.01).toFixed(3),
          slg: (Number(slg) + 0.02).toFixed(3),
          ops: (Number(ops) + 0.03).toFixed(3),
        },
      },
    ],
  };
}

describe('ScenarioSimulatorPage', () => {
  beforeEach(() => {
    apiService.getPredictions.mockResolvedValue({
      predictions: [
        {
          game_pk: 12345,
          home_team_id: 111,
          away_team_id: 222,
          away_team_name: 'New York Yankees',
          home_team_name: 'Boston Red Sox',
          away_starter_name: 'Gerrit Cole',
          home_starter_name: 'Garrett Crochet',
          away_starter_hand: 'R',
          home_starter_hand: 'L',
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

    apiService.getTeamRoster.mockImplementation((teamId) =>
      Promise.resolve(teamId === 111 ? buildRoster('Home', 1000) : buildRoster('Away', 2000))
    );

    apiService.getSplits.mockImplementation(({ entityId }) =>
      Promise.resolve(buildSplitResponse(Number(entityId) % 10))
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders lineup lab and player projections from roster data', async () => {
    render(
      <MemoryRouter initialEntries={['/scenario-simulator?date=2025-06-01T00:00:00.000Z&gamePk=12345&sims=5000']}>
        <ScenarioSimulatorPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/scenario simulator/i)).toBeInTheDocument();
    expect(await screen.findByText(/lineup lab/i)).toBeInTheDocument();
    expect(await screen.findByText(/player matchup projections/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiService.getPredictions).toHaveBeenCalledWith('2025-06-01');
      expect(apiService.getTeamRoster).toHaveBeenCalledWith(111, 2025);
      expect(apiService.getTeamRoster).toHaveBeenCalledWith(222, 2025);
      expect(screen.getByText(/custom lineup shift/i)).toBeInTheDocument();
    });

    expect(apiService.getSplits).toHaveBeenCalled();
    expect(screen.getAllByDisplayValue(/Home Bat/i).length).toBeGreaterThan(0);
  });
});
