import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatcastLabPage from './StatcastLabPage';
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
    LineChart: Mock,
    Line: Mock,
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPlayerBatting: jest.fn(),
    getPlayerPitching: jest.fn(),
    getStatcast: jest.fn(),
  },
}));

describe('StatcastLabPage', () => {
  beforeEach(() => {
    apiService.getPlayerBatting.mockResolvedValue([
      { playerId: 660271, Name: 'Shohei Ohtani', Team: 'LAD' },
    ]);
    apiService.getStatcast.mockResolvedValue([
      {
        game_date: '2025-04-01',
        pitch_name: 'Four-Seam Fastball',
        release_speed: '98.4',
        release_spin_rate: '2420',
        launch_speed: '104.2',
        plate_x: '0.12',
        plate_z: '2.78',
        description: 'swinging_strike',
        events: 'strikeout',
        p_throws: 'R',
        stand: 'L',
      },
      {
        game_date: '2025-04-03',
        pitch_name: 'Sweeper',
        release_speed: '86.8',
        release_spin_rate: '2650',
        launch_speed: '91.1',
        plate_x: '-0.33',
        plate_z: '2.14',
        description: 'called_strike',
        events: 'field_out',
        p_throws: 'R',
        stand: 'L',
      },
    ]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders player statcast analytics for a selected query', async () => {
    render(
      <MemoryRouter initialEntries={['/statcast-lab?position=batter&season=2025&playerId=660271&q=Shohei']}>
        <StatcastLabPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/statcast lab/i)).toBeInTheDocument();
    expect((await screen.findAllByText('Four-Seam Fastball')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shohei Ohtani').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pitch mix/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(apiService.getStatcast).toHaveBeenCalledWith(2025, {
        playerId: 660271,
        position: 'batter',
        limit: 1500,
      });
    });
  });
});
