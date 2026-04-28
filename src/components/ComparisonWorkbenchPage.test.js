import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComparisonWorkbenchPage from './ComparisonWorkbenchPage';
import apiService from '../services/api';

jest.mock('recharts', () => {
  const React = require('react');
  const Mock = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    RadarChart: Mock,
    Radar: Mock,
    PolarGrid: Mock,
    PolarAngleAxis: Mock,
    PolarRadiusAxis: Mock,
    Legend: Mock,
    Tooltip: Mock,
    BarChart: Mock,
    Bar: Mock,
    CartesianGrid: Mock,
    XAxis: Mock,
    YAxis: Mock,
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPlayerBatting: jest.fn(),
    getPlayerPitching: jest.fn(),
    getTeamBatting: jest.fn(),
    getTeamPitching: jest.fn(),
  },
}));

const currentBattingRows = [
  { playerId: 1, Name: 'Shohei Ohtani', Team: 'LAD', OPS: '1.050', AVG: '.320', OBP: '.420', SLG: '.630', HR: 44, RBI: 98, SB: 28, BB: 88 },
  { playerId: 2, Name: 'Juan Soto', Team: 'NYY', OPS: '.980', AVG: '.305', OBP: '.415', SLG: '.565', HR: 36, RBI: 101, SB: 8, BB: 120 },
  { playerId: 3, Name: 'Mookie Betts', Team: 'LAD', OPS: '.930', AVG: '.295', OBP: '.390', SLG: '.540', HR: 31, RBI: 84, SB: 14, BB: 74 },
];

const previousBattingRows = [
  { playerId: 1, Name: 'Shohei Ohtani', Team: 'LAD', OPS: '.999', AVG: '.305', OBP: '.401', SLG: '.598', HR: 40, RBI: 95, SB: 24, BB: 81 },
  { playerId: 2, Name: 'Juan Soto', Team: 'NYY', OPS: '.965', AVG: '.299', OBP: '.410', SLG: '.555', HR: 35, RBI: 97, SB: 9, BB: 114 },
  { playerId: 3, Name: 'Mookie Betts', Team: 'LAD', OPS: '.910', AVG: '.288', OBP: '.377', SLG: '.525', HR: 28, RBI: 79, SB: 13, BB: 69 },
];

describe('ComparisonWorkbenchPage', () => {
  beforeEach(() => {
    apiService.getPlayerBatting.mockImplementation((year) =>
      Promise.resolve(year === 2025 ? currentBattingRows : previousBattingRows)
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders player workbench analytics with selected entities', async () => {
    render(
      <MemoryRouter initialEntries={['/comparison-workbench?entityType=player&group=hitting&season=2025&ids=1,2&focus=1&q=Shohei']}>
        <ComparisonWorkbenchPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/comparison workbench/i)).toBeInTheDocument();
    expect(await screen.findByText(/league-relative detail/i)).toBeInTheDocument();
    expect(screen.getAllByText('Shohei Ohtani').length).toBeGreaterThan(0);
    expect(screen.getByText(/closest comps/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiService.getPlayerBatting).toHaveBeenCalledWith(2025, { limit: 1000 });
      expect(apiService.getPlayerBatting).toHaveBeenCalledWith(2024, { limit: 1000 });
    });
  });
});
