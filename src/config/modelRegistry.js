/**
 * Model cards for the Models section, per sport.
 *
 * Keys match the backend registry (hanks_tank_backend src/config/models.config.ts); the
 * live numbers come from the API, never from here. Text here is checked against the code
 * that produces each prediction (hanks_tank_ml) and every number quoted is a measured
 * result from the research write-ups (dates given). If a claim changes, change it here
 * and in the matching /learn page.
 *
 * Shape of a card:
 *   name, role              headline and one-line role
 *   status                  production | shadow | benchmark | reference | backtest
 *   what                    what the model is, in plain English
 *   inputs[]                what it reads
 *   how                     how inputs become a probability
 *   record { live, backtest }  measured record in words (numbers from the research)
 *   strengths[] / weaknesses[] / caveats[]
 *   learn[]                 { href, label } — the teaching pages
 */

export const LEARN = {
  footballModels: { href: '/learn/football-models.html', label: 'Football models' },
  footballCompare: { href: '/learn/football-model-compare.html', label: 'Our models vs FPI and the market' },
  driveSim: { href: '/learn/football-drive-sim.html', label: 'The drive simulator' },
  matchups: { href: '/learn/football-matchups.html', label: 'Unit matchups (a null result)' },
  powerRankings: { href: '/learn/power-rankings.html', label: 'Power rankings' },
  v10Features: { href: '/learn/mlb-v10-features.html', label: 'Inside V10\'s features' },
  paSim: { href: '/learn/mlb-pa-simulator.html', label: 'The plate-appearance simulator' },
  mlCourse: { href: '/learn/ml-course.html', label: 'ML course' },
  mlLessons: { href: '/learn/ml-lessons.html', label: 'Lessons learned' },
  modelHistory: { href: '/learn/model-history.html', label: 'Model history V1 → V10' },
  v10VsSim: { href: '/learn/v10-vs-pa-sim.html', label: 'V10 vs the simulator' },
};

export const ROLE_LABEL = {
  production: 'Production',
  shadow: 'Shadow',
  benchmark: 'Benchmark to beat',
  reference: 'Reference',
  backtest: 'Backtest only',
};

/* ── MLB ─────────────────────────────────────────────────────────────── */

