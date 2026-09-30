import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModelsPage from './ModelsPage';
import CalibrationChart, { sharedDomain } from './CalibrationChart';
import ApiService from '../../services/api';
import { MODEL_CARDS, MODEL_ORDER, resolveModels } from '../../config/modelRegistry';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getModelsCompare: jest.fn(), getMlbTotalsProps: jest.fn() },
}));

const iv = (value) => ({ value, lo: value - 0.01, hi: value + 0.01 });
const line = (model, n, ll) => ({
  model, n, log_loss: iv(ll), accuracy: iv(0.55), brier: iv(0.24),
  spread_mae: null, spread_n: 0, total_mae: null, total_n: 0, small_sample: n < 100,
});

const mlbData = {
  sport: 'mlb',
  season: 2026,
  reference: 'v10',
  models: [
    { key: 'v10', label: 'V10', role: 'production', available: true, rows: 80 },
    { key: 'elo', label: 'Elo', role: 'reference', available: true, rows: 80 },
    { key: 'sim_blend', label: 'Blend', role: 'shadow', available: true, rows: 80 },
    { key: 'logit3', label: 'Logit', role: 'shadow', available: false, note: 'game_predictions_logit3 has not been created yet' },
    { key: 'market', label: 'Market', role: 'benchmark', available: false, backtest_only: true, note: 'No live MLB odds' },
  ],
  scoreboard: {
    per_model: [line('v10', 80, 0.69), line('elo', 80, 0.71)],
    head_to_head: {
      models: ['v10', 'elo'], reference: 'v10', games: 80, small_sample: true,
      rows: [line('v10', 80, 0.69), line('elo', 80, 0.71)],
      deltas: [{ model: 'elo', reference: 'v10', n: 80, log_loss_gain: iv(-0.02), p_better: 0.02 }],
    },
    calibration: { v10: [{ p: 0.5, y: 0.52, n: 40, y_lo: 0.4, y_hi: 0.6 }], elo: [] },
  },
  games: [{
    game_id: '1', date: '2026-09-24', start_time: '2026-09-24T23:05:00.000Z',
    home_team_name: 'Atlanta Braves', away_team_name: 'New York Mets', completed: true,
    home_score: 5, away_score: 2, home_won: 1,
    predictions: {
      v10: { home_win_probability: 0.56, pregame: true },
      elo: { home_win_probability: 0.45, pregame: true },
    },
    disagreement: { range: 0.11, split_pick: true, models: 2 },
  }],
  window: { kind: 'dates', from: '2026-09-24', to: '2026-09-24', days: 3, first: '2026-03-25', last: '2026-09-24' },
  backtest: {
    generated_at: '2026-09-25',
    windows: [{
      key: '2020-26', label: 'Test seasons 2020-2026', n: 15000, note: 'Frozen.', source: 'research/x.py',
      block: 'd', reference: 'strength',
      models: [{ key: 'sim_blend', label: 'Blend', n: 15000, log_loss: iv(0.6767), accuracy: iv(0.57), brier: iv(0.242), calibration: [] }],
      deltas: [],
    }],
  },
};

const renderPage = (props) => render(<MemoryRouter><ModelsPage {...props} /></MemoryRouter>);

describe('ModelsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ApiService.getModelsCompare.mockResolvedValue(mlbData);
    ApiService.getMlbTotalsProps.mockResolvedValue({ available: false, note: 'game_props_sim has not been created yet', games: [] });
  });

  test('states the pregame rule and warns below 100 games', async () => {
    renderPage({ sport: 'mlb' });
    expect(await screen.findByText(/Live scoreboard · 2026/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/strictly before first pitch/);
    expect(screen.getByRole('status')).toHaveTextContent(/fewer than 100/);
  });

  test('lists unbuilt models as not live, with the reason', async () => {
    renderPage({ sport: 'mlb' });
    expect(await screen.findByText(/game_predictions_logit3 has not been created yet/)).toBeInTheDocument();
    expect(screen.getAllByText(/No live MLB odds/).length).toBeGreaterThan(0);
    expect(await screen.findByText(/game_props_sim has not been created yet/)).toBeInTheDocument();
  });

  test('highlights games where the models pick different winners', async () => {
    renderPage({ sport: 'mlb' });
    const row = (await screen.findByTitle('New York Mets at Atlanta Braves')).closest('tr');
    expect(row).toHaveClass('is-split');
    expect(within(row).getByLabelText('correct')).toBeInTheDocument();
    expect(within(row).getByLabelText('wrong')).toBeInTheDocument();
  });

  test('keeps the backtest in its own labelled box', async () => {
    renderPage({ sport: 'mlb' });
    const flag = await screen.findByText(/Backtest · stored research results · not live predictions/);
    const box = flag.closest('section');
    expect(within(box).getByText(/15,000 games/)).toBeInTheDocument();
    expect(within(box).getByText(/research\/x.py/)).toBeInTheDocument();
  });

  test('every model card links How it works to a /learn page', async () => {
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links.some((h) => h === '/learn/mlb-pa-simulator.html')).toBe(true);
    expect(links).toContain('/mlb/models/diagnostics');
    expect(links).toContain('/mlb/models/scenario-simulator');
  });
});

