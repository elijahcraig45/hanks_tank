import { render, screen, within } from '@testing-library/react';
import ModelRows from './ModelRows';
import { modelRowsFor } from '../../utils/unifiedPredictions';
import { countDist } from '../../services/predictionMocks';

const models = [
  { key: 'v10', label: 'V10', role: 'production', available: true, learn: '/learn/mlb-v10-features.html' },
  { key: 'logit3', label: 'Logit-3', role: 'shadow', available: true },
  { key: 'sim_blend', label: 'Sim blend', role: 'shadow', available: true },
  { key: 'market', label: 'Market', role: 'benchmark', available: false },
];
const game = {
  game_id: '1',
  home: { abbr: 'ATL', name: 'Atlanta Braves' },
  away: { abbr: 'NYM', name: 'New York Mets' },
  predictions: {
    v10: { home_win_prob: 0.56, pregame: true, predicted_at: '2026-09-26T21:30:00Z' },
    logit3: { home_win_prob: 0.58, pregame: false, predicted_at: '2026-09-26T23:30:00Z' },
    sim_blend: null,
    market: null,
  },
};

function renderRows(g = game, onOpenDetail) {
  return render(
    <ModelRows rows={modelRowsFor(g, models)} game={g} sport="mlb" featured="v10" onOpenDetail={onOpenDetail} />,
  );
}

test('renders a row for every model, including missing and unavailable ones', () => {
  renderRows();
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  const sim = screen.getByTestId('model-row-sim_blend');
  expect(sim).toHaveAttribute('data-state', 'none');
  expect(within(sim).getByText('—')).toBeInTheDocument();
  expect(within(sim).getByTitle(/has no prediction stored for this game/)).toBeInTheDocument();
  const market = screen.getByTestId('model-row-market');
  expect(market).toHaveAttribute('data-state', 'unavailable');
  expect(within(market).getByText('not available yet')).toBeInTheDocument();
  expect(within(market).getByTitle(/is not available/)).toBeInTheDocument();
});

test('marks the featured model, pregame rows and post-start rows', () => {
  renderRows();
  const v10 = screen.getByTestId('model-row-v10');
  expect(within(v10).getByLabelText('Featured')).toBeInTheDocument();
  expect(within(v10).getByText('pregame')).toBeInTheDocument();
  expect(within(v10).getByText(/Atlanta Braves 56% to win/)).toBeInTheDocument();
  expect(within(screen.getByTestId('model-row-logit3')).getByText('after start')).toBeInTheDocument();
});

test('shows expected score and total for a simulator, with a link to its ranges', () => {
  const onOpen = jest.fn();
  const g = {
    ...game,
    predictions: {
      ...game.predictions,
      sim_blend: {
        home_win_prob: 0.57, pregame: true,
        home_score: countDist(4.6, 2.9), away_score: countDist(4.1, 2.8), total: countDist(8.7, 4.1), margin: countDist(0.5, 4, 3000, { floor: -99 }),
      },
    },
  };
  renderRows(g, onOpen);
  const sim = screen.getByTestId('model-row-sim_blend');
  expect(within(sim).getByText('NYM 4.1–4.6 ATL')).toBeInTheDocument();
  expect(within(sim).getByText('Total 8.7')).toBeInTheDocument();
  within(sim).getByRole('button', { name: 'ranges' }).click();
  expect(onOpen).toHaveBeenCalledWith('sim_blend');
});

test('football margins read as "TEAM by N"', () => {
  const g = {
    ...game,
    predictions: { v10: { home_win_prob: 0.4, pregame: true, margin: { mean: -3.5 } } },
  };
  render(<ModelRows rows={modelRowsFor(g, models.slice(0, 1))} game={g} sport="nfl" featured="v10" />);
  expect(screen.getByText('NYM by 3.5')).toBeInTheDocument();
});
