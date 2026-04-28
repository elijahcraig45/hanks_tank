import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import apiService from '../services/api';
import { STORAGE_KEY } from '../utils/recentViews';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getMLBNews: jest.fn(),
    getBravesNews: jest.fn(),
    getStandings: jest.fn(),
    getGames: jest.fn(),
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
    });

    expect(await screen.findByText('League headline')).toBeInTheDocument();
    expect(await screen.findByText('Braves headline')).toBeInTheDocument();
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
