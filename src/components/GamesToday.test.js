import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TodaysGames from './GamesToday';
import apiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getPredictions: jest.fn(),
    getGames: jest.fn(),
    getGameDetails: jest.fn(),
  },
}));

const scheduleResponse = {
  dates: [
    {
      games: [
        {
          gamePk: 824776,
          gameDate: '2026-04-20T15:10:00Z',
          status: { statusCode: 'I' },
          teams: {
            away: { team: { name: 'Detroit Tigers' }, leagueRecord: { wins: 12, losses: 10 } },
            home: { team: { name: 'Boston Red Sox' }, leagueRecord: { wins: 8, losses: 13 } },
          },
        },
        {
          gamePk: 824777,
          gameDate: '2026-04-20T22:10:00Z',
          status: { statusCode: 'S' },
          teams: {
            away: { team: { name: 'Houston Astros' }, leagueRecord: { wins: 8, losses: 15 } },
            home: { team: { name: 'Cleveland Guardians' }, leagueRecord: { wins: 13, losses: 10 } },
          },
        },
        {
          gamePk: 824778,
          gameDate: '2026-04-20T22:40:00Z',
          status: { statusCode: 'S' },
          teams: {
            away: { team: { name: 'Cincinnati Reds' }, leagueRecord: { wins: 14, losses: 8 } },
            home: { team: { name: 'Tampa Bay Rays' }, leagueRecord: { wins: 12, losses: 9 } },
          },
        },
      ],
    },
  ],
};

const liveFeeds = {
  824776: {
    gamePk: 824776,
    gameData: {
      teams: {
        away: { abbreviation: 'DET' },
        home: { abbreviation: 'BOS' },
      },
    },
    liveData: {
      linescore: {
        innings: [{ away: { runs: 1 }, home: { runs: 0 } }],
        offense: {
          second: { fullName: 'Parker Meadows' },
        },
        outs: 1,
        teams: {
          away: { runs: 3, hits: 6, errors: 1 },
          home: { runs: 6, hits: 9, errors: 0 },
        },
      },
      plays: {
        currentPlay: {
          about: {
            halfInning: 'top',
            inning: 8,
          },
          matchup: {
            batter: { fullName: 'Riley Greene' },
            pitcher: { fullName: 'Aroldis Chapman' },
          },
        },
      },
    },
  },
  824777: {
    gamePk: 824777,
    gameData: {
      teams: {
        away: { abbreviation: 'HOU' },
        home: { abbreviation: 'CLE' },
      },
    },
    liveData: {
      linescore: {
        innings: [],
        teams: {
          away: { runs: '—', hits: '—', errors: '—' },
          home: { runs: '—', hits: '—', errors: '—' },
        },
      },
      plays: {},
    },
  },
  824778: {
    gamePk: 824778,
    gameData: {
      teams: {
        away: { abbreviation: 'CIN' },
        home: { abbreviation: 'TB' },
      },
    },
    liveData: {
      linescore: {
        innings: [],
        teams: {
          away: { runs: '—', hits: '—', errors: '—' },
          home: { runs: '—', hits: '—', errors: '—' },
        },
      },
      plays: {},
    },
  },
};

describe('TodaysGames', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    apiService.getPredictions.mockResolvedValue({
      predictions: [
        {
          game_pk: 824776,
          away_team_name: 'Detroit Tigers',
          home_team_name: 'Boston Red Sox',
          away_win_probability: 0.51,
          home_win_probability: 0.49,
          predicted_winner: 'Detroit Tigers',
          model_version: 'v10',
          confidence_tier: 'low',
          lineup_confirmed: true,
          elo_differential: -47,
          home_pythag_season: 0.42,
          away_pythag_season: 0.6,
        },
        {
          game_pk: 824777,
          away_team_name: 'Houston Astros',
          home_team_name: 'Cleveland Guardians',
          away_win_probability: 0.44,
          home_win_probability: 0.56,
          predicted_winner: 'Cleveland Guardians',
          away_starter_name: 'Valdez',
          home_starter_name: 'Bibee',
          model_version: 'v10',
          confidence_tier: 'medium',
          lineup_confirmed: false,
        },
      ],
    });
    apiService.getGames.mockResolvedValue(scheduleResponse);
    apiService.getGameDetails.mockImplementation(async (gamePk) => (
      liveFeeds[gamePk] || {
        gamePk: gamePk || 0,
        gameData: {
          teams: {
            away: { abbreviation: 'AWY' },
            home: { abbreviation: 'HME' },
          },
        },
        liveData: {
          linescore: {
            innings: [],
            teams: {
              away: { runs: '—', hits: '—', errors: '—' },
              home: { runs: '—', hits: '—', errors: '—' },
            },
          },
          plays: {},
        },
      }
    ));
  });

  afterEach(() => {
    jest.resetAllMocks();
    consoleErrorSpy.mockRestore();
  });

  test('separates live games from upcoming games', async () => {
    render(
      <MemoryRouter>
        <TodaysGames />
      </MemoryRouter>
    );

    const liveSection = await screen.findByRole('region', { name: /live now/i }).catch(() => null);
    const laterSection = await screen.findByRole('region', { name: /later today/i }).catch(() => null);

    const liveRegion = liveSection || screen.getByLabelText(/live now/i);
    const laterRegion = laterSection || screen.getByLabelText(/later today/i);

    await waitFor(() => {
      expect(apiService.getPredictions).toHaveBeenCalled();
    });

    expect(within(liveRegion).getByText('Detroit Tigers')).toBeInTheDocument();
    expect(within(liveRegion).queryByText('Houston Astros')).not.toBeInTheDocument();

    expect(within(laterRegion).getByText('Houston Astros')).toBeInTheDocument();
    expect(within(laterRegion).getByText('Cincinnati Reds')).toBeInTheDocument();
    expect(within(laterRegion).queryByText('Detroit Tigers')).not.toBeInTheDocument();
  });

  test('filters games by confidence tier', async () => {
    render(
      <MemoryRouter>
        <TodaysGames />
      </MemoryRouter>
    );

    await screen.findByText('Detroit Tigers');

    fireEvent.change(screen.getByLabelText(/confidence/i), {
      target: { value: 'medium' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Detroit Tigers')).not.toBeInTheDocument();
    });

    const laterRegion = await screen.findByRole('region', { name: /later today/i });
    expect(within(laterRegion).getByText('Houston Astros')).toBeInTheDocument();
    expect(within(laterRegion).queryByText('Cincinnati Reds')).not.toBeInTheDocument();
  });
});
