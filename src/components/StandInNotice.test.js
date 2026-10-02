import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StandInNotice, { productionLabel, readStandIn } from './StandInNotice';
import SiteBanner from './SiteBanner';
import ModelsPage from './models/ModelsPage';
import UnifiedSlatePage from './predictions/UnifiedSlatePage';
import ApiService from '../services/api';
import { mockSlate } from '../services/predictionMocks';

jest.mock('../services/api', () => ({
  __esModule: true,
  API_BASE_URL: 'http://api.test/api',
  default: {
    getSiteStatus: jest.fn(),
    getModelsCompare: jest.fn(),
    getMlbTotalsProps: jest.fn(),
    getPredictionsSlate: jest.fn(),
    getPredictions: jest.fn(),
    getPlayerProjections: jest.fn(),
  },
}));

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const standIn = (over = {}) => ({
  model: 'sim_blend', label: 'Sim Blend', reason: 'production_hidden', basis: 'fixed_order', n_games: null, ...over,
});
const models = [
  { key: 'sim_blend', label: 'Sim Blend', role: 'shadow', available: true },
  { key: 'elo', label: 'Elo', role: 'reference', available: true },
];

describe('StandInNotice', () => {
  test('shows the stand-in label and the production label from the registry when v10 is hidden', () => {
    render(<StandInNotice sport="mlb" data={{ models, stand_in: standIn() }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing Sim Blend while V10 is offline.');
    expect(screen.queryByText(/Chosen by best log loss/)).toBeNull();
  });

  test('uses the API label for production when the API lists it, and says paused', () => {
    const list = [{ key: 'v10', label: 'Production V10', role: 'production' }, ...models];
    render(<StandInNotice sport="mlb" data={{ models: list, stand_in: standIn({ reason: 'production_paused' }) }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing Sim Blend while Production V10 is paused.');
  });

  test('season_log_loss adds the short second line', () => {
    render(<StandInNotice sport="mlb" data={{ models, stand_in: standIn({ basis: 'season_log_loss', n_games: 212 }) }} />);
    expect(screen.getByText('Chosen by best log loss this season (212 games).')).toBeInTheDocument();
  });

  test('has no close button', () => {
    render(<StandInNotice sport="mlb" data={{ models, stand_in: standIn() }} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test.each([
    ['null', { stand_in: null }],
    ['undefined (old backend)', {}],
    ['a string', { stand_in: 'sim_blend' }],
    ['an array', { stand_in: [] }],
    ['a number model', { stand_in: standIn({ model: 5 }) }],
    ['an unknown reason', { stand_in: standIn({ reason: 'other' }) }],
    ['no data at all', null],
  ])('no notice when stand_in is %s', (_n, data) => {
    const { container } = render(<StandInNotice sport="mlb" data={data} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('a non-string label falls back to the key; bad n_games or basis add no second line', () => {
    expect(readStandIn({ stand_in: standIn({ label: 42, basis: 'x', n_games: 'many' }) }))
      .toMatchObject({ label: 'sim_blend', basis: null, nGames: null });
  });

  test('markup in a label is rendered as literal text', () => {
    const { container } = render(
      <StandInNotice sport="mlb" data={{ models, stand_in: standIn({ label: '<b>Bold</b>' }) }} />,
    );
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Showing <b>Bold</b> while');
  });

  test('productionLabel falls back to the key for an unknown sport', () => {
    expect(productionLabel('zzz', undefined)).toBe('the main model');
  });

  test('is shown alongside the owner banner', async () => {
    ApiService.getSiteStatus.mockResolvedValue({
      sports: { mlb: { banner: { text: 'Owner says hi', level: 'info' } } },
    });
    render(
      <MemoryRouter initialEntries={['/mlb/models']} future={future}>
        <SiteBanner />
        <StandInNotice sport="mlb" data={{ models, stand_in: standIn() }} />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Owner says hi')).toBeInTheDocument();
    expect(screen.getByTestId('stand-in-notice')).toBeInTheDocument();
  });
});

describe('stand-in on the pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    ApiService.getMlbTotalsProps.mockResolvedValue({ available: false, games: [] });
    ApiService.getPredictions.mockResolvedValue({ predictions: [] });
    ApiService.getPlayerProjections.mockResolvedValue({ available: true, rows: [] });
  });

  const compare = (extra) => ({
    sport: 'mlb', season: 2026, reference: 'sim_blend', models,
    scoreboard: { per_model: [], head_to_head: null, calibration: {} }, games: [], ...extra,
  });

  test('Models page shows the notice when stand_in is set', async () => {
    ApiService.getModelsCompare.mockResolvedValue(compare({ stand_in: standIn() }));
    render(<MemoryRouter future={future}><ModelsPage sport="mlb" /></MemoryRouter>);
    expect(await screen.findByTestId('stand-in-notice')).toHaveTextContent('Showing Sim Blend while V10 is offline.');
  });

  test('Models page has no notice when production is merely available (stand_in null)', async () => {
    ApiService.getModelsCompare.mockResolvedValue(compare({ stand_in: null }));
    render(<MemoryRouter future={future}><ModelsPage sport="mlb" /></MemoryRouter>);
    await screen.findByText(/Live scoreboard/);
    expect(screen.queryByTestId('stand-in-notice')).toBeNull();
  });

  test('Models page tolerates an old backend without the field', async () => {
    ApiService.getModelsCompare.mockResolvedValue(compare({}));
    render(<MemoryRouter future={future}><ModelsPage sport="mlb" /></MemoryRouter>);
    await screen.findByText(/Live scoreboard/);
    expect(screen.queryByTestId('stand-in-notice')).toBeNull();
  });

  const renderSlate = () => render(
    <MemoryRouter initialEntries={['/mlb/predictions?date=2026-09-26']} future={future}>
      <UnifiedSlatePage sport="mlb" />
    </MemoryRouter>,
  );

  test('slate page shows the notice and features the stand-in via featured_default', async () => {
    const base = mockSlate('mlb', { date: '2026-09-26' });
    ApiService.getPredictionsSlate.mockResolvedValue({
      ...base, featured_default: 'sim_blend',
      stand_in: standIn({ basis: 'season_log_loss', n_games: 90 }),
    });
    renderSlate();
    expect(await screen.findByTestId('stand-in-notice')).toHaveTextContent('Showing Sim Blend while');
    await waitFor(() => expect(screen.getByLabelText('Featured model')).toHaveValue('sim_blend'));
  });

  test('slate page has no notice when stand_in is null', async () => {
    ApiService.getPredictionsSlate.mockResolvedValue({ ...mockSlate('mlb', { date: '2026-09-26' }), stand_in: null });
    renderSlate();
    await screen.findAllByTestId('game-card');
    expect(screen.queryByTestId('stand-in-notice')).toBeNull();
  });
});
