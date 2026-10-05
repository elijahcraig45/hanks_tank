import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RankingsBoard, { asOfLabel, shortDate, ResultsCell } from './RankingsBoard';
import { DecompositionBar, orderLabel, signed } from './RankingRationale';
import ApiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { getRankings: jest.fn(), compareRankings: jest.fn() },
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

const why = (over) => team({
  summary: '#1 because: 4-0, average margin +34.0 vs a schedule rated 37th of 138.',
  rating_from_prior: 30, rating_from_current: 70, prior_share: 0.3, prior_weight: 0.195,
  sched_strength: 372.3, sched_rank: 37, sched_remaining: 448.1, sched_remaining_rank: 66,
  sched_remaining_games: 8, avg_margin: 34, avg_over_expected: 2.3,
  games: [
    { opp: 'Purdue Boilermakers', site: 'A', won: true, pf: 49, pa: 10, margin: 39,
      exp_margin: 30.4, over: 8.6, contrib: 27.23 },
    { opp: 'Michigan State Spartans', site: 'H', won: true, pf: 27, pa: 10, margin: 17,
      exp_margin: 27.8, over: -10.8, contrib: -34.29 },
  ],
  why: { best: [0], worst: [], unit: 'game', points_per_rating: 0.06114, prior_season: 2025 },
  ...over,
});

