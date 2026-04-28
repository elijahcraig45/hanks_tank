import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PredictionDiagnosticsPage from './PredictionDiagnosticsPage';
import apiService from '../services/api';

jest.mock('recharts', () => {
  const React = require('react');
  const Mock = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    Line: Mock,
    BarChart: Mock,
    Bar: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Legend: Mock,
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPredictionDiagnostics: jest.fn(),
  },
}));

const diagnosticsPayload = {
  diagnostics: [
    {
      gamePk: 824776,
      gameDate: '2026-04-20',
      awayTeamName: 'Detroit Tigers',
      homeTeamName: 'Boston Red Sox',
      awayStarterName: 'Jack Flaherty',
      homeStarterName: 'Sonny Gray',
      predictedWinner: 'Detroit Tigers',
      actualWinner: 'Detroit Tigers',
      confidenceTier: 'HIGH',
      modelVersion: 'v10',
      lineupConfirmed: true,
      predictedWinProbability: 0.64,
      edge: 0.28,
      correct: true,
      brierScore: 0.1296,
      logLoss: 0.4463,
      awayScore: 5,
      homeScore: 3,
    },
    {
      gamePk: 824777,
      gameDate: '2026-04-21',
      awayTeamName: 'Houston Astros',
      homeTeamName: 'Cleveland Guardians',
      awayStarterName: 'Framber Valdez',
      homeStarterName: 'Tanner Bibee',
      predictedWinner: 'Cleveland Guardians',
      actualWinner: 'Houston Astros',
      confidenceTier: 'MEDIUM',
      modelVersion: 'v10',
      lineupConfirmed: false,
      predictedWinProbability: 0.58,
      edge: 0.16,
      correct: false,
      brierScore: 0.3364,
      logLoss: 0.8675,
      awayScore: 6,
      homeScore: 2,
    },
  ],
};

describe('PredictionDiagnosticsPage', () => {
  beforeEach(() => {
    apiService.getPredictionDiagnostics.mockResolvedValue(diagnosticsPayload);
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders diagnostics summary and review rows', async () => {
    render(
      <MemoryRouter>
        <PredictionDiagnosticsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/prediction diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('50.0%').length).toBeGreaterThan(0);
    expect(screen.getByText(/Detroit Tigers @ Boston Red Sox/i)).toBeInTheDocument();
    expect(screen.getByText(/Houston Astros @ Cleveland Guardians/i)).toBeInTheDocument();
  });

  test('filters review rows by confidence tier', async () => {
    render(
      <MemoryRouter>
        <PredictionDiagnosticsPage />
      </MemoryRouter>
    );

    await screen.findByText(/Detroit Tigers @ Boston Red Sox/i);

    fireEvent.change(screen.getByLabelText(/confidence/i), {
      target: { value: 'HIGH' },
    });

    await waitFor(() => {
      expect(screen.queryByText(/Houston Astros @ Cleveland Guardians/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Detroit Tigers @ Boston Red Sox/i)).toBeInTheDocument();
  });
});
