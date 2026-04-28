import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameDetailsPage from './Game';
import apiService from '../services/api';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ gamePk: '824776' }),
}));

jest.mock('./LiveGameStrikeZone', () => () => <div>StrikeZone</div>);
jest.mock('./BoxScore', () => () => <div>BoxScore</div>);
jest.mock('./ScoutingReport', () => ({ report }) => (
  <div data-testid="scouting-report">
    {report?.prediction?.predicted_winner || report?.predicted_winner || 'report'}
  </div>
));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getGameDetails: jest.fn(),
    getPredictions: jest.fn(),
    getScoutingReportByGame: jest.fn(),
  },
}));

const mockGameDetails = {
  gameData: {
    teams: {
      away: { abbreviation: 'DET', name: 'Detroit Tigers', teamName: 'Tigers' },
      home: { abbreviation: 'BOS', name: 'Boston Red Sox', teamName: 'Red Sox' },
    },
    status: {
      abstractGameState: 'Live',
      detailedState: 'In Progress',
    },
    datetime: {
      dateTime: '2026-04-20T15:10:00Z',
    },
    venue: {
      name: 'Fenway Park',
    },
    weather: {
      condition: 'Partly Cloudy',
      temp: 47,
      wind: '9 mph, Out To RF',
    },
    probablePitchers: {},
  },
  liveData: {
    linescore: {
      currentInning: 9,
      inningHalf: 'Top',
      outs: 1,
      offense: {
        team: { id: 116 },
        first: { fullName: 'Gleyber Torres' },
        third: { fullName: 'Kevin McGonigle' },
      },
      teams: {
        away: { runs: 6 },
        home: { runs: 8 },
      },
      innings: [
        { away: { runs: 1 }, home: { runs: 0 } },
        { away: { runs: 0 }, home: { runs: 2 } },
      ],
    },
    plays: {
      currentPlay: {
        about: {
          atBatIndex: 2,
          halfInning: 'top',
          inning: 9,
        },
        count: {
          balls: 0,
          strikes: 1,
          outs: 2,
        },
        matchup: {
          batter: { fullName: 'Riley Greene' },
          pitcher: { fullName: 'Aroldis Chapman' },
          batSide: { code: 'L' },
        },
        result: {
          description: 'Riley Greene flies out to center fielder Jarren Duran.',
          rbi: 0,
        },
        playEvents: [],
      },
      allPlays: [
        {
          about: {
            atBatIndex: 1,
            halfInning: 'top',
            inning: 9,
            isScoringPlay: true,
          },
          count: {
            balls: 2,
            strikes: 2,
            outs: 1,
          },
          matchup: {
            batter: { fullName: 'Gleyber Torres' },
            pitcher: { fullName: 'Aroldis Chapman' },
            batSide: { code: 'R' },
          },
          result: {
            description: 'Gleyber Torres singles on a fly ball to right fielder Wilyer Abreu. Hao-Yu Lee scores.',
            rbi: 1,
            awayScore: 6,
            homeScore: 8,
          },
          playEvents: [],
        },
        {
          about: {
            atBatIndex: 0,
            halfInning: 'bottom',
            inning: 7,
            isScoringPlay: true,
          },
          count: {
            balls: 0,
            strikes: 2,
            outs: 2,
          },
          matchup: {
            batter: { fullName: 'Ceddanne Rafaela' },
            pitcher: { fullName: 'Brant Hurter' },
            batSide: { code: 'R' },
          },
          result: {
            description: 'Ceddanne Rafaela singles on a line drive to right fielder Wenceel Perez. Masataka Yoshida scores. Trevor Story scores.',
            rbi: 2,
            awayScore: 3,
            homeScore: 6,
          },
          playEvents: [],
        },
        {
          about: {
            atBatIndex: -1,
            halfInning: 'top',
            inning: 6,
            isScoringPlay: true,
          },
          count: {
            balls: 0,
            strikes: 2,
            outs: 0,
          },
          matchup: {
            batter: { fullName: 'Jahmai Jones' },
            pitcher: { fullName: 'Justin Wilson' },
            batSide: { code: 'R' },
          },
          result: {
            description: 'Jahmai Jones singles on a line drive to center fielder Jarren Duran. Riley Greene scores.',
            rbi: 1,
            awayScore: 3,
            homeScore: 2,
          },
          playEvents: [],
        },
        {
          about: {
            atBatIndex: -2,
            halfInning: 'bottom',
            inning: 2,
            isScoringPlay: true,
          },
          count: {
            balls: 4,
            strikes: 1,
            outs: 2,
          },
          matchup: {
            batter: { fullName: 'Wilyer Abreu' },
            pitcher: { fullName: 'Jack Flaherty' },
            batSide: { code: 'L' },
          },
          result: {
            description: 'Wilyer Abreu walks. Marcelo Mayer scores. Carlos Narvaez to 3rd. Roman Anthony to 2nd.',
            rbi: 1,
            awayScore: 0,
            homeScore: 2,
          },
          playEvents: [],
        },
        {
          about: {
            atBatIndex: 2,
            halfInning: 'top',
            inning: 9,
            isScoringPlay: false,
          },
          count: {
            balls: 0,
            strikes: 1,
            outs: 2,
          },
          matchup: {
            batter: { fullName: 'Riley Greene' },
            pitcher: { fullName: 'Aroldis Chapman' },
            batSide: { code: 'L' },
          },
          result: {
            description: 'Riley Greene flies out to center fielder Jarren Duran.',
            rbi: 0,
          },
          playEvents: [],
        },
      ],
    },
    boxscore: {
      teams: {
        away: {
          batters: [11, 12],
          pitchers: [21, 22],
          players: {
            ID11: {
              person: { id: 11, fullName: 'Riley Greene' },
              position: { type: 'Outfielder', abbreviation: 'LF' },
              stats: { batting: { hits: 2, rbi: 2, baseOnBalls: 2 } },
              seasonStats: { batting: { avg: '.300', obp: '.400', slg: '.500' } },
            },
            ID12: {
              person: { id: 12, fullName: 'Gleyber Torres' },
              position: { type: 'Infielder', abbreviation: '2B' },
              stats: { batting: { hits: 1, rbi: 1, baseOnBalls: 1 } },
              seasonStats: { batting: { avg: '.280', obp: '.360', slg: '.420' } },
            },
            ID21: {
              person: { id: 21, fullName: 'Jack Flaherty' },
              stats: { pitching: { inningsPitched: '3.1', numberOfPitches: 73, runs: 2 } },
              seasonStats: { pitching: { wins: 1, losses: 0, era: '3.00', whip: '1.10', strikeoutsPer9Inn: '9.0' } },
            },
            ID22: {
              person: { id: 22, fullName: 'Brant Hurter' },
              stats: { pitching: { inningsPitched: '2.2', numberOfPitches: 41, runs: 1 } },
              seasonStats: { pitching: { wins: 0, losses: 0, era: '2.70', whip: '1.15', strikeoutsPer9Inn: '8.4' } },
            },
          },
        },
        home: {
          batters: [31, 32],
          pitchers: [41, 42, 43],
          players: {
            ID31: {
              person: { id: 31, fullName: 'Ceddanne Rafaela' },
              position: { type: 'Outfielder', abbreviation: 'CF' },
              stats: { batting: { hits: 1, rbi: 2, baseOnBalls: 0 } },
              seasonStats: { batting: { avg: '.250', obp: '.310', slg: '.410' } },
            },
            ID32: {
              person: { id: 32, fullName: 'Carlos Narvaez' },
              position: { type: 'Catcher', abbreviation: 'C' },
              stats: { batting: { hits: 2, rbi: 1, baseOnBalls: 1 } },
              seasonStats: { batting: { avg: '.265', obp: '.345', slg: '.430' } },
            },
            ID41: {
              person: { id: 41, fullName: 'Sonny Gray' },
              stats: { pitching: { inningsPitched: '2.2', numberOfPitches: 40, runs: 1 } },
              seasonStats: { pitching: { wins: 1, losses: 1, era: '4.10', whip: '1.28', strikeoutsPer9Inn: '8.8' } },
            },
            ID42: {
              person: { id: 42, fullName: 'Zack Kelly' },
              stats: { pitching: { inningsPitched: '1.2', numberOfPitches: 27, runs: 0 } },
              seasonStats: { pitching: { wins: 0, losses: 0, era: '2.20', whip: '1.04', strikeoutsPer9Inn: '9.1' } },
            },
            ID43: {
              person: { id: 43, fullName: 'Ryan Watson' },
              stats: { pitching: { inningsPitched: '1.1', numberOfPitches: 29, runs: 3 } },
              seasonStats: { pitching: { wins: 0, losses: 1, era: '5.40', whip: '1.41', strikeoutsPer9Inn: '7.7' } },
            },
          },
        },
      },
    },
  },
};

