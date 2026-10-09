import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiService from '../../services/api';
import CfbScoutingSection, { spreadLabel } from './CfbScoutingSection';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getCfbScouting: jest.fn() },
}));

const league = { key: 'fbs', sport: 'cfb', division: 'fbs' };

const team = (name, overall, extra = {}) => ({
  id: name.slice(0, 3).toUpperCase(),
  name,
  ranking: overall ? { overall_rank: overall, record: '5-0', ap_rank: 6, playoff_pct: 93.8 } : null,
  key_players: [{ category: 'pass', name: 'Keelon Russell', position: 'QB', stat: '1414 yds, 11 TD, 2 INT' }],
  injuries: [],
  ...extra,
});

const report = {
  season: 2026,
  week: 6,
  weeks: [5, 6],
  games: [
    {
      game_id: 'g2', start_time: '2026-10-10T23:30:00Z', status: 'scheduled', relevance: 1,
      home: team('Alabama', 1), away: team('Georgia', 6),
      pick: { team: 'Georgia', win_prob: 0.56, label: 'XGBoost' },
      market: { home_spread: -0.5, home_win_prob: 0.49, total: 56 },
      disagreement: 'high', injuries_available: false,
      models: [{ key: 'xgb', label: 'XGBoost', home_win_prob: 0.44, margin: null }],
    },
    {
      game_id: 'g1', start_time: '2026-10-10T16:00:00Z', status: 'scheduled', relevance: 90,
      home: team('Akron', 90), away: team('Bowling Green', 95),
      pick: { team: 'Akron', win_prob: 0.7, label: 'XGBoost' },
      market: null, disagreement: 'low', injuries_available: false, models: [],
    },
  ],
  meta: {
    rankings_as_of_week: 5,
    player_stats_updated: '2026-10-05T15:26:21.961Z',
    injuries: { note: 'ESPN has no current CFB injury reports. This is missing data, not a clean bill of health.' },
  },
};

// The component clears its loading flag after the data lands; wait for that so no state
// update arrives after a test has finished (which React reports as an act() warning).
const settled = () => waitFor(() => expect(document.querySelector('.cs-section'))
  .toHaveAttribute('aria-busy', 'false'));

beforeEach(() => {
  ApiService.getCfbScouting.mockReset();
  ApiService.getCfbScouting.mockResolvedValue(report);
});

describe('CfbScoutingSection', () => {
  it('requests the division and renders a card per game with the pick', async () => {
    render(<CfbScoutingSection league={league} season={2026} />);
    expect(await screen.findByText(/Georgia/, { selector: '.cs-pick' })).toBeInTheDocument();
    await settled();
    expect(ApiService.getCfbScouting).toHaveBeenCalledWith({ season: 2026, week: null, division: 'fbs' });
    expect(screen.getByText('56%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Models split')).toBeInTheDocument();
  });

  it('says injuries are missing data rather than implying a clean sheet', async () => {
    render(<CfbScoutingSection league={league} season={2026} />);
    expect(await screen.findByText(/not a clean bill of health/)).toBeInTheDocument();
    await settled();
    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    expect(screen.queryByText('None reported')).not.toBeInTheDocument();
  });

  it('shows injuries when ESPN has them, and "None reported" only then', async () => {
    const withInjury = JSON.parse(JSON.stringify(report));
    withInjury.games[0].injuries_available = true;
    withInjury.games[0].home.injuries = [
      { player: 'A. Player', status: 'Out', detail: 'Knee', reported: '2026-10-08T00:00Z' },
    ];
    ApiService.getCfbScouting.mockResolvedValue(withInjury);
    render(<CfbScoutingSection league={league} season={2026} />);
    expect(await screen.findByText('A. Player')).toBeInTheDocument();
    await settled();
    expect(screen.getByText('None reported')).toBeInTheDocument();
  });

  it('filters to top-25 matchups', async () => {
    render(<CfbScoutingSection league={league} season={2026} />);
    await screen.findByText('70%');
    await settled();
    await userEvent.click(screen.getByLabelText(/Top 25 matchups only/));
    expect(screen.queryByText('70%')).not.toBeInTheDocument();
    expect(screen.getByText('56%')).toBeInTheDocument();
  });

  it('refetches for another week', async () => {
    render(<CfbScoutingSection league={league} season={2026} />);
    await screen.findByText('56%');
    await settled();
    await userEvent.selectOptions(screen.getByLabelText('Week'), '5');
    await waitFor(() => expect(ApiService.getCfbScouting).toHaveBeenLastCalledWith(
      { season: 2026, week: 5, division: 'fbs' },
    ));
    await settled();
  });

  it('shows an error when the request fails', async () => {
    ApiService.getCfbScouting.mockRejectedValue(new Error('boom'));
    render(<CfbScoutingSection league={league} season={2026} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the scouting report.');
    await settled();
  });
});

describe('spreadLabel', () => {
  const g = { home: { name: 'Alabama' }, away: { name: 'Georgia' } };
  it('names the favourite from the home-margin sign', () => {
    expect(spreadLabel({ ...g, market: { home_spread: 7 } })).toBe('Alabama by 7.0');
    expect(spreadLabel({ ...g, market: { home_spread: -3.5 } })).toBe('Georgia by 3.5');
  });
  it('calls a near-zero line a pick-em and tolerates no line', () => {
    expect(spreadLabel({ ...g, market: { home_spread: 0.1 } })).toBe("Pick'em");
    expect(spreadLabel({ ...g, market: null })).toBeNull();
  });
});