describe('rationale', () => {
  beforeEach(() => jest.clearAllMocks());

  const twoTeams = () => ({
    data: [
      why({
        team: 'Notre Dame', rank: 1, rating: 874.9,
        vs_next: { a: 'Notre Dame', b: 'Indiana', a_rank: 1, b_rank: 2, gap: 11.9,
          gap_points: 0.7, p_a_wins_neutral: 0.517, p_order: 0.485, tied: true,
          gap_from_prior: -119.7, gap_from_current: 131.6, h2h: null, common: [],
          common_totals: { n: 0 },
          text: 'Notre Dame is 11.9 rating points above Indiana; they have not played each other this season.' },
      }),
      why({ team: 'Indiana', rank: 2, rating: 863.0, summary: '#2 because: 4-0.', vs_next: null }),
    ],
    meta: { count: 2, season: 2026, model: 'margin' },
  });

  test('has no tier dividers and shows every summary line', async () => {
    ApiService.getRankings.mockResolvedValue(twoTeams());
    render(<RankingsBoard sport="cfb" season={2026} title="FBS" />);

    expect(await screen.findByText(/#1 because: 4-0/)).toBeInTheDocument();
    expect(screen.getByText('#2 because: 4-0.')).toBeInTheDocument();
    for (const label of ['In a class alone', 'Real contenders', 'The pack', 'No clear tiers']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  test('expands a row to its decomposition, best wins and schedule', async () => {
    ApiService.getRankings.mockResolvedValue(twoTeams());
    render(<RankingsBoard sport="cfb" season={2026} title="FBS" />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Details' }))[0]);
    expect(screen.getByText('Where the rating comes from')).toBeInTheDocument();
    expect(screen.getByText('Best wins')).toBeInTheDocument();
    expect(screen.getAllByText(/49-10 at Purdue Boilermakers/).length).toBeGreaterThan(0);
    expect(screen.getByText(/37th hardest of 2/)).toBeInTheDocument();
    expect(screen.getByText(/8 games, 66th hardest/)).toBeInTheDocument();
    // The loss-free team has no worst-losses block.
    expect(screen.queryByText('Worst losses')).not.toBeInTheDocument();
  });

  test('explains why a row sits above the next one', async () => {
    ApiService.getRankings.mockResolvedValue(twoTeams());
    render(<RankingsBoard sport="cfb" season={2026} title="FBS" />);

    const affordance = await screen.findByRole('button', { name: /^why above #2\?/ });
    // The resample share is a chip on the affordance itself, before it is opened.
    expect(affordance).toHaveTextContent('49%');
    fireEvent.click(affordance);
    expect(screen.getByText(/11.9 rating points above Indiana/)).toBeInTheDocument();
    // Older stored pairs have no order_label; the band is derived from p_order.
    expect(screen.getByText('a coin flip')).toBeInTheDocument();
    expect(screen.queryByText(/statistically tied/i)).not.toBeInTheDocument();
    // Only one neighbour below, so only one affordance.
    expect(screen.getAllByRole('button', { name: /why above/ })).toHaveLength(1);
  });

  test('compares any two teams through the backend', async () => {
    ApiService.getRankings.mockResolvedValue(twoTeams());
    ApiService.compareRankings.mockResolvedValue({
      data: { a: 'Notre Dame', b: 'Indiana', gap: 11.9, p_a_wins_neutral: 0.517,
        p_order: null, tied: false, gap_from_prior: -119.7, gap_from_current: 131.6,
        common: [], common_totals: { n: 0 }, text: 'Compared: Notre Dame over Indiana.' },
    });
    render(<RankingsBoard sport="cfb" season={2026} title="FBS" />);

    fireEvent.change(await screen.findByLabelText('First team'), { target: { value: 'Indiana' } });
    fireEvent.change(screen.getByLabelText('Second team'), { target: { value: 'Notre Dame' } });
    expect(await screen.findByText('Compared: Notre Dame over Indiana.')).toBeInTheDocument();
    expect(ApiService.compareRankings).toHaveBeenCalledWith(
      'cfb', { a: 'Indiana', b: 'Notre Dame', season: 2026 });
  });

  test('shows the resample share and band in the compare output', async () => {
    ApiService.getRankings.mockResolvedValue(twoTeams());
    ApiService.compareRankings.mockResolvedValue({
      data: { a: 'Notre Dame', b: 'Indiana', gap: 11.9, p_a_wins_neutral: 0.517,
        p_order: 0.665, tied: true, order_label: 'a slight edge',
        gap_from_prior: -119.7, gap_from_current: 131.6, common: [],
        common_totals: { n: 0 }, text: 'Compared: Notre Dame over Indiana.' },
    });
    render(<RankingsBoard sport="cfb" season={2026} title="FBS" />);

    fireEvent.change(await screen.findByLabelText('First team'), { target: { value: 'Indiana' } });
    fireEvent.change(screen.getByLabelText('Second team'), { target: { value: 'Notre Dame' } });
    expect(await screen.findByText('Compared: Notre Dame over Indiana.')).toBeInTheDocument();
    expect(screen.getByLabelText(/ahead of Indiana in 67% of resamples \(a slight edge\)/))
      .toHaveTextContent('67%');
    expect(screen.getByText('a slight edge')).toBeInTheDocument();
  });

  test('boards built before the rationale columns render without it', async () => {
    ApiService.getRankings.mockResolvedValue({
      data: [team({ team: 'Brewers' }), team({ team: 'Dodgers', rank: 2, rating: 90 })],
      meta: { count: 2, season: 2026 },
    });
    render(<RankingsBoard sport="mlb" season={2026} title="MLB" />);

    expect(await screen.findByText('Brewers')).toBeInTheDocument();
    expect(screen.queryByText('Compare any two teams')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
  });
});

describe('orderLabel', () => {
  test('matches the ML and backend bands on the displayed percentage', () => {
    const cases = [
      [0.5, 'a coin flip'], [0.594, 'a coin flip'], [0.595, 'a slight edge'],
      [0.744, 'a slight edge'], [0.745, 'a clear edge'], [0.894, 'a clear edge'],
      [0.895, 'separated'], [0.41, 'a coin flip'], [0.4, 'a slight edge the other way'],
      [0.05, 'separated the other way'],
    ];
    for (const [p, label] of cases) expect([p, orderLabel(p)]).toEqual([p, label]);
    expect(orderLabel(null)).toBeNull();
  });
});

describe('DecompositionBar', () => {
  test('labels both parts and their sum, negative parts included', () => {
    render(<DecompositionBar prior={102} current={-12} priorSeason={2025} season={2026} />);
    expect(screen.getByText('+102.0')).toBeInTheDocument();
    expect(screen.getByText('\u221212.0')).toBeInTheDocument();
    expect(screen.getByText('90.0')).toBeInTheDocument();
  });

  test('signed() uses a real minus sign and keeps the plus', () => {
    expect(signed(-3.14)).toBe('\u22123.1');
    expect(signed(2)).toBe('+2.0');
    expect(signed(null)).toBe('—');
  });
});

describe('board freshness label', () => {
  test('prefers the as-of date over the internal week index', () => {
    expect(asOfLabel({ as_of_week: 27, as_of_date: '2026-09-24',
      computed_at: '2026-09-25T11:02:03.000Z' })).toBe('through Sep 24 · updated Sep 25');
  });

  test('falls back to the week for boards without a date', () => {
    expect(asOfLabel({ as_of_week: 4 })).toBe('through week 4');
    expect(asOfLabel(null)).toBeNull();
  });

  test('does not shift a date across the UTC boundary', () => {
    expect(shortDate('2026-03-01')).toBe('Mar 1');
    expect(shortDate(undefined)).toBeNull();
  });
});

describe('results-only column', () => {
  beforeEach(() => jest.clearAllMocks());

  const rows = [
    team({ team: 'Tech', rank: 70, rating: 424, results_rank: 130 }),
    team({ team: 'Colorado', rank: 86, rating: 350, results_rank: 85 }),
    team({ team: 'Idle', rank: 90, rating: 300, results_rank: null }),
  ];

  test('shows the results order beside the rating, with the gap where they disagree', async () => {
    ApiService.getRankings.mockResolvedValue({ data: rows, meta: { count: 3, season: 2026 } });
    render(<RankingsBoard sport="cfb" season={2026} division="fbs" title="CFB" accent="ftbl" />);

    expect(await screen.findByText('Tech')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByText(/−60/)).toBeInTheDocument();      // 70 -> 130: 60 places lower
    expect(screen.queryByText(/\+1\b/)).not.toBeInTheDocument(); // 86 vs 85: too close to mark
    expect(screen.getByText(/not a forecast/)).toBeInTheDocument();
  });

  test('is absent for a sport that does not publish it', async () => {
    ApiService.getRankings.mockResolvedValue({
      data: [team({ team: 'Brewers' })], meta: { count: 1, season: 2026 },
    });
    render(<RankingsBoard sport="mlb" season={2026} title="MLB" />);
    expect(await screen.findByText('Brewers')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Results' })).not.toBeInTheDocument();
  });

  test('ResultsCell marks a big move up and a null as a dash', () => {
    const { container, rerender } = render(<ResultsCell row={{ team: 'A', rank: 40, results_rank: 10 }} />);
    expect(container.textContent).toBe('10 +30');
    rerender(<ResultsCell row={{ team: 'A', rank: 40, results_rank: null }} />);
    expect(container.textContent).toBe('—');
  });
});
