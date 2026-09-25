/**
 * The /learn catalogue: long-form write-ups on how the models work and what was measured.
 *
 * Each page is a standalone HTML file in public/learn/, served as-is, copied and scrubbed
 * from the write-ups beside this repo by ml_writeups/sync_learn_pages.py. The slugs are
 * stable because other pages (the Models section) link to them directly, so rename a
 * file only together with every link to it.
 */

export const LEARN_BASE = '/learn';

export const learnPagePath = (slug) => `${LEARN_BASE}/${slug}.html`;

/** Topic groups, in reading order. `sport` sets the accent colour on the group. */
export const LEARN_GROUPS = [
  {
    key: 'foundations',
    label: 'Foundations',
    sport: 'all',
    blurb: 'The algorithms and the evaluation habits every other page leans on.',
  },
  {
    key: 'mlb',
    label: 'MLB',
    sport: 'mlb',
    blurb: 'Ten model generations, the V10 feature audit, and the plate-appearance simulator.',
  },
  {
    key: 'football',
    label: 'Football',
    sport: 'nfl',
    blurb: 'The margin ridge, the four-model scoreboard, drive simulation, and matchup tests for NFL and college.',
  },
  {
    key: 'rankings',
    label: 'Rankings',
    sport: 'cfb',
    blurb: 'How the MLB, NFL and college power rankings are fitted, scored and given rank ranges.',
  },
];

/** `minutes` is an estimate at about 220 words a minute, including the tables. */
export const LEARN_PAGES = [
  {
    slug: 'ml-course',
    group: 'foundations',
    title: 'The algorithms inside the models',
    description: 'Sixteen chapters from logistic regression to Kalman filters, each with the real fitted values.',
    minutes: 25,
  },
  {
    slug: 'ml-lessons',
    group: 'foundations',
    title: 'Ten machine-learning lessons from the MLB project',
    description: 'Leakage, walk-forward splits, calibration and statistical power, each shown with a measured example.',
    minutes: 13,
  },
  {
    slug: 'model-history',
    group: 'mlb',
    title: 'Ten model generations, and what they are worth',
    description: 'V1 to V10 side by side, the data on hand, and every experiment with its verdict.',
    minutes: 9,
  },
  {
    slug: 'mlb-v10-features',
    group: 'mlb',
    title: 'The V10 feature audit',
    description: 'What was broken in the feature table, why fixing it barely moved accuracy, and how to tell.',
    minutes: 16,
  },
  {
    slug: 'mlb-pa-simulator',
    group: 'mlb',
    title: 'The plate-appearance simulator',
    description: 'A game played at-bat by at-bat thousands of times, scored on 15,000 unseen games.',
    minutes: 16,
  },
  {
    slug: 'v10-vs-pa-sim',
    group: 'mlb',
    title: 'V10 vs the plate-appearance simulator',
    description: 'The first simulator against the production model, gate by gate, in two backtest windows.',
    minutes: 9,
  },
  {
    slug: 'football-models',
    group: 'football',
    title: 'Why a 35-number ridge beats a 90-feature XGBoost',
    description: 'Margin targets, shrinkage and paired bootstrap intervals for NFL and college.',
    minutes: 15,
  },
  {
    slug: 'football-model-compare',
    group: 'football',
    title: 'Four football models, scored fairly',
    description: 'XGBoost, the ridge, ESPN FPI and the market, scored only on pregame predictions.',
    minutes: 4,
  },
  {
    slug: 'football-drive-sim',
    group: 'football',
    title: 'Simulating NFL games one drive at a time',
    description: 'A drive-by-drive Monte Carlo that ties the ridge on winners but gets the margin shape right.',
    minutes: 18,
  },
  {
    slug: 'football-matchups',
    group: 'football',
    title: 'Does “they can’t stop the run” predict games?',
    description: 'Run and pass unit ratings and injury values, tested walk-forward. The answer is no.',
    minutes: 14,
  },
  {
    slug: 'power-rankings',
    group: 'rankings',
    title: 'The power rankings, and how to defend every choice',
    description: 'Bradley-Terry against margin ratings, decaying last season, and where the rank ranges come from.',
    minutes: 17,
  },
];

/** The /learn section a sport's pages link to. */
export const LEARN_GROUP_FOR_SPORT = { mlb: 'mlb', nfl: 'football', cfb: 'football' };
