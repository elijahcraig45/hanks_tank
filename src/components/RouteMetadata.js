import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

const SITE_NAME = "Hank's Tank";
const SITE_URL = 'https://hankstank.com';
const DEFAULT_DESCRIPTION =
  "Hank's Tank is an MLB analytics app with daily predictions, live game detail, scouting reports, standings, player pages, and comparison tools.";

const ROUTE_METADATA = [
  {
    path: '/',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  {
    path: '/games',
    title: 'Games',
    description:
      "Track today's MLB slate with live scores, inning state, play-by-play, strike-zone visuals, and matchup context.",
  },
  {
    path: '/game/:gamePk',
    title: 'Game Detail',
    description:
      'Dive into a live MLB game with linescore, scoring plays, strike zone, box score, and scouting report context.',
  },
  {
    path: '/predictions',
    title: 'Predictions',
    description:
      'See daily MLB win probabilities, confidence tiers, model signals, and links into each scouting report.',
  },
  {
    path: '/TeamBatting',
    title: 'Team Batting',
    description: 'Browse team batting leaderboards and compare MLB offense across the current season.',
  },
  {
    path: '/TeamPitching',
    title: 'Team Pitching',
    description: 'Browse team pitching leaderboards and compare staff-level performance across MLB.',
  },
  {
    path: '/PlayerBatting',
    title: 'Player Batting',
    description: 'Explore player batting leaderboards with sortable MLB hitting metrics and rate stats.',
  },
  {
    path: '/PlayerPitching',
    title: 'Player Pitching',
    description: 'Explore player pitching leaderboards with sortable MLB run prevention and bat-missing metrics.',
  },
  {
    path: '/AssistedAnalysis',
    title: 'Assisted Analysis',
    description: "Generate guided MLB analysis with Hank's Tank data and matchup context.",
  },
  {
    path: '/season-comparison',
    title: 'Season Comparison',
    description: 'Compare seasons side by side to spot changes in team and player performance trends.',
  },
  {
    path: '/player-comparison',
    title: 'Player Comparison',
    description: 'Compare players across MLB metrics, trends, and profile-level performance splits.',
  },
  {
    path: '/team-comparison',
    title: 'Team Comparison',
    description: 'Compare teams across offense, pitching, and advanced MLB performance indicators.',
  },
  {
    path: '/advanced-analysis',
    title: 'Advanced Analysis',
    description: 'Dig into advanced MLB analysis views built on deeper leaderboard and comparison tooling.',
  },
  {
    path: '/team/:teamAbbr',
    title: 'Team Page',
    description: 'Open a team dashboard with roster context, trends, standings-adjacent views, and recent performance.',
  },
  {
    path: '/player/:playerId',
    title: 'Player Page',
    description: 'Open a player dashboard with trends, splits, profile details, and stat-driven context.',
  },
  {
    path: '/transactions',
    title: 'Transactions',
    description: 'Follow MLB transactions and roster movement from one dashboard.',
  },
  {
    path: '/transactions/:teamAbbr',
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
