/**
 * Tests for the column-driven team stats section.
 *
 * The regression these guard: college team stats sat in BigQuery for months while this
 * section rendered an empty state asserting the feed did not exist. So the load-bearing
 * assertions are that real rows produce a real table, and that the headers come from
 * `meta.columns` rather than from a hardcoded list of one sport's column names.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FootballPage from './FootballPage';
import ApiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getFootballPredictions: jest.fn(),
    getFootballAccuracy: jest.fn(),
    getRankings: jest.fn(),
    getFootballLeaders: jest.fn(),
    getFootballPlayers: jest.fn(),
    getFootballTeamStats: jest.fn(),
    getFootballTeamSeasonStats: jest.fn(),
  },
}));

const col = (key, label, group, format, higher = null) => ({
  key, label, group, format, higher_is_better: higher, opponent: false,
});

const CFB_SEASON = {
  data: [
    {
      season: 2025, team: 'Ohio State Buckeyes', team_abbr: 'OSU',
      gamesPlayed: 16, totalPointsPerGame: 35.5, totalYards: 6800,
    },
    {
      season: 2025, team: 'Indiana Hoosiers', team_abbr: 'IU',
      gamesPlayed: 16, totalPointsPerGame: 41.625, totalYards: 7232,
    },
  ],
  meta: {
    sport: 'cfb', label: 'College Football', scope: 'season',
    total: 136, count: 2, limit: 50, offset: 0,
    sort: 'totalPointsPerGame', direction: 'DESC',
    sortable_fields: ['totalPointsPerGame', 'totalYards'],
    group: 'core',
    groups: [
      { key: 'core', label: 'Overview', count: 9 },
      { key: 'passing', label: 'Passing', count: 13 },
    ],
    columns: [
      col('team', 'Team', 'core', 'text'),
      col('gamesPlayed', 'G', 'core', 'integer'),
      col('totalPointsPerGame', 'PPG', 'core', 'decimal1', true),
      col('totalYards', 'Total Yds', 'core', 'integer', true),
    ],
    coverage: 'FBS only — the public feed does not publish an FCS season table.',
    week_endpoint: null,
  },
};

/** What the per-week endpoint answers for a league that has no per-week feed. */
const CFB_WEEK_UNAVAILABLE = {
  data: [],
  meta: {
    sport: 'cfb', label: 'College Football', scope: 'week',
    total: 0, count: 0, sortable_fields: [],
    season_endpoint: '/api/football/cfb/stats/teams/season',
    note: 'College Football has no per-week feed yet — season totals are at '
      + '/api/football/cfb/stats/teams/season.',
  },
};

/**
 * The page reads :league and :section from useParams, so a real Route has to match —
 * rendering FootballPage bare under a MemoryRouter yields empty params and silently
 * falls back to the NFL picks section.
 */