const MLB_CARDS = {
  v10: {
    name: 'V10',
    role: 'What the site predicts today',
    status: 'production',
    what: 'A gradient-boosted tree classifier (XGBoost) that answers "does the home team '
      + 'win?" from a wide table of team, starter and park features.',
    inputs: [
      'Team strength: Elo, season and last-30-day Pythagorean record, recent run differential, streaks',
      'Starting pitchers: xERA, K%, BB%, a quality composite, rest',
      'Park factor, rest days, series position, head-to-head, division game',
      'The deployed model (trained 2026-04-29) uses 73 features, not the 158 listed in the code',
    ],
    how: 'Hundreds of shallow decision trees each correct the ones before; their summed '
      + 'score becomes a probability. Predictions are written about 90 minutes before first '
      + 'pitch once lineups post.',
    record: {
      live: 'Over the genuine pregame 2026 predictions measured on 2026-09-08 (1,763 games) it '
        + 'was right 53.72% of the time against 52.81% for "always pick home" — an edge of '
        + 'under a point. Its Brier score (0.2500) matched predicting 50% every game.',
      backtest: 'Its best trait: at the sharp end its top 100 picks hit 62.0% vs 55-57% for '
        + 'better-calibrated candidates. On log loss it is the worst of the candidates in all '
        + '18 sensitivity configurations tested.',
    },
    strengths: [
      'Confident picks are genuinely better than its average pick.',
      'Uses information the simpler models ignore (starter quality, park).',
    ],
    weaknesses: [
      'Poorly calibrated: its probabilities are too spread out for how little it knows.',
      'Never retrained since April: the weekly "train v10" job actually runs the V8 trainer.',
    ],
    caveats: [
      'Three inputs are served differently than in training (season progress pinned at 1.0, '
        + 'day-of-week numbering, a flipped luck sign). Fixed on a branch, not deployed; the '
        + 'fix moves log loss by about 0.001.',
      'The table also holds 418 post-game backfill rows; the scoreboard ignores anything '
        + 'written after first pitch.',
      'The "61.48%" in the old V10 write-up was 283 early games scored with features rebuilt '
        + 'after the fact.',
    ],
    learn: [LEARN.v10Features, LEARN.modelHistory, LEARN.v10VsSim],
  },
  logit3: {
    name: '3-feature logistic',
    role: 'Simple baseline — the model everything else has to beat',
    status: 'shadow',
    what: 'A logistic regression on just three numbers. It is the model an automated '
      + 'search kept choosing over everything more complicated.',
    inputs: [
      'elo_differential — home minus away Elo rating',
      'pythag_differential — home minus away Pythagorean win expectation',
      'sp_quality_composite_diff — home minus away starting-pitcher quality',
    ],
    how: 'Each input is standardised, multiplied by a weight, summed and squashed into a '
      + 'probability. An L1 penalty (C = 0.557) keeps the weights small. It is refit on this '
      + 'season\'s completed games only, because training on 2015-2025 measured worse.',
    record: {
      live: 'Shadow writer built, not deployed: no live rows yet.',
      backtest: 'On the untouched 400-game holdout (2026-08-08 to 09-07) it scored log loss '
        + '0.6821 and 56.75% accuracy vs V10\'s 0.6859 and 57.50%. 450 search trials across '
        + '7 model families and 161 features rediscovered it; nothing beat it in both the '
        + 'search window and the holdout.',
    },
    strengths: [
      'Three parameters: almost nothing to overfit.',
      'The best-calibrated of our own game-level models.',
    ],
    weaknesses: [
      'Rarely confident: calibrated on a near-coin-flip sport, it almost never passes 64%.',
      'Its accuracy is not significantly better than V10\'s (McNemar p = 0.37-1.00).',
    ],
    caveats: [
      'Its gain over V10 is on log loss (calibration), not on picking winners.',
      'On the 207 unseen games after 09-07 it did worse than V10; small sample, wide CIs.',
    ],
    learn: [LEARN.mlLessons, LEARN.mlCourse],
  },
  sim_blend: {
    name: 'PA simulator + strength blend',
    role: 'Shadow — the only simulator output with a measured gain',
    status: 'shadow',
    what: 'Plays each game out plate appearance by plate appearance thousands of times with '
      + 'the actual lineups and starters, then blends the simulated win rate with a simple '
      + 'team-strength model.',
    inputs: [
      'Every plate appearance since 2015 (Statcast), time-weighted (one-year decay)',
      'The posted batting orders and starting pitchers',
      'Platoon splits for batter and pitcher, home field, per-outcome park factors',
      'Recent bullpen usage, a fitted starter-removal hazard, empirical base-out transitions',
      'Team strength: Elo and season-to-date Pythagorean record',
    ],
    how: 'Each batter-pitcher matchup gets a probability for nine outcomes (strikeout, walk, '
      + 'single … out in the air), shrunk toward league rates when the sample is thin. Thousands '
      + 'of simulated games give a raw win rate. A logistic regression fit on earlier seasons '
      + 'then combines logit(sim) with logit(strength) into the final probability.',
    record: {
      live: 'Shadow writer built, not deployed: it needs 1.3-2.2 GB of memory and the live '
        + 'Cloud Function has 1 GB.',
      backtest: 'Config frozen on 2016-19, then scored once on 15,000 games from 2020-26: the '
        + 'blend beat strength alone by 0.0021 log loss (95% CI 0.0010 to 0.0032). The '
        + 'simulator alone only ties it. It still loses to the closing line.',
    },
    strengths: [
      'Uses who is actually playing tonight, not team averages.',
      'Produces whole distributions — run totals and strikeouts — not just a winner.',
    ],
    weaknesses: [
      'The gain is real but tiny: about two thousandths of a nat per game.',
      'Needs confirmed lineups, so it can only run an hour or two before first pitch.',
    ],
    caveats: [
      'Raw simulated totals run hot (+0.2 to +0.8 runs a game in 2022-26, cause unknown), so '
        + 'totals are re-centred before use.',
      'Mostly the same information as team strength, reparameterised; that is why the '
        + 'blend, not the sim alone, is the candidate.',
    ],
    learn: [LEARN.paSim, LEARN.v10VsSim],
  },
  elo: {
    name: 'Elo',
    role: 'Reference — the production pipeline\'s own rating, shown on its own',
    status: 'reference',
    what: 'A single rating per team that goes up after a win and down after a loss, by more '
      + 'when the result was a surprise.',
    inputs: ['Game results only (win or loss)', 'A hand-set 2026 starting rating per team'],
    how: 'Win probability = 1 / (1 + 10^(−(home − away + 80) / 400)). Ratings move by '
      + 'K = 15 times the surprise after each game and regress 40% to the mean between seasons.',
    record: {
      live: 'Raw Elo scored 53.78% over the 2026 season to 09-08, level with V10 (53.72%), '
        + 'but with a much worse Brier score (0.2613).',
      backtest: 'A research Elo with a 24-point home bonus and margin-of-victory updates, '
        + 'blended with Pythagorean record, is the "strength" model the simulator is measured against.',
    },
    strengths: ['Transparent: one number per team.', 'Picks winners about as well as V10.'],
    weaknesses: [
      'The 80-point home bonus alone says 61% for two equal teams; MLB home teams win about '
        + '53%. Its probabilities lean home and run too confident.',
    ],
    caveats: ['Not a candidate model: shown so the gap between "who is better" and '
      + '"how likely" is visible.'],
    learn: [LEARN.mlCourse, LEARN.modelHistory],
  },
  market: {
    name: 'Betting market',
    role: 'The benchmark to beat',
    status: 'backtest',
    what: 'The closing moneyline, with the bookmaker\'s margin removed: the crowd\'s price '
      + 'including every lineup, injury and weather update up to first pitch.',
    inputs: ['Closing moneylines, 2012-2021 (Kaggle vig-free lines, SBR archive fallback)'],
    how: 'A de-vigged moneyline already is a probability.',
    record: {
      live: 'No live MLB odds are ingested, so the market is not on the live scoreboard.',
      backtest: 'On 14,859 games (2015-21): 58.50% accuracy, log loss 0.67152, calibrated '
        + 'within about a point in most buckets (worst +2.0 at 0.65+). Its edge over "always home" is 2.65 times ours. '
        + 'Adding our features on top of the line did not help, and betting our disagreements '
        + 'with it lost 10-27%.',
    },
    strengths: ['The best-calibrated forecast of all.', 'Prices news we never see.'],
    weaknesses: ['Only 2012-2021 is stored; live odds need a fetch from GCP.'],
    caveats: ['"Beat the market" is not our modelling goal: the gap is information, not tuning.'],
    learn: [LEARN.mlLessons, LEARN.v10VsSim],
  },
};

