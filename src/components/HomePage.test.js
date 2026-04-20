import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import apiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getMLBNews: jest.fn(),
    getBravesNews: jest.fn(),
    getStandings: jest.fn(),
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

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        dates: [
          {
            games: [],
          },
        ],
      }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
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
    });

    expect(await screen.findByText('League headline')).toBeInTheDocument();
    expect(await screen.findByText('Braves headline')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1'
    );
  });
});
