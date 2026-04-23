const STORAGE_KEY = "ht-recent-views";
const MAX_RECENT_VIEWS = 6;

const STATIC_VIEWS = {
  "/predictions": { label: "Predictions", hint: "Daily model board", icon: "🔮" },
  "/games": { label: "Games", hint: "Today's scoreboard", icon: "📅" },
  "/TeamBatting": { label: "Team Batting", hint: "Club leaderboards", icon: "🏏" },
  "/TeamPitching": { label: "Team Pitching", hint: "Staff leaderboards", icon: "⚾" },
  "/PlayerBatting": { label: "Player Batting", hint: "Hitter leaderboard", icon: "🧢" },
  "/PlayerPitching": { label: "Player Pitching", hint: "Pitcher leaderboard", icon: "💪" },
  "/advanced-analysis": { label: "Advanced Analysis", hint: "Deep-dive tools", icon: "🔬" },
  "/season-comparison": { label: "Season Comparison", hint: "Year-over-year view", icon: "📈" },
  "/team-comparison": { label: "Team Comparison", hint: "Club vs club", icon: "⚔️" },
  "/player-comparison": { label: "Player Comparison", hint: "Player vs player", icon: "🆚" },
  "/transactions": { label: "Transactions", hint: "League moves", icon: "🔄" },
  "/AssistedAnalysis": { label: "Assisted Analysis", hint: "Guided insights", icon: "🤖" },
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizePath(pathname = "/") {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function buildDynamicView(pathname) {
  const gameMatch = pathname.match(/^\/game\/([^/]+)$/);
  if (gameMatch) {
    return {
      label: `Game ${gameMatch[1]}`,
      hint: "Live game detail",
      icon: "⚾",
    };
  }

  const teamMatch = pathname.match(/^\/team\/([^/]+)$/);
  if (teamMatch) {
    return {
      label: `${teamMatch[1].toUpperCase()} Team`,
      hint: "Club dashboard",
      icon: "🏟️",
    };
  }

  const playerMatch = pathname.match(/^\/player\/([^/]+)$/);
  if (playerMatch) {
    return {
      label: `Player ${playerMatch[1]}`,
      hint: "Player dashboard",
      icon: "🧢",
    };
  }

  const teamTransactionsMatch = pathname.match(/^\/transactions\/([^/]+)$/);
  if (teamTransactionsMatch) {
    return {
      label: `${teamTransactionsMatch[1].toUpperCase()} Transactions`,
      hint: "Team roster moves",
      icon: "🔄",
    };
  }

  return null;
}

export function buildRecentView(pathname) {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === "/") {
    return null;
  }

  const staticView = STATIC_VIEWS[normalizedPath];
  if (staticView) {
    return {
      path: normalizedPath,
      ...staticView,
    };
  }

  const dynamicView = buildDynamicView(normalizedPath);
  if (!dynamicView) {
    return null;
  }

  return {
    path: normalizedPath,
    ...dynamicView,
  };
}

export function loadRecentViews() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((view) => view && typeof view.path === "string" && typeof view.label === "string");
  } catch (error) {
    console.warn("Failed to read recent views from localStorage.", error);
    return [];
  }
}

export function saveRecentView(pathname) {
  const nextView = buildRecentView(pathname);
  if (!nextView || !canUseStorage()) {
    return [];
  }

  const currentViews = loadRecentViews();
  const updatedViews = [
    {
      ...nextView,
      visitedAt: new Date().toISOString(),
    },
    ...currentViews.filter((view) => view.path !== nextView.path),
  ].slice(0, MAX_RECENT_VIEWS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));
  return updatedViews;
}

export function clearRecentViews() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function formatRecentViewTime(value) {
  if (!value) {
    return "";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export { MAX_RECENT_VIEWS, STORAGE_KEY };
