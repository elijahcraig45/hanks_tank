import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResearchWorkflowPage from './ResearchWorkflowPage';
import apiService from '../services/api';
import { STORAGE_KEY } from '../utils/recentViews';
import { SAVED_RESEARCH_VIEWS_KEY, RESEARCH_WATCHLIST_KEY } from '../utils/researchWorkspace';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPlayerBatting: jest.fn(),
    getPlayerPitching: jest.fn(),
  },
}));

describe('ResearchWorkflowPage', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ path: '/prediction-diagnostics', label: 'Prediction Diagnostics', hint: 'Model audit view', icon: '📊' }])
    );
    window.localStorage.setItem(
      SAVED_RESEARCH_VIEWS_KEY,
      JSON.stringify([{ id: '/split-explorer', path: '/split-explorer', label: 'Split Explorer', hint: 'Context splits', category: 'analytics', savedAt: '2026-04-28T12:00:00.000Z' }])
    );
    window.localStorage.setItem(
      RESEARCH_WATCHLIST_KEY,
      JSON.stringify([{ id: 'team:ATL', type: 'team', label: 'Atlanta Braves', subtitle: 'ATL', path: '/team/ATL', savedAt: '2026-04-28T12:00:00.000Z' }])
    );

    apiService.getPlayerBatting.mockResolvedValue([{ playerId: 660271, Name: 'Shohei Ohtani', Team: 'LAD' }]);
    apiService.getPlayerPitching.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  test('renders saved views and watchlist workflow surfaces', async () => {
    render(
      <MemoryRouter initialEntries={['/research-workflow']}>
        <ResearchWorkflowPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/research workflow/i)).toBeInTheDocument();
    expect(await screen.findByText('Split Explorer')).toBeInTheDocument();
    expect(screen.getAllByText('Atlanta Braves').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(apiService.getPlayerBatting).toHaveBeenCalled();
    });
  });
});