const withModels = (models, extra = {}) => ({ ...mlbData, ...extra, models });
const cardIds = () => Array.from(document.querySelectorAll('.mdl-card')).map((el) => el.id);
const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent);

describe('ModelsPage driven by the API model list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ApiService.getMlbTotalsProps.mockResolvedValue({ available: false, note: 'n', games: [] });
  });

  test('a model the API omits (hidden) is not shown anywhere', async () => {
    // elo is hidden: gone from the models list, the grid columns, calibration and cards.
    ApiService.getModelsCompare.mockResolvedValue(withModels([
      { key: 'v10', label: 'V10', role: 'production', available: true },
    ], {
      games: [{ ...mlbData.games[0], predictions: { v10: mlbData.games[0].predictions.v10 } }],
    }));
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    expect(cardIds()).toEqual(['model-v10']);
    expect(document.getElementById('model-elo')).toBeNull();
    const grid = screen.getByTitle('New York Mets at Atlanta Braves').closest('table');
    expect(within(grid).queryByRole('columnheader', { name: 'Elo' })).toBeNull();
    expect(within(grid).getByRole('columnheader', { name: 'V10' })).toBeInTheDocument();
  });

  test('an unknown model gets a generic card from its API label, note and role', async () => {
    ApiService.getModelsCompare.mockResolvedValue(withModels([
      { key: 'v10', label: 'V10', role: 'production', available: true },
      { key: 'zeta', label: 'Zeta net', role: 'shadow', available: true, note: 'An experiment <b>x</b>' },
    ], {
      games: [{ ...mlbData.games[0], predictions: {
        v10: { home_win_probability: 0.56, pregame: true }, zeta: { home_win_probability: 0.6, pregame: true },
      } }],
    }));
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    const card = document.getElementById('model-zeta');
    expect(card).not.toBeNull();
    expect(within(card).getByRole('heading', { name: 'Zeta net' })).toBeInTheDocument();
    expect(card).toHaveTextContent('An experiment <b>x</b>');
    expect(card.querySelector('b')).toBeNull();
    expect(within(card).getByText('Shadow')).toBeInTheDocument();
    // The game grid names the column by the API label, not the raw key.
    expect(headers()).toContain('Zeta net');
  });

  test('order follows the API, in cards and in the game grid', async () => {
    ApiService.getModelsCompare.mockResolvedValue(withModels([
      { key: 'elo', label: 'Elo', role: 'reference', available: true },
      { key: 'sim_blend', label: 'Blend', role: 'shadow', available: true },
      { key: 'v10', label: 'V10', role: 'production', available: true },
    ]));
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    expect(cardIds()).toEqual(['model-elo', 'model-sim_blend', 'model-v10']);
    const grid = screen.getByTitle('New York Mets at Atlanta Braves').closest('table');
    const cols = within(grid).getAllByRole('columnheader').map((h) => h.textContent);
    expect(cols.indexOf('Elo')).toBeLessThan(cols.indexOf('V10'));
  });

  test('API label and note override the card defaults for a known model', async () => {
    ApiService.getModelsCompare.mockResolvedValue(withModels([
      { key: 'v10', label: 'Main model', labelOverride: 'Main model', role: 'production', available: true, note: 'Temporarily on last month artifact', noteOverride: 'Temporarily on last month artifact' },
    ]));
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    const card = document.getElementById('model-v10');
    expect(within(card).getByRole('heading', { name: 'Main model' })).toBeInTheDocument();
    expect(card).toHaveTextContent('Temporarily on last month artifact');
    expect(card).toHaveTextContent('Inputs'); // still the full registry card
  });

  test('a default API label does not rename a known card (only an override does)', async () => {
    ApiService.getModelsCompare.mockResolvedValue(withModels([
      { key: 'v10', label: 'V10 (production)', role: 'production', available: true, note: 'default registry note' },
    ]));
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    const card = document.getElementById('model-v10');
    expect(within(card).queryByRole('heading', { name: 'V10 (production)' })).toBeNull();
    expect(card).not.toHaveTextContent('default registry note');
  });

  test('an unavailable model keeps its card text; its note is the off-list reason', async () => {
    ApiService.getModelsCompare.mockResolvedValue(mlbData);
    renderPage({ sport: 'mlb' });
    await screen.findByText(/game_predictions_logit3 has not been created yet/);
    const card = document.getElementById('model-logit3');
    expect(card).toHaveTextContent(MODEL_CARDS.mlb.logit3.role);
    expect(card).not.toHaveTextContent('has not been created yet');
  });

  test('an empty API list shows no model cards; a missing one falls back to the registry', async () => {
    ApiService.getModelsCompare.mockResolvedValue(withModels([]));
    const { unmount } = renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    expect(cardIds()).toEqual([]);
    unmount();

    const { models, ...noModels } = mlbData; // an old payload with no models[]
    ApiService.getModelsCompare.mockResolvedValue(noModels);
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    expect(cardIds()).toEqual(MODEL_ORDER.mlb.map((k) => `model-${k}`));
  });

  test('resolveModels: registry order without an API list, API order and cards with one', () => {
    expect(resolveModels('nfl', undefined).map((m) => m.key)).toEqual(MODEL_ORDER.nfl);
    const r = resolveModels('nfl', [{ key: 'xgb' }, { key: 'nope', label: 'N' }, { key: 'xgb' }]);
    expect(r.map((m) => m.key)).toEqual(['xgb', 'nope']);
    expect(r[0].card).toBe(MODEL_CARDS.nfl.xgb);
    expect(r[1].card).toBeNull();
  });

  test('the market keeps its benchmark badge and stays out of the live grid', async () => {
    ApiService.getModelsCompare.mockResolvedValue(mlbData);
    renderPage({ sport: 'mlb' });
    await screen.findByText(/Live scoreboard/);
    const card = document.getElementById('model-market');
    expect(card).not.toBeNull();
    expect(within(card).getByText('Backtest only')).toBeInTheDocument();
    const grid = screen.getByTitle('New York Mets at Atlanta Braves').closest('table');
    expect(within(grid).queryByRole('columnheader', { name: 'Market' })).toBeNull();
  });
});

