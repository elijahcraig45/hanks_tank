import { render, screen, waitFor } from '@testing-library/react';
import RankingsBoard, { buildTiers } from './RankingsBoard';
import ApiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { getRankings: jest.fn() },
}));

const team = (over) => ({
  team: 'Team', rank: 1, rating: 100, record: '10-2',
  gap_to_next: 5, rank_p05: 1, rank_p95: 3, ...over,
});

describe('RankingsBoard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('hides optional columns the sport does not supply', async () => {
    // MLB has no FPI at all, so none of those headers should render.
    ApiService.getRankings.mockResolvedValue({
      data: [team({ team: 'Brewers' }), team({ team: 'Dodgers', rank: 2, rating: 90 })],
      meta: { count: 2, season: 2026 },
    });

    render(<RankingsBoard sport="mlb" season={2026} title="MLB" />);

    expect(await screen.findByText('Brewers')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Rank range/ })).toBeInTheDocument();
    expect(screen.queryByText('SOR')).not.toBeInTheDocument();
    expect(screen.queryByText('FPI')).not.toBeInTheDocument();
  });

  test('shows only the FPI columns that have values', async () => {
    // NFL carries strength of schedule but ESPN publishes no strength of record for it.
    ApiService.getRankings.mockResolvedValue({
      data: [
        team({ team: 'SEA', sos_rank: 13, sor_rank: null, fpi: 7.2, epa_offense: 1.34 }),
        team({ team: 'DEN', rank: 2, rating: 90, sos_rank: 8, sor_rank: null, fpi: 6.4, epa_offense: 0.9 }),
      ],
      meta: { count: 2, season: 2026 },
    });

    render(<RankingsBoard sport="nfl" season={2026} title="NFL" accent="ftbl" />);

    expect(await screen.findByText('SEA')).toBeInTheDocument();
    expect(screen.getByText('SOS')).toBeInTheDocument();
    expect(screen.getByText('FPI')).toBeInTheDocument();
    expect(screen.getByText('Off EPA')).toBeInTheDocument();
    expect(screen.queryByText('SOR')).not.toBeInTheDocument();
  });

  test('says so when a board has not been built', async () => {
    ApiService.getRankings.mockResolvedValue({
      data: [],
      meta: { note: 'No power rankings built for MLB yet.' },
    });

    render(<RankingsBoard sport="mlb" season={2026} title="MLB" />);

    expect(await screen.findByText(/No power rankings for MLB 2026/)).toBeInTheDocument();
    expect(screen.getByText('No power rankings built for MLB yet.')).toBeInTheDocument();
  });

  test('warns that a preseason board carries no games from this season', async () => {
    ApiService.getRankings.mockResolvedValue({
      data: [team({ team: 'SEA', record: '14-3' })],
      meta: { count: 1, season: 2026, is_preseason: true, record_season: 2025 },
    });

    render(<RankingsBoard sport="nfl" season={2026} title="NFL" accent="ftbl" />);

    await waitFor(() => expect(screen.getByText(/Preseason\./)).toBeInTheDocument());
    expect(screen.getByText(/comes entirely from 2025/)).toBeInTheDocument();
  });

  test('requests the division so the college board is split server-side', async () => {
    ApiService.getRankings.mockResolvedValue({ data: [], meta: {} });

    render(
      <RankingsBoard sport="cfb" season={2026} division="fcs" title="College FCS" />
    );

    await waitFor(() =>
      expect(ApiService.getRankings).toHaveBeenCalledWith(
        'cfb', expect.objectContaining({ division: 'fcs', season: 2026 })
      )
    );
  });
});

describe('buildTiers', () => {
  test('breaks where the gap is large relative to the typical gap', () => {
    const rows = [
      { team: 'A', rank: 1, rating: 200, gap_to_next: 100 }, // big break
      { team: 'B', rank: 2, rating: 100, gap_to_next: 2 },
      { team: 'C', rank: 3, rating: 98, gap_to_next: 2 },
      { team: 'D', rank: 4, rating: 96, gap_to_next: null },
    ];

    const tiers = buildTiers(rows);

    expect(tiers).toHaveLength(2);
    expect(tiers[0].rows.map((r) => r.team)).toEqual(['A']);
    expect(tiers[1].rows.map((r) => r.team)).toEqual(['B', 'C', 'D']);
  });

  test('does not claim dominance when nothing separates the field', () => {
    // Baseball's normal case: the whole board fits inside a few points, so no gap
    // breaks. Labelling that single group "In a class alone" would be backwards.
    const rows = [
      { team: 'A', rank: 1, rating: 100, gap_to_next: 1 },
      { team: 'B', rank: 2, rating: 99, gap_to_next: 1 },
      { team: 'C', rank: 3, rating: 98, gap_to_next: null },
    ];

    const tiers = buildTiers(rows);

    expect(tiers).toHaveLength(1);
    expect(tiers[0].label).toBe('No clear tiers');
    expect(tiers[0].rows).toHaveLength(3);
  });
});
