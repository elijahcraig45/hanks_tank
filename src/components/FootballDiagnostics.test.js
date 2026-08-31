import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FootballDiagnostics from './FootballDiagnostics';
import ApiService from '../services/api';
import {
  buildVegasComparison,
  buildContextSplits,
  buildConferenceBreakdown,
  filterFootballDiagnostics,
} from '../utils/footballDiagnostics';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { getFootballDiagnostics: jest.fn() },
}));

const row = (over = {}) => ({
  gameId: Math.random().toString(36).slice(2),
  season: 2025,
  week: 3,
  gameDate: '2025-09-20',
  homeTeamName: 'Georgia Bulldogs',
  awayTeamName: 'Auburn Tigers',
  homeWinProbability: 0.8,
  awayWinProbability: 0.2,
  predictedWinner: 'Georgia Bulldogs',
  predictedWinProbability: 0.8,
  actualWinner: 'Georgia Bulldogs',
  actualHomeWin: true,
  confidenceTier: 'HIGH',
  modelVersion: 'cfb_v1',
  edge: 0.6,
  correct: true,
  brierScore: 0.04,
  logLoss: 0.22,
  neutralSite: false,
  isDivisional: true,
  crossDivision: false,
  vegasCorrect: null,
  ...over,
});

const LEAGUE = { key: 'fbs', sport: 'cfb', division: 'fbs', label: 'College FBS' };

describe('FootballDiagnostics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('summarizes accuracy across the returned games', async () => {
    ApiService.getFootballDiagnostics.mockResolvedValue({
      diagnostics: [row(), row({ correct: false }), row(), row()],
      meta: { count: 4, seasons: [2025], models: ['cfb_v1'] },
    });

    render(<FootballDiagnostics league={LEAGUE} />);

    expect(await screen.findByText('4 of 4 games')).toBeInTheDocument();
    // Scoped to the headline tile: the same figure also appears in the tier breakdown,
    // because every fixture game is HIGH confidence.
    const accuracyTile = screen.getByText('Accuracy').closest('.fd-tile');
    expect(accuracyTile).toHaveTextContent('75.0%');
  });

  test('season chips narrow the sample', async () => {
    ApiService.getFootballDiagnostics.mockResolvedValue({
      diagnostics: [
        row({ season: 2024 }), row({ season: 2024 }),
        row({ season: 2025, correct: false }),
      ],
      meta: { count: 3, seasons: [2024, 2025], models: ['cfb_v1'] },
    });

    render(<FootballDiagnostics league={LEAGUE} />);
    await screen.findByText('3 of 3 games');

    // Turning 2024 and 2026 off leaves only the 2025 game.
    await userEvent.click(screen.getByRole('button', { name: '2024' }));
    await waitFor(() => expect(screen.getByText('1 of 3 games')).toBeInTheDocument());
  });

  test('never lets the last season be switched off', async () => {
    ApiService.getFootballDiagnostics.mockResolvedValue({
      diagnostics: [row({ season: 2025 })],
      meta: { count: 1, seasons: [2025], models: ['cfb_v1'] },
    });

    render(<FootballDiagnostics league={LEAGUE} />);
    await screen.findByText('1 of 1 games');

    for (const year of ['2026', '2025', '2024']) {
      await userEvent.click(screen.getByRole('button', { name: year }));
    }
    // One chip must remain selected, so a game is still shown.
    expect(screen.getByText(/of 1 games/)).toBeInTheDocument();
  });

  test('says so when a league has no scored predictions', async () => {
    ApiService.getFootballDiagnostics.mockResolvedValue({
      diagnostics: [], meta: { count: 0, note: 'No scored predictions yet.' },
    });

    render(<FootballDiagnostics league={LEAGUE} />);
    expect(await screen.findByText(/No scored predictions for College FBS/))
      .toBeInTheDocument();
  });

  test('distinguishes a failed request from an empty one', async () => {
    ApiService.getFootballDiagnostics.mockRejectedValue(new Error('boom'));

    render(<FootballDiagnostics league={LEAGUE} />);
    expect(await screen.findByText('Could not load diagnostics')).toBeInTheDocument();
  });
});

describe('footballDiagnostics utils', () => {
  test('vegas comparison uses only games that have a line', () => {
    const rows = [
      row({ correct: true, vegasCorrect: true }),
      row({ correct: true, vegasCorrect: false }),
      row({ correct: false, vegasCorrect: true }),
      row({ correct: true, vegasCorrect: null }), // no line: excluded from both sides
    ];

    const out = buildVegasComparison(rows);

    expect(out.games).toBe(3);
    expect(out.modelAccuracy).toBeCloseTo(2 / 3);
    expect(out.vegasAccuracy).toBeCloseTo(2 / 3);
    expect(out.agreementRate).toBeCloseTo(1 / 3);
    // Of the two disagreements, the model was right in one.
    expect(out.modelWinsDisagreements).toBeCloseTo(1 / 2);
  });

  test('vegas comparison is null when no line exists', () => {
    expect(buildVegasComparison([row({ vegasCorrect: null })])).toBeNull();
  });

  test('context split label follows the sport', () => {
    // The same flag means "conference game" in college and "divisional" in the NFL.
    const rows = [row({ isDivisional: true }), row({ isDivisional: false })];

    const college = buildContextSplits(rows, 'Conference game');
    const nfl = buildContextSplits(rows, 'Division game');

    expect(college.find((s) => s.key === 'conference').label).toBe('Conference game');
    expect(college.find((s) => s.key === 'nonconference').label).toBe('Non-conference');
    expect(nfl.find((s) => s.key === 'conference').label).toBe('Division game');
    expect(nfl.find((s) => s.key === 'nonconference').label).toBe('Non-divisional');
  });

  test('context splits separate conference from non-conference', () => {
    const rows = [
      row({ isDivisional: true }), row({ isDivisional: true }),
      row({ isDivisional: false, correct: false }),
    ];

    const splits = buildContextSplits(rows);
    const conf = splits.find((s) => s.key === 'conference');
    const non = splits.find((s) => s.key === 'nonconference');

    expect(conf.games).toBe(2);
    expect(conf.accuracy).toBe(1);
    expect(non.games).toBe(1);
    expect(non.accuracy).toBe(0);
  });

  test('a cross-conference game counts for both conferences', () => {
    const conferenceOf = (team) =>
      team === 'Georgia Bulldogs' ? 'SEC' : 'Big Ten';
    const rows = Array.from({ length: 5 }, () => row());

    const out = buildConferenceBreakdown(rows, conferenceOf);

    expect(out.map((o) => o.key).sort()).toEqual(['Big Ten', 'SEC']);
    expect(out.every((o) => o.games === 5)).toBe(true);
  });

  test('conferences with fewer than five games are omitted as noise', () => {
    const conferenceOf = () => 'Tiny';
    expect(buildConferenceBreakdown([row(), row()], conferenceOf)).toHaveLength(0);
  });

  test('filter matches a conference on either side of the game', () => {
    const conferenceOf = (team) => (team === 'Auburn Tigers' ? 'SEC' : 'Other');
    const rows = [row(), row({ homeTeamName: 'X', awayTeamName: 'Y' })];

    const out = filterFootballDiagnostics(rows, {
      seasons: [2025], tier: 'all', context: 'all', conference: 'SEC',
      model: 'all', hideMismatch: false, search: '', conferenceOf,
    });

    expect(out).toHaveLength(1);
  });
});
