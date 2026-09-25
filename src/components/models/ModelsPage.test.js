import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModelsPage from './ModelsPage';
import CalibrationChart, { sharedDomain } from './CalibrationChart';
import ApiService from '../../services/api';
import { MODEL_CARDS, MODEL_ORDER } from '../../config/modelRegistry';

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