/* ── Football ────────────────────────────────────────────────────────── */

const MARKET_FOOTBALL = {
  name: 'Betting market',
  role: 'The benchmark to beat',
  status: 'benchmark',
  what: 'The price bookmakers set: thousands of bettors with money on the line, including '
    + 'every piece of news up to kickoff.',
  inputs: [
    'NFL: closing moneylines from nflverse, with the bookmaker\'s margin (vig) removed',
    'College: the median spread across sportsbooks (CollegeFootballData)',
    'Where only a spread exists: a normal curve, σ = 13.45 points (NFL) or 15.5 (college)',
  ],
  how: 'A de-vigged moneyline already is a probability. A spread is a predicted margin; a '
    + '7-point college favourite comes out about 67%.',
  strengths: ['Knows injuries, weather and quarterback news we never see.'],
  weaknesses: ['College uses a fixed spread-to-probability curve, slightly under-confident.'],
  caveats: ['No model here has beaten it over a full season. The margin ridge went 50.5% '
    + 'against the spread — no betting edge.'],
  learn: [LEARN.footballCompare],
};

const FPI = {
  name: 'ESPN FPI',
  role: 'Reference — ESPN\'s model, not ours, and not a target',
  status: 'reference',
  what: 'ESPN\'s Football Power Index turned into a game-by-game win probability and margin.',
  inputs: [
    'Proprietary: efficiency on offence, defence and special teams plus preseason priors '
      + '(returning starters, recruiting in college, the quarterback in the NFL).',
    'We only read its output: ESPN\'s matchup predictor for each game.',
  ],
  how: 'We snapshot ESPN\'s published probability before kickoff and store it with the time '
    + 'captured. NFL numbers leave room for a tie, so they are rescaled to sum to 100%.',
  strengths: ['Strong early in the college season, from priors we do not use.'],
  weaknesses: ['A black box: nothing to learn from its errors.'],
  caveats: [
    'We never tune toward FPI. Its snapshot table is built but not deployed, so live FPI '
      + 'rows may be missing.',
  ],
  learn: [LEARN.footballCompare],
};