describe('model registry', () => {
  test.each(['mlb', 'nfl', 'cfb'])('%s: every ordered model has a complete card', (sport) => {
    MODEL_ORDER[sport].forEach((k) => {
      const c = MODEL_CARDS[sport][k];
      expect(c).toBeDefined();
      ['name', 'role', 'status', 'what', 'how'].forEach((f) => expect(c[f]).toBeTruthy());
      expect(c.inputs.length).toBeGreaterThan(0);
      expect(c.learn.length).toBeGreaterThan(0);
      c.learn.forEach((l) => expect(l.href).toMatch(/^\/learn\/[a-z0-9-]+\.html$/));
    });
  });

  test('the market is the benchmark and FPI is not a target', () => {
    expect(MODEL_CARDS.nfl.market.role).toMatch(/benchmark to beat/i);
    expect(MODEL_CARDS.cfb.fpi.role).toMatch(/not a target/i);
    expect(MODEL_CARDS.cfb.xgb.role).toMatch(/legacy production/i);
  });
});

describe('CalibrationChart', () => {
  test('draws one dot per bin and says when there is nothing to draw', () => {
    const { container, rerender } = render(
      <CalibrationChart title="V10" bins={[{ p: 0.4, y: 0.42, n: 30, y_lo: 0.3, y_hi: 0.5 }, { p: 0.6, y: 0.58, n: 30, y_lo: 0.5, y_hi: 0.7 }]} />,
    );
    expect(container.querySelectorAll('circle.mdl-dot')).toHaveLength(2);
    rerender(<CalibrationChart title="V10" bins={[]} />);
    expect(screen.getByText('Nothing scored yet.')).toBeInTheDocument();
  });

  test('shared domain covers every bin and its interval', () => {
    const [lo, hi] = sharedDomain([[{ p: 0.45, y: 0.5, y_lo: 0.41, y_hi: 0.62 }]]);
    expect(lo).toBeLessThanOrEqual(0.41);
    expect(hi).toBeGreaterThanOrEqual(0.62);
  });
});
