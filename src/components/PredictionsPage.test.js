import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PredictionsPage, { countActiveFilters, modelVersionNote } from './PredictionsPage';
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
      '/mlb/game/824776'
    );
  });
});

describe('PredictionsPage filters on phones', () => {
  beforeEach(() => {
    apiService.getPredictions.mockResolvedValue({ predictions: [mockPrediction] });
    apiService.getGames.mockResolvedValue(mockSchedule);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const toggle = () => screen.getByRole('button', { name: /^filters/i });

  test('starts collapsed, and opens and closes the panel it controls', async () => {
    renderPredictionsPage();
    await waitFor(() => expect(screen.getByText('1 game')).toBeInTheDocument());

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(toggle().getAttribute('aria-controls'));
    expect(panel).not.toBeNull();
    // Same controls as the desktop toolbar, inside the collapsible panel.
    expect(panel).toContainElement(screen.getByLabelText('Search'));
    expect(panel).toContainElement(screen.getByLabelText('Confidence'));
    expect(panel).toContainElement(screen.getByLabelText('Sort'));

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(panel.closest('.pred-toolbar-card')).toHaveClass('pred-toolbar-card--open');

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  test('counts active filters, not the sort order, and clears them', async () => {
    renderPredictionsPage();
    await waitFor(() => expect(screen.getByText('1 game')).toBeInTheDocument());
    expect(toggle()).toHaveAccessibleName('Filters');

    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'edge' } });
    expect(toggle()).toHaveAccessibleName('Filters');
    expect(screen.getByText(/sorted by strongest edge/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Tigers' } });
    fireEvent.change(screen.getByLabelText('Confidence'), { target: { value: 'HIGH' } });
    expect(toggle()).toHaveAccessibleName('Filters, 2 active');
    // The filters still filter: the only game is LOW confidence.
    expect(screen.getByText(/no predictions match the active filters/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(toggle()).toHaveAccessibleName('Filters');
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(screen.getByLabelText('Confidence')).toHaveValue('all');
    // Clearing filters keeps the chosen sort.
    expect(screen.getByLabelText('Sort')).toHaveValue('edge');
    expect(screen.getByText('1 game')).toBeInTheDocument();
  });
});

test('countActiveFilters ignores whitespace-only search', () => {
  expect(countActiveFilters({ searchTerm: '  ', confidenceFilter: 'all', lineupOnly: false, favoritesOnly: false })).toBe(0);
  expect(countActiveFilters({ searchTerm: 'BOS', confidenceFilter: 'LOW', lineupOnly: true, favoritesOnly: true })).toBe(4);
});

describe('PredictionsPage model description', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const load = async (predictions) => {
    apiService.getPredictions.mockResolvedValue({ predictions });
    apiService.getGames.mockResolvedValue(mockSchedule);
    renderPredictionsPage();
    await waitFor(() => expect(screen.getByText('1 game')).toBeInTheDocument());
  };

  test('describes the versions it knows', () => {
    expect(modelVersionNote('v10')).toBe(' (lineup-aware matchup stack)');
    expect(modelVersionNote('V8_elo')).toBe(' (Elo + Pythagorean ensemble)');
    expect(modelVersionNote('v7')).toBe(' (pitcher-venue stacked ensemble)');
  });

  test.each([undefined, null, '', 'zeta_2027', 'v9'])('prints nothing model-specific for %p', (version) => {
    expect(modelVersionNote(version)).toBe('');
  });

  test('an unknown model_version is shown as-is, with no description', async () => {
    await load([{ ...mockPrediction, model_version: 'zeta_2027' }]);
    const head = screen.getByText(/Daily game outcome forecasts/);
    expect(head).toHaveTextContent('Daily game outcome forecasts · zeta_2027');
    expect(head.textContent).not.toMatch(/\(/);
  });

  test('v10 still gets its description', async () => {
    await load([mockPrediction]);
    expect(screen.getByText(/lineup-aware matchup stack/)).toBeInTheDocument();
  });

  test('a game whose model is hidden is listed with no numbers, pill or analysis', async () => {
    await load([{
      game_pk: 824776, hidden: true, model_version: null, confidence_tier: null,
      home_win_probability: null, away_win_probability: null, predicted_winner: null,
      lineup_confirmed: null,
      away_team_name: 'Detroit Tigers', home_team_name: 'Boston Red Sox',
    }]);
    expect(screen.getByText('Boston Red Sox')).toBeInTheDocument();
    expect(screen.getByText(/No prediction is published for this game/)).toBeInTheDocument();
    expect(screen.queryByText(/Why this prediction/)).toBeNull();
    expect(screen.queryByText('PROBABLE')).toBeNull();
    expect(screen.queryByText(/0%/)).toBeNull();
    expect(screen.getByText('Daily game outcome forecasts').tagName).toBe('P');
  });
});