const mockPrediction = {
  game_pk: 824776,
  confidence_tier: 'LOW',
  predicted_winner: 'Detroit Tigers',
  away_team_name: 'Detroit Tigers',
  home_team_name: 'Boston Red Sox',
  away_win_probability: 0.55,
  home_win_probability: 0.45,
};

describe('GameDetailsPage', () => {
  beforeEach(() => {
    apiService.getGameDetails.mockResolvedValue(mockGameDetails);
    apiService.getPredictions.mockResolvedValue({ predictions: [mockPrediction] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const renderGamePage = () =>
    render(
      <MemoryRouter>
        <GameDetailsPage />
      </MemoryRouter>
    );

  test('renders a scouting report for a live game when one exists', async () => {
    apiService.getScoutingReportByGame.mockResolvedValue({
      report: JSON.stringify({
        prediction: {
          predicted_winner: 'Detroit Tigers',
        },
      }),
    });

    renderGamePage();

    await waitFor(() => {
      expect(apiService.getScoutingReportByGame).toHaveBeenCalledWith('824776');
    });

    expect(await screen.findByText(/scouting report/i)).toBeInTheDocument();
    expect(screen.getByTestId('scouting-report')).toHaveTextContent('Detroit Tigers');
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText(/game pulse/i)).toBeInTheDocument();
    expect(screen.getByText(/lead changes/i)).toBeInTheDocument();
    expect(screen.getByText(/leverage meter/i)).toBeInTheDocument();
    expect(screen.getByText(/response tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/bullpen burden/i)).toBeInTheDocument();
    expect(screen.getByText(/clutch performers/i)).toBeInTheDocument();
    const leadChangesCard = screen.getByText(/lead changes/i).closest('.pulse-stat');
    expect(leadChangesCard).not.toBeNull();
    expect(within(leadChangesCard).getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText(/game flow chart/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/full pregame scouting detail is not available/i)
    ).not.toBeInTheDocument();
  });

  test('falls back to model outlook when no scouting report exists', async () => {
    apiService.getScoutingReportByGame.mockRejectedValue(new Error('Resource not found'));

    renderGamePage();

    await waitFor(() => {
      expect(apiService.getScoutingReportByGame).toHaveBeenCalledWith('824776');
    });

    expect(await screen.findByText(/model outlook/i)).toBeInTheDocument();
    expect(screen.getByText(/full pregame scouting detail is not available/i)).toBeInTheDocument();
  });

  test('filters the play log down to scoring plays', async () => {
    apiService.getScoutingReportByGame.mockRejectedValue(new Error('Resource not found'));

    renderGamePage();

    const playByPlayCard = (await screen.findByText(/play by play/i)).closest('.card');
    expect(playByPlayCard).not.toBeNull();
    const playByPlayScope = within(playByPlayCard);

    expect(playByPlayScope.getByText(/gleyber torres singles/i)).toBeInTheDocument();
    expect(playByPlayScope.getByText(/riley greene flies out/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /scoring plays/i }));

    expect(playByPlayScope.getByText(/gleyber torres singles/i)).toBeInTheDocument();
    expect(playByPlayScope.queryByText(/riley greene flies out/i)).not.toBeInTheDocument();
  });
});