const NFL_CARDS = {
  market: {
    ...MARKET_FOOTBALL,
    record: {
      backtest: 'NFL 2017-24 walk-forward: log loss 0.6086; 2024-25 with FPI: 0.5981 vs '
        + '0.63 for our models. It beats every model here, clearly outside the noise.',
    },
  },
  ridge: {
    name: 'Margin ridge',
    role: 'Shadow — candidate replacement for XGBoost',
    status: 'shadow',
    what: 'One power rating per team, in points, fit so home rating minus away rating plus '
      + 'home-field advantage matches actual scoring margins.',
    inputs: ['Final scores from a decaying two-season window', 'Neutral-site flag'],
    how: 'Ridge regression (least squares that pulls thin-evidence ratings toward average), '
      + 'recent weeks weighted more. The predicted margin becomes a probability through a '
      + 'normal curve (σ ≈ 12.5 points in the NFL).',
    record: {
      backtest: 'Walk-forward log loss 0.6342 (2017-24) and 0.6339 (2025) vs the old '
        + 'production XGBoost\'s 0.6455 and 0.6416. Against the EPA-fixed XGBoost it is '
        + 'within noise (−0.008, CI crosses 0).',
    },
    strengths: ['Few parameters; models the margin, which carries more information than won/lost.'],
    weaknesses: ['Knows nothing about injuries, weather or who starts at quarterback.'],
    caveats: ['Adding rest, EPA or run/pass unit matchups made it worse, not better.'],
    learn: [LEARN.footballModels, LEARN.matchups],
  },
  xgb: {
    name: 'XGBoost',
    role: 'Production — what the NFL picks page shows',
    status: 'production',
    what: 'A gradient-boosted tree classifier voting on "does the home team win?".',
    inputs: [
      'Elo, season Pythagorean record, point differential over the last 3 and 8 games, streaks',
      'Divisional game, rest and byes; rolling EPA per play over 8 games',
    ],
    how: 'Retrained weekly on every NFL game since 1999; the trees output a probability. It '
      + 'never sees the betting line.',
    record: {
      live: 'Every stored 2025-26 NFL prediction ran with EPA missing (a cold-start cache '
        + 'bug), so the live rows are the model without its best input.',
      backtest: 'With EPA fixed (backfilled), 2024-25: log loss 0.6257, level with the ridge '
        + '(0.6313) and FPI (0.6279) — the three tie.',
    },
    strengths: ['Can use many signals at once.'],
    weaknesses: ['90 features, 38 of them exact linear duplicates; about 3 real signals. A '
      + '4-feature logistic beat it.'],
    caveats: ['The EPA fix is on a branch and not deployed.', 'No margin, so no spread error.'],
    learn: [LEARN.footballModels, LEARN.footballCompare],
  },
  fpi: {
    ...FPI,
    record: {
      backtest: 'NFL 2024-25 (569 games): log loss 0.6279, tied with XGBoost and the ridge.',
    },
  },
  drive_sim: {
    name: 'Drive simulator',
    role: 'Backtest only — margin and total distributions',
    status: 'backtest',
    what: 'Plays each NFL game out drive by drive thousands of times and counts wins, margins '
      + 'and totals.',
    inputs: [
      '111,627 drives from 2008-25',
      'Team offence and defence, home field, clock, starting field position, game-script state',
    ],
    how: 'Each drive ends in one of nine outcomes from a shrunk multinomial model; the next '
      + 'drive starts where the last one left the ball; a pace model sets how many drives a '
      + 'game has. Frozen on 2010-16 before anything was scored.',
    record: {
      live: 'No live writer: research only.',
      backtest: 'Winners: ties the ridge (0.6331 vs 0.6342, 2017-24; its margin correlates '
        + '0.958 with the ridge). Its margin shape, centred on the spread, beats a normal '
        + 'curve by 0.061 nats. Totals: loses to the market (MAE 10.85 vs 10.53).',
    },
    strengths: ['The only model here with a realistic distribution of exact margins.'],
    weaknesses: ['Same information as the ridge, reparameterised: no gain on winners.'],
    caveats: ['Puts 9.7% of games at exactly 3 points vs 14.9% actual — end-game decisions '
      + 'are not modelled.', 'NFL only: college drives need a paid data key.'],
    learn: [LEARN.driveSim],
  },
};

