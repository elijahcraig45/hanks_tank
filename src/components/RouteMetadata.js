import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

const SITE_NAME = "Hank's Tank";
const SITE_URL = 'https://hankstank.com';
const DEFAULT_DESCRIPTION =
  "Hank's Tank is a multi-sport analytics site for MLB, NFL and college football: daily model predictions, power rankings with uncertainty, live game detail, scouting reports, and model scoreboards.";

const ROUTE_METADATA = [
  {
    path: '/',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  {
    path: '/mlb/games',
    title: 'Games',
    description:
      "Track today's MLB slate with live scores, inning state, play-by-play, strike-zone visuals, and matchup context.",
  },
  {
    path: '/mlb/game/:gamePk',
    title: 'Game Detail',
    description:
      'Dive into a live MLB game with linescore, scoring plays, strike zone, box score, and scouting report context.',
  },
  {
    path: '/mlb/predictions',
    title: 'Predictions',
    description:
      'See daily MLB win probabilities, confidence tiers, model signals, and links into each scouting report.',
  },
  {
    path: '/mlb/models',
    title: 'Prediction Diagnostics',
    description:
      'Audit MLB model performance with calibration, rolling diagnostics, confidence-tier results, and exportable postgame review.',
  },
  {
    path: '/mlb/lab/split-explorer',
    title: 'Split Explorer',
    description:
      'Compare MLB team and player split performance across home-away, handedness, and day-night contexts.',
  },
  {
    path: '/mlb/lab/statcast-lab',
    title: 'Statcast Lab',
    description:
      'Explore MLB Statcast pitch mix, rolling trends, contact quality, and zone behavior for individual players.',
  },
  {
    path: '/mlb/lab/comparison-workbench',
    title: 'Comparison Workbench',
    description:
      'Compare MLB teams and players with league-relative percentiles, z-scores, season deltas, and similarity comps.',
  },
  {
    path: '/mlb/models/scenario-simulator',
    title: 'Scenario Simulator',
    description:
      'Run what-if MLB matchup scenarios with starter, lineup, bullpen, and context adjustments that shift the forecast distribution.',
  },
  {
    path: '/mlb/lab/research-workflow',
    title: 'Research Workflow',
    description:
      'Save Hank\'s Tank analysis views, maintain an MLB watchlist, and export research artifacts for notebook workflows.',
  },
  {
    path: '/mlb/stats/team-batting',
    title: 'Team Batting',
    description: 'Browse team batting leaderboards and compare MLB offense across the current season.',
  },
  {
    path: '/mlb/stats/team-pitching',
    title: 'Team Pitching',
    description: 'Browse team pitching leaderboards and compare staff-level performance across MLB.',
  },
  {
    path: '/mlb/stats/player-batting',
    title: 'Player Batting',
    description: 'Explore player batting leaderboards with sortable MLB hitting metrics and rate stats.',
  },
  {
    path: '/mlb/stats/player-pitching',
    title: 'Player Pitching',
    description: 'Explore player pitching leaderboards with sortable MLB run prevention and bat-missing metrics.',
  },
  {
    path: '/mlb/lab/assisted-analysis',
    title: 'Assisted Analysis',
    description: "Generate guided MLB analysis with Hank's Tank data and matchup context.",
  },
  {
    path: '/mlb/lab/season-comparison',
    title: 'Season Comparison',
    description: 'Compare seasons side by side to spot changes in team and player performance trends.',
  },
  {
    path: '/mlb/lab/player-comparison',
    title: 'Player Comparison',
    description: 'Compare players across MLB metrics, trends, and profile-level performance splits.',
  },
  {
    path: '/mlb/lab/team-comparison',
    title: 'Team Comparison',
    description: 'Compare teams across offense, pitching, and advanced MLB performance indicators.',
  },
  {
    path: '/mlb/lab/advanced-analysis',
    title: 'Advanced Analysis',
    description: 'Dig into advanced MLB analysis views built on deeper leaderboard and comparison tooling.',
  },
  {
    path: '/mlb/team/:teamAbbr',
    title: 'Team Page',
    description: 'Open a team dashboard with roster context, trends, standings-adjacent views, and recent performance.',
  },
  {
    path: '/mlb/player/:playerId',
    title: 'Player Page',
    description: 'Open a player dashboard with trends, splits, profile details, and stat-driven context.',
  },
  {
    path: '/mlb/rankings',
    title: 'MLB Power Rankings',
    description:
      'Bradley-Terry power rankings for every MLB team, fitted over the whole season at '
      + 'once, with bootstrap rank ranges showing how little separates them.',
  },
  {
    path: '/nfl',
    title: 'NFL',
    description: 'Weekly NFL model picks with confidence tiers, Bradley-Terry power rankings with rank ranges, out-of-sample model diagnostics and comparison, league leaders, and team stats.',
  },
  {
    path: '/nfl/:section',
    title: 'NFL',
    description: 'Weekly NFL model picks with confidence tiers, Bradley-Terry power rankings with rank ranges, out-of-sample model diagnostics and comparison, league leaders, and team stats.',
  },
  {
    path: '/cfb/:league',
    title: 'College Football',
    description: 'College football (FBS and FCS) model picks, live scores, Bradley-Terry power rankings with rank ranges, model diagnostics and comparison, leaders, and team stats.',
  },
  {
    path: '/mlb',
    title: 'MLB',
    description: 'Daily MLB win probabilities, live scores, power rankings, leaderboards, and model diagnostics.',
  },
  {
    path: '/pickem/:sport/:section',
    title: 'Pick\u2019em',
    description:
      'Weekly NFL and college football pick\u2019em: pick the winner of every game, with a public leaderboard and every record measured against the closing favourite.',
  },
  {
    path: '/pickem/:sport',
    title: 'Pick\u2019em',
    description:
      'Weekly NFL and college football pick\u2019em with a public leaderboard, scored against the closing favourite.',
  },
  {
    path: '/pickem',
    title: 'Pick\u2019em',
    description:
      'Weekly NFL and college football pick\u2019em with a public leaderboard, scored against the closing favourite.',
  },
  {
    path: '/cfb/:league/game/:gameId',
    title: 'Football Game',
    description:
      'Live score, win-probability curve, drive chart and box score for a single college football game, alongside the model\u2019s own pick for it.',
  },
  {
    path: '/cfb/:league/:section',
    title: 'College Football',
    description:
      'Weekly NFL and college football model picks, live scores and schedules, Bradley-Terry power rankings, out-of-sample model diagnostics, league leaders, and per-team season and advanced stats.',
  },
  {
    path: '/mlb/transactions',
    title: 'Transactions',
    description: 'Follow MLB transactions and roster movement from one dashboard.',
  },
  {
    path: '/mlb/transactions/:teamAbbr',
    title: 'Team Transactions',
    description: 'Follow recent roster movement and transactions for a specific MLB club.',
  },
];

const NOT_FOUND_METADATA = {
  title: 'Page Not Found',
  description:
    "That Hank's Tank page does not exist. Jump back to the homepage, today's games, or predictions.",
};

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  return element;
}

function ensureLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  return element;
}

function setMetaContent(selector, attributes, content) {
  const element = ensureMeta(selector, attributes);
  element.setAttribute('content', content);
}

function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function buildCanonicalUrl(pathname) {
  return new URL(normalizePath(pathname), SITE_URL).toString();
}

function getMetadataForPath(pathname) {
  return (
    ROUTE_METADATA.find((route) => matchPath({ path: route.path, end: true }, pathname)) ||
    NOT_FOUND_METADATA
  );
}

function RouteMetadata() {
  const location = useLocation();

  useEffect(() => {
    const metadata = getMetadataForPath(location.pathname);
    const pageTitle =
      metadata.title === SITE_NAME ? SITE_NAME : `${metadata.title} | ${SITE_NAME}`;
    const canonicalUrl = buildCanonicalUrl(location.pathname);

    document.title = pageTitle;

    setMetaContent('meta[name="description"]', { name: 'description' }, metadata.description);
    setMetaContent('meta[property="og:title"]', { property: 'og:title' }, pageTitle);
    setMetaContent(
      'meta[property="og:description"]',
      { property: 'og:description' },
      metadata.description
    );
    setMetaContent('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', { name: 'twitter:title' }, pageTitle);
    setMetaContent(
      'meta[name="twitter:description"]',
      { name: 'twitter:description' },
      metadata.description
    );

    const canonicalLink = ensureLink('link[rel="canonical"]', { rel: 'canonical' });
    canonicalLink.setAttribute('href', canonicalUrl);
  }, [location.pathname]);

  return null;
}

export default RouteMetadata;
