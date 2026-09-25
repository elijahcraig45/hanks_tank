/**
 * Plain-English descriptions of the football models on the comparison page.
 *
 * Keys match the backend registry (hanks_tank_backend src/config/football-models.config.ts).
 * A new model is one entry there and one here; an entry here with no backend rows
 * simply renders as "not live yet".
 *
 * Every claim below is checked against the code that produces the numbers
 * (hanks_tank_ml: src/nfl/features.py, src/nfl/train_nfl_models.py, src/cfb/pipeline.py,
 * src/nfl/margin_ridge.py, src/rankings/fpi_games.py). `backtest` records were measured
 * on 2026-09-25 by scripts/football/eval_fpi_vs_models.py. They are NOT the live
 * scoreboard: the ridge and FPI columns in them were computed or fetched after the
 * games, so they sit in their own box, labelled.
 */

export const BACKTEST_DATE = '2026-09-25';

export const FOOTBALL_MODELS = {
  xgb: {
    name: 'Production XGBoost',
    role: 'What the site predicts today',
    what: 'A gradient-boosted decision-tree classifier: hundreds of shallow trees, each '
      + 'correcting the previous ones, voting on "does the home team win?".',
    inputs: [
      'Elo ratings for both teams, updated after every game (college Elo is damped for blowouts)',
      'Season Pythagorean win expectation from points scored and allowed',
      'Point differential over the last 3 and 8 games, win rate over the last 8, streaks',
      'Context: divisional/conference game, neutral site, rest days and byes (NFL)',
      'NFL only: rolling EPA-per-play form — but see the caveat',
    ],
    how: 'Retrained every week on every earlier game (NFL since 1999; college since '
      + '2021, fit separately for FBS and FCS). The trees output a probability directly. '
      + 'It never sees the betting line.',
    caveats: [
      'It predicts only who wins, not by how much, so it has no spread error.',
      'Every NFL prediction stored so far ran without its EPA inputs — a cold-start bug, '
        + 'fixed on a branch but not deployed.',
      'College weeks 2-4 of 2026 ran without that season\'s results (point differentials '
        + 'all zero), another cold-start bug fixed on the same branch.',
      '2024-25 rows are backfills written after the fact, so the live scoreboard '
        + 'ignores them.',
    ],
  },
  ridge: {
    name: 'Margin ridge',
    role: 'Shadow model — candidate replacement, not shown on the picks page',
    what: 'One power rating per team, in points, fit so that home rating minus away '
      + 'rating plus home-field advantage matches the actual scoring margins.',
    inputs: [
      'Final scores only — every game over the last two seasons',
      'Whether the game was at a neutral site',
      'College only: an FBS-vs-FCS term, and margins capped at 45 so blowouts do not dominate',
    ],
    how: 'Ridge regression (a least-squares fit that pulls ratings toward average when '
      + 'evidence is thin), with recent weeks weighted more: a game 16 weeks ago counts '
      + 'about a third as much as last week. The predicted margin becomes a win '
      + 'probability through a normal curve: 3 points of edge is about 60% in the NFL '
      + '(spread 12.5 points), about 58% in college (spread 15.6).',
    caveats: [
      'About 35 parameters in the NFL against XGBoost\'s ~90 features — and it models the '
        + 'margin, which carries more information per game than won/lost.',
      'Knows nothing about injuries, weather, or who is starting at quarterback.',
      'Runs only in shadow (its own table) until it has earned a place on the picks page.',
    ],
  },
  fpi: {
    name: 'ESPN FPI',
    role: 'Shown for comparison — ESPN\'s model, not ours, and not a target',
    what: 'ESPN\'s Football Power Index: its own team ratings turned into a game-by-game '
      + 'win probability and predicted margin.',
    inputs: [
      'Proprietary. ESPN describes it as built from offensive, defensive and special-teams '
        + 'efficiency plus preseason priors (returning starters, recruiting in college, '
        + 'the quarterback in the NFL).',
      'We only read its output: ESPN\'s "matchup predictor" for each game.',
    ],
    how: 'We snapshot ESPN\'s published win probability before kickoff and store it with '
      + 'the time we captured it. NFL numbers leave room for a tie, so they are '
      + 'rescaled to sum to 100%.',
    caveats: [
      'We never tune our models toward FPI; it is a reference point, like the market.',
      'Its early-season edge comes from preseason priors we do not use — watch whether it '
        + 'lasts past week 4.',
      'ESPN keeps the number on finished games too; it matched their kickoff win '
        + 'probability in 99%+ of games we checked, but only snapshots we took before '
        + 'kickoff count here.',
    ],
  },
  market: {
    name: 'Betting market',
    role: 'The benchmark to beat',
    what: 'The price bookmakers set: thousands of bettors with money on the line, '
      + 'including every piece of news up to kickoff.',
    inputs: [
      'NFL: closing moneylines from nflverse, with the bookmaker\'s margin (vig) removed',
      'College: the median spread across sportsbooks from CollegeFootballData',
      'Where only a spread exists, we convert it with a normal curve (spread 13.45 NFL, '
        + '15.5 college)',
    ],
    how: 'A de-vigged moneyline is already a probability. A spread is a predicted margin; '
      + 'a 7-point college favourite comes out about 67%.',
    caveats: [
      'No model here has beaten it over a full season. Beating it is the only claim '
        + 'that would matter for betting — measured, ours do not.',
      'The college conversion is a fixed curve, slightly under-confident, so the market '
        + 'is if anything scored a little worse than it deserves.',
    ],
  },
  drive_sim: {
    name: 'Drive simulation',
    role: 'In development',
    what: 'Plays out each game drive by drive, many times over, from team offensive and '
      + 'defensive drive outcomes, and counts how often each side wins.',
    inputs: ['Being built — this card fills in once it writes predictions.'],
    how: 'Will write to its own table in the same shape as the others, and be scored '
      + 'here automatically.',
    caveats: ['Not live: nothing to score yet.'],
  },
};

