import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UnifiedSlatePage from './UnifiedSlatePage';
import apiService from '../../services/api';
import { mockSlate } from '../../services/predictionMocks';

jest.mock('../../services/api', () => ({
  __esModule: true,
  API_BASE_URL: 'http://api.test/api',
  default: {
    getPredictionsSlate: jest.fn(),
    getPlayerProjections: jest.fn(),
    getPredictions: jest.fn(),
  },
}));

const slate = mockSlate('mlb', { date: '2026-09-26' });

function renderPage(path = '/mlb/predictions?date=2026-09-26') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes><Route path="/mlb/predictions" element={<UnifiedSlatePage sport="mlb" />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  apiService.getPredictionsSlate.mockResolvedValue(slate);
  apiService.getPredictions.mockResolvedValue({ predictions: [] });
  apiService.getPlayerProjections.mockResolvedValue({ available: true, rows: [] });
});

test('shows every game with every model and the production model featured by default', async () => {
  renderPage();
  const cards = await screen.findAllByTestId('game-card');
  expect(cards).toHaveLength(slate.games.length);
  expect(within(cards[0]).getAllByRole('listitem')).toHaveLength(slate.models.length);
  expect(screen.getByLabelText('Featured model')).toHaveValue('v10');
  expect(within(cards[0]).getByText('V10 picks')).toBeInTheDocument();
  expect(apiService.getPredictionsSlate).toHaveBeenCalledWith('mlb', { date: '2026-09-26' });
});

test('the featured-model selector drives the headline pick; unavailable models cannot be featured', async () => {
  renderPage();
  await screen.findAllByTestId('game-card');
  const select = screen.getByLabelText('Featured model');
  expect(within(select).getByRole('option', { name: /Market — not available/ })).toBeDisabled();
  fireEvent.change(select, { target: { value: 'sim_blend' } });
  const cards = screen.getAllByTestId('game-card');
  expect(within(cards[0]).getByText('Sim blend picks')).toBeInTheDocument();
  // The game with no sim row says so instead of borrowing another model's pick.
  const noSim = cards.find((c) => within(c).queryByText(/Sim blend has no pick/));
  expect(noSim).toBeTruthy();
});

test('the model filter hides a model from every card', async () => {
  renderPage();
  await screen.findAllByTestId('game-card');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Elo' }));
  screen.getAllByTestId('game-card').forEach((c) => {
    expect(within(c).queryByTestId('model-row-elo')).toBeNull();
    expect(within(c).getByTestId('model-row-v10')).toBeInTheDocument();
  });
});

test('export links call the slate endpoint with the page date', async () => {
  renderPage();
  await screen.findAllByTestId('game-card');
  expect(screen.getByTestId('export-slate-csv'))
    .toHaveAttribute('href', 'http://api.test/api/predictions/mlb/slate?date=2026-09-26&format=csv');
  expect(screen.getByTestId('export-slate-json'))
    .toHaveAttribute('href', 'http://api.test/api/predictions/mlb/slate?date=2026-09-26&format=json');
  expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
});

test('opens the simulation detail from a card', async () => {
  renderPage();
  const cards = await screen.findAllByTestId('game-card');
  fireEvent.click(within(cards[0]).getByRole('button', { name: /simulation: scores & ranges/i }));
  const detail = within(cards[0]).getByTestId('sim-detail');
  expect(within(detail).getAllByTestId('range-bar').length).toBeGreaterThanOrEqual(4);
  expect(within(detail).getByText(/Over \/ under by total line/)).toBeInTheDocument();
  expect(within(detail).getByText(/Extra innings/)).toBeInTheDocument();
});

test('sorting by disagreement puts the widest spread first', async () => {
  renderPage('/mlb/predictions?date=2026-09-26&sort=disagreement');
  const cards = await screen.findAllByTestId('game-card');
  const spreads = cards.map((c) => slate.games.find((g) => c.id === `game-${g.game_id}`).consensus.spread);
  expect([...spreads].sort((a, b) => b - a)).toEqual(spreads);
});