function renderStats(league = 'fbs') {
  return render(
    <MemoryRouter initialEntries={[`/football/${league}/stats`]}>
      <Routes>
        <Route path="/football/:league/:section" element={<FootballPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  ApiService.getFootballPredictions.mockResolvedValue({ data: [] });
  ApiService.getFootballAccuracy.mockResolvedValue({ data: {} });
  ApiService.getRankings.mockResolvedValue({ data: [] });
});

describe('college team stats', () => {
  it('renders a real table instead of the old empty state', async () => {
    ApiService.getFootballTeamSeasonStats.mockResolvedValue(CFB_SEASON);
    renderStats('fbs');

    await waitFor(() => {
      expect(screen.getByText('Ohio State Buckeyes')).toBeInTheDocument();
    });
    expect(screen.getByText('Indiana Hoosiers')).toBeInTheDocument();
    // The claim that used to be shown here.
    expect(
      screen.queryByText(/no advanced team stats/i),
    ).not.toBeInTheDocument();
  });

  it('takes its headers from meta.columns, not a hardcoded list', async () => {
    ApiService.getFootballTeamSeasonStats.mockResolvedValue(CFB_SEASON);
    renderStats('fbs');

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'PPG' })).toBeInTheDocument();
    });
    expect(screen.getByRole('columnheader', { name: 'Total Yds' })).toBeInTheDocument();
    // NFL's column labels must not appear for a college response.
    expect(
      screen.queryByRole('columnheader', { name: 'Off EPA' }),
    ).not.toBeInTheDocument();
  });

  it('formats each value by the format the column declares', async () => {
    ApiService.getFootballTeamSeasonStats.mockResolvedValue(CFB_SEASON);
    renderStats('fbs');

    // decimal1 rounds; integer gets thousands separators.
    await waitFor(() => expect(screen.getByText('41.6')).toBeInTheDocument());
    expect(screen.getByText('7,232')).toBeInTheDocument();
  });

  it('states the FBS-only caveat rather than showing a short table unexplained', async () => {
    ApiService.getFootballTeamSeasonStats.mockResolvedValue(CFB_SEASON);
    renderStats('fbs');
    await waitFor(() => {
      expect(screen.getByText(/FBS only/i)).toBeInTheDocument();
    });
  });

  it('shows the API note verbatim when a scope has nothing, without inventing a reason', async () => {
    ApiService.getFootballTeamSeasonStats.mockResolvedValue({
      data: [],
      meta: {
        sport: 'cfb', scope: 'season', total: 0, count: 0,
        note: 'College Football season stats are configured but not built yet.',
      },
    });
    renderStats('fbs');

    await waitFor(() => {
      expect(
        screen.getByText(/configured but not built yet/i),
      ).toBeInTheDocument();
    });
    // The old hardcoded sentence about the free ESPN feed must not reappear.
    expect(screen.queryByText(/free ESPN feed/i)).not.toBeInTheDocument();
  });

  it('offers no scope switch when only one grain exists', async () => {
    ApiService.getFootballTeamSeasonStats.mockResolvedValue(CFB_SEASON);
    renderStats('fbs');
    await waitFor(() => {
      expect(screen.getByText('Ohio State Buckeyes')).toBeInTheDocument();
    });
    expect(screen.queryByText('By week')).not.toBeInTheDocument();
  });
});

describe('NFL team stats', () => {
  const NFL_WEEK = {
    data: [{ season: 2025, week: 1, team: 'PHI', off_epa_play: 0.152, def_epa_play: -0.08 }],
    meta: {
      sport: 'nfl', label: 'NFL', scope: 'week', total: 32, count: 1,
      sortable_fields: ['off_epa_play'],
      groups: [{ key: 'core', label: 'Overview', count: 3 }],
      columns: [
        col('team', 'Team', 'core', 'text'),
        col('off_epa_play', 'Off EPA', 'offense', 'decimal3', true),
        col('def_epa_play', 'Def EPA', 'defense', 'decimal3', false),
      ],
      season_endpoint: null,
    },
  };

  it('renders the per-week grain with its own column labels', async () => {
    ApiService.getFootballTeamStats.mockResolvedValue(NFL_WEEK);
    renderStats('nfl');

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Off EPA' })).toBeInTheDocument();
    });
    expect(screen.getByText('PHI')).toBeInTheDocument();
    // College labels must not leak into an NFL response.
    expect(screen.queryByRole('columnheader', { name: 'PPG' })).not.toBeInTheDocument();
  });

  it('colours a good defensive EPA as good even though it is negative', async () => {
    ApiService.getFootballTeamStats.mockResolvedValue(NFL_WEEK);
    renderStats('nfl');

    await waitFor(() => expect(screen.getByText('-0.080')).toBeInTheDocument());
    // def_epa_play is lower-is-better, so a negative value is a positive outcome.
    expect(screen.getByText('-0.080')).toHaveClass('ft-pos');
    expect(screen.getByText('0.152')).toHaveClass('ft-pos');
  });
});