/**
 * Backtest, measured 2026-09-25 (log loss / accuracy / Brier / spread MAE in points).
 * Paired-bootstrap 95% intervals are on the log-loss difference between two models on
 * the same games; negative means the first model is better.
 */
export const BACKTESTS = {
  nfl: {
    label: 'NFL 2024-25 regular + postseason',
    n: 569,
    rows: {
      xgb: { ll: 0.6257, acc: 0.647, brier: 0.2186, mae: null },
      ridge: { ll: 0.6313, acc: 0.650, brier: 0.2205, mae: 10.21 },
      fpi: { ll: 0.6279, acc: 0.666, brier: 0.2189, mae: 10.04 },
      market: { ll: 0.5981, acc: 0.684, brier: 0.2059, mae: 9.69 },
    },
    diffs: [
      { a: 'fpi', b: 'xgb', d: 0.0022, lo: -0.0136, hi: 0.0179 },
      { a: 'fpi', b: 'ridge', d: -0.0034, lo: -0.0194, hi: 0.0123 },
      { a: 'market', b: 'fpi', d: -0.0298, lo: -0.0421, hi: -0.0176 },
    ],
    verdict: 'XGBoost, the ridge and FPI are indistinguishable in the NFL; the market '
      + 'beats all three by about 0.03 log loss, clearly outside the noise.',
  },
  cfb: {
    label: 'College FBS 2025 full season',
    n: 933,
    rows: {
      xgb: { ll: 0.5318, acc: 0.730, brier: 0.1793, mae: null },
      ridge: { ll: 0.4823, acc: 0.757, brier: 0.1615, mae: 12.57 },
      fpi: { ll: 0.4718, acc: 0.753, brier: 0.1580, mae: 12.32 },
      market: { ll: 0.4663, acc: 0.767, brier: 0.1563, mae: 11.89 },
    },
    diffs: [
      { a: 'fpi', b: 'xgb', d: -0.0600, lo: -0.0800, hi: -0.0408 },
      { a: 'fpi', b: 'ridge', d: -0.0106, lo: -0.0225, hi: 0.0010 },
      { a: 'market', b: 'fpi', d: -0.0055, lo: -0.0155, hi: 0.0050 },
    ],
    verdict: 'In college both the ridge and FPI beat production XGBoost by a wide, '
      + 'certain margin. FPI edges the ridge, almost entirely in weeks 1-4 (after that '
      + 'they tie), and sits close to the market.',
  },
};

export const MODEL_ORDER = ['xgb', 'ridge', 'fpi', 'drive_sim', 'market'];
