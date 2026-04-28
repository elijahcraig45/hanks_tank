import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SplitExplorerPage from './SplitExplorerPage';
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
    Legend: Mock,
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPlayerBatting: jest.fn(),
    getPlayerPitching: jest.fn(),
    getSplits: jest.fn(),
  },
}));

const splitPayload = {
  entity: { id: 660271, fullName: 'Shohei Ohtani' },
  team: { id: 119, name: 'Los Angeles Dodgers' },
  family: { id: 'location', label: 'Home / Away' },
  baseline: {
    stat: { ops: '1.014', avg: '.282', obp: '.392', slg: '.622', homeRuns: 55, runs: 146, rbi: 102, strikeOuts: 187, baseOnBalls: 109, stolenBases: 20 },
  },
  splits: [
    {
      split: { code: 'h', description: 'Home Games' },
      stat: { ops: '1.100', avg: '.300', obp: '.420', slg: '.680', homeRuns: 30, runs: 70, rbi: 51, strikeOuts: 80, baseOnBalls: 50, stolenBases: 10 },
    },
    {
      split: { code: 'a', description: 'Away Games' },
      stat: { ops: '.930', avg: '.260', obp: '.360', slg: '.550', homeRuns: 25, runs: 76, rbi: 51, strikeOuts: 107, baseOnBalls: 59, stolenBases: 10 },
    },
  ],
};

describe('SplitExplorerPage', () => {
  beforeEach(() => {
    apiService.getPlayerBatting.mockResolvedValue([
      { playerId: 660271, Name: 'Shohei Ohtani', Team: 'LAD' },
    ]);
    apiService.getSplits.mockResolvedValue(splitPayload);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders baseline and split rows for a selected player', async () => {
    render(
      <MemoryRouter initialEntries={['/split-explorer?entityType=player&group=hitting&season=2025&family=location&entityId=660271&q=Shohei']}>
        <SplitExplorerPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/split explorer/i)).toBeInTheDocument();
    expect(screen.getAllByText('Shohei Ohtani').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Home Games').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Away Games').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(apiService.getSplits).toHaveBeenCalledWith({
        entityType: 'player',
        entityId: 660271,
        season: 2025,
        group: 'hitting',
        family: 'location',
      });
    });
  });
});