const CFB_CARDS = {
  market: {
    ...MARKET_FOOTBALL,
    record: {
      backtest: 'FBS 2025 (933 games): log loss 0.4663, ahead of FPI (0.4718) and the ridge (0.4823).',
    },
  },
  fpi: {
    ...FPI,
    record: {
      backtest: 'FBS 2025: log loss 0.4718. It edges the ridge by 0.011 (CI −0.023 to +0.001), '
        + 'almost all of it in weeks 1-4; from week 5 they tie.',
    },
  },
  ridge: {
    ...NFL_CARDS.ridge,
    role: 'Shadow — candidate replacement for the legacy XGBoost',
    inputs: [
      'Final scores from a decaying two-season window',
      'Neutral site, an FBS-vs-FCS division term, and margins capped at 45 points',
    ],
    how: 'Ridge regression over team ratings with recent weeks weighted more; the margin '
      + 'becomes a probability through a normal curve (σ ≈ 15.5 points).',
    record: {
      backtest: 'FBS log loss 0.4948 (2023-24) and 0.4801 (2025) vs XGBoost\'s 0.5406 and '
        + '0.5313 — a 0.05 gain with the CI clear of zero.',
    },
    caveats: ['Adding EPA, unit matchups or rest did not help.'],
    learn: [LEARN.footballModels, LEARN.footballCompare],
  },
  xgb: {
    name: 'XGBoost',
    role: 'Legacy production — what the college picks page shows today',
    status: 'production',
    what: 'A gradient-boosted tree classifier, fit separately for FBS and FCS.',
    inputs: ['Elo (damped for blowouts), season Pythagorean, point differential over 3 and 8 '
      + 'games, win rate, streaks', 'Conference game, neutral site'],
    how: 'Retrained weekly on college games since 2021; the trees output a probability.',
    record: {
      live: 'All 382 predictions for 2026 weeks 2-4 were made with last-3-games point '
        + 'differential = 0 (a cold-start bug), fixed on a branch, not deployed.',
      backtest: 'FBS 2025 log loss 0.5318 — clearly behind the ridge (0.4823), FPI and the market.',
    },
    strengths: ['Already running every week.'],
    weaknesses: ['The weakest model on the page by a wide, certain margin.'],
    caveats: ['Scheduled to be replaced by the margin ridge once the shadow earns it.'],
    learn: [LEARN.footballModels],
  },
};

export const MODEL_CARDS = { mlb: MLB_CARDS, nfl: NFL_CARDS, cfb: CFB_CARDS };

export const MODEL_ORDER = {
  mlb: ['v10', 'logit3', 'sim_blend', 'elo', 'market'],
  nfl: ['market', 'ridge', 'xgb', 'fpi', 'drive_sim'],
  cfb: ['market', 'fpi', 'ridge', 'xgb'],
};

/** Short names for chart legends and table columns. */
export function shortName(sport, key) {
  const short = {
    v10: 'V10', logit3: 'Logit-3', sim_blend: 'Sim blend', elo: 'Elo', market: 'Market',
    ridge: 'Ridge', xgb: 'XGBoost', fpi: 'FPI', drive_sim: 'Drive sim',
    strength: 'Strength', pa_sim: 'PA sim', home_rate: '53% home',
  };
  return short[key] || MODEL_CARDS[sport]?.[key]?.name || key;
}

export const SPORT_INTRO = {
  mlb: 'Baseball is close to a coin flip: the best public models pick about 58% and the '
    + 'honest gap between our models is a few thousandths of a nat. That is why every number '
    + 'here carries its interval.',
  nfl: 'Four model families and the betting line, scored on the same games. The market is '
    + 'the bar; ESPN FPI is context, not a target.',
  cfb: 'In college the gaps are big enough to see: the margin ridge is far ahead of the '
    + 'legacy XGBoost, and FPI and the market are ahead of both early in the season.',
};
