import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelComparison from './ModelComparison';
import ApiService from '../../services/api';
import { FOOTBALL_MODELS, MODEL_ORDER } from '../../config/footballModels';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getFootballModelComparison: jest.fn() },
}));

const LEAGUE = { key: 'fbs', sport: 'cfb', division: 'fbs', label: 'College FBS' };

const line = (model, games, ll, over = {}) => ({
  model, games, log_loss: ll, accuracy: 0.8, brier: 0.15,
  spread_mae: model === 'xgb' ? null : 12.3, spread_games: games, ...over,
});

const payload = (over = {}) => ({
  success: true,
  data: {
    sport: 'cfb', season: 2026, week: 4, division: 'fbs', weeks: [1, 2, 3, 4],
    models: [
      { key: 'xgb', label: 'Production XGBoost', available: true, planned: false, rows: 10 },
      { key: 'ridge', label: 'Margin ridge (shadow)', available: false, planned: false, rows: 0,
        note: 'cfb_season.game_predictions_ridge_shadow has not been created yet.' },
      { key: 'fpi', label: 'ESPN FPI', available: true, planned: false, rows: 5 },
      { key: 'drive_sim', label: 'Drive simulation', available: false, planned: true, rows: 0 },
      { key: 'market', label: 'Betting market', available: true, planned: false, rows: 10 },
    ],
    games: [
      {
        game_id: '401858467', season: 2026, week: 4, division: 'fbs',
        home_team_name: 'Purdue', away_team_name: 'Notre Dame',
        kickoff: '2026-09-26T18:00:00.000Z', completed: true,
        home_score: 10, away_score: 38, home_won: 0, actual_home_margin: -28,
        predictions: {
          xgb: { home_win_probability: 0.2, predicted_home_margin: null, pregame: true },
          ridge: null,
          fpi: { home_win_probability: 0.04, predicted_home_margin: -28, pregame: true },
          market: { home_win_probability: 0.06, predicted_home_margin: -24.5, pregame: true },
        },
      },
      {
        game_id: 'late', season: 2026, week: 4, division: 'fbs',
        home_team_name: 'Kent State', away_team_name: 'Ball State',
        kickoff: '2026-09-26T16:00:00.000Z', completed: true,
        home_score: 20, away_score: 17, home_won: 1, actual_home_margin: 3,
        predictions: {
          xgb: { home_win_probability: 0.5, predicted_home_margin: null, pregame: false },
          ridge: null, fpi: null, market: null,
        },
      },
    ],
    scoreboard: {
      per_model: [line('xgb', 248, 0.3611), line('ridge', 0, null), line('fpi', 40, 0.29),
        line('market', 256, 0.2754)],
      head_to_head: { models: ['xgb', 'fpi', 'market'], games: 40,
        rows: [line('xgb', 40, 0.37), line('fpi', 40, 0.29), line('market', 40, 0.27)] },
    },
    week_scoreboard: { per_model: [], head_to_head: { models: [], games: 0, rows: [] } },
    ...over,
  },
  meta: { sport: 'cfb' },
});

describe('ModelComparison', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renders both scoreboards and flags a small head-to-head sample', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue(payload());
    render(<ModelComparison league={LEAGUE} season={2026} />);

    const h2h = (await screen.findByText(/Head to head/)).closest('.fm-score');
    expect(within(h2h).getByText(/40 games — small sample/)).toBeInTheDocument();
    // Best log loss is bolded; the market leads here.
    const best = h2h.querySelector('tr.fm-best');
    expect(best).toHaveTextContent('Betting market');

    // A model with no scored games does not get a zero row in the full record.
    const full = screen.getByText(/full record/).closest('.fm-score');
    expect(within(full).queryByText('Margin ridge')).not.toBeInTheDocument();
    expect(ApiService.getFootballModelComparison).toHaveBeenCalledWith('cfb', {
      season: 2026, week: null, division: 'fbs',
    });
  });

  test('greys out and labels a prediction written after kickoff', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue(payload());
    render(<ModelComparison league={LEAGUE} season={2026} />);
    expect(await screen.findByText('after kickoff — not scored')).toBeInTheDocument();
    const late = screen.getByText('after kickoff — not scored').closest('td');
    expect(late).toHaveClass('fm-cell--late');
    expect(late).not.toHaveClass('fm-cell--hit');
  });

  test('marks a pregame call as hit or miss once the game is final', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue(payload());
    render(<ModelComparison league={LEAGUE} season={2026} />);
    const row = (await screen.findByText('Notre Dame @ Purdue')).closest('tr');
    // Home won 0; xgb said 20% home -> correct, shown as a hit.
    expect(row.querySelectorAll('td.fm-cell--hit').length).toBe(3);
    expect(within(row).getByText(/Notre Dame 96%/)).toBeInTheDocument();
  });

  test('has a description card for every model, including the planned one', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue(payload());
    render(<ModelComparison league={LEAGUE} season={2026} />);
    await screen.findByText(/Head to head/);
    for (const key of MODEL_ORDER) {
      const card = screen.getByTestId(`model-card-${key}`);
      expect(card).toHaveTextContent(FOOTBALL_MODELS[key].name);
      expect(card).toHaveTextContent('What it uses');
      expect(card).toHaveTextContent('How it gets to a win probability');
      expect(card).toHaveTextContent('Caveats');
    }
    // An unavailable model says why rather than showing an empty record.
    expect(screen.getByTestId('model-card-ridge')).toHaveTextContent('has not been created yet');
    expect(screen.getByTestId('model-card-market')).toHaveTextContent('benchmark to beat');
    expect(screen.getByTestId('model-card-fpi')).toHaveTextContent('not a target');
  });

  test('labels the backtest as separate from the live record', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue(payload());
    render(<ModelComparison league={LEAGUE} season={2026} />);
    expect(await screen.findByText(/Not the live scoreboard/)).toBeInTheDocument();
    expect(screen.getAllByText(/within noise/).length).toBeGreaterThan(0);
  });

  test('changing the week refetches that week', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue(payload());
    render(<ModelComparison league={LEAGUE} season={2026} />);
    const select = await screen.findByLabelText('Week');
    await userEvent.selectOptions(select, '2');
    expect(ApiService.getFootballModelComparison).toHaveBeenLastCalledWith('cfb', {
      season: 2026, week: 2, division: 'fbs',
    });
  });

  test('shows the backend note when predictions are not built', async () => {
    ApiService.getFootballModelComparison.mockResolvedValue({
      success: true, data: null, meta: { note: 'College Football predictions are not built yet.' },
    });
    render(<ModelComparison league={LEAGUE} season={2026} />);
    expect(await screen.findByText(/not built yet/)).toBeInTheDocument();
  });

  test('says so when the request fails', async () => {
    ApiService.getFootballModelComparison.mockRejectedValue(new Error('down'));
    render(<ModelComparison league={LEAGUE} season={2026} />);
    expect(await screen.findByText('Could not load the model comparison.')).toBeInTheDocument();
  });
});
