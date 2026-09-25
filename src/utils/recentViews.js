const STORAGE_KEY = "ht-recent-views";
const MAX_RECENT_VIEWS = 6;

const STATIC_VIEWS = {
  "/mlb/predictions": { label: "MLB Predictions", hint: "Daily model board", icon: "🔮" },
  "/mlb/models": { label: "MLB Model Scoreboard", hint: "Every model, scored pregame", icon: "📈" },
  "/mlb/models/diagnostics": { label: "Prediction Diagnostics", hint: "Model audit view", icon: "📊" },
  "/mlb/lab/split-explorer": { label: "Split Explorer", hint: "Context splits", icon: "🧭" },
  "/mlb/lab/statcast-lab": { label: "Statcast Lab", hint: "Pitch and contact lab", icon: "🎯" },
  "/mlb/lab/comparison-workbench": { label: "Comparison Workbench", hint: "League-relative comps", icon: "🧰" },
  "/mlb/models/scenario-simulator": { label: "Scenario Simulator", hint: "What-if matchup tool", icon: "🎲" },
  "/mlb/lab/research-workflow": { label: "Research Workflow", hint: "Saved views and watchlists", icon: "🗂️" },
  "/mlb/games": { label: "Games", hint: "Today's scoreboard", icon: "📅" },
  "/mlb/stats/team-batting": { label: "Team Batting", hint: "Club leaderboards", icon: "🏏" },
  "/mlb/stats/team-pitching": { label: "Team Pitching", hint: "Staff leaderboards", icon: "⚾" },
  "/mlb/stats/player-batting": { label: "Player Batting", hint: "Hitter leaderboard", icon: "🧢" },
  "/mlb/stats/player-pitching": { label: "Player Pitching", hint: "Pitcher leaderboard", icon: "💪" },
  "/mlb/lab/advanced-analysis": { label: "Advanced Analysis", hint: "Deep-dive tools", icon: "🔬" },
  "/mlb/lab/season-comparison": { label: "Season Comparison", hint: "Year-over-year view", icon: "📈" },
  "/mlb/lab/team-comparison": { label: "Team Comparison", hint: "Club vs club", icon: "⚔️" },
  "/mlb/lab/player-comparison": { label: "Player Comparison", hint: "Player vs player", icon: "🆚" },
  "/mlb/transactions": { label: "Transactions", hint: "League moves", icon: "🔄" },
  "/mlb/lab/assisted-analysis": { label: "Assisted Analysis", hint: "Guided insights", icon: "🤖" },
  "/nfl": { label: "NFL", hint: "Weekly model picks", icon: "🏈" },
  "/pickem": { label: "Pick'em", hint: "Weekly picks and standings", icon: "🎯" },
  "/mlb/rankings": { label: "MLB Power Rankings", hint: "Bradley-Terry board", icon: "📋" },
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
  const gameMatch = pathname.match(/^\/mlb\/game\/([^/]+)$/);
  if (gameMatch) {
    return {
      label: `Game ${gameMatch[1]}`,
      hint: "Live game detail",
      icon: "⚾",
    };
  }

  const teamMatch = pathname.match(/^\/mlb\/team\/([^/]+)$/);
  if (teamMatch) {
    return {
      label: `${teamMatch[1].toUpperCase()} Team`,
      hint: "Club dashboard",
      icon: "🏟️",
    };
  }

  const playerMatch = pathname.match(/^\/mlb\/player\/([^/]+)$/);
  if (playerMatch) {
    return {
      label: `Player ${playerMatch[1]}`,
      hint: "Player dashboard",
      icon: "🧢",
    };
  }

  const pickemMatch = pathname.match(/^\/pickem\/([^/]+)(?:\/([^/]+))?$/);
  if (pickemMatch) {
    const SPORTS = { nfl: "NFL", cfb: "College FBS" };
    const SECTIONS = {
      sheet: "make picks",
      leaderboard: "standings",
      mine: "your picks",
    };
    return {
      label: `${SPORTS[pickemMatch[1]] || "Pick'em"} pick'em`,
      hint: SECTIONS[pickemMatch[2]] || "weekly picks",
      icon: "🎯",
    };
  }

  const footballGameMatch = pathname.match(/^\/(?=nfl|cfb\/)(?:cfb\/)?(nfl|fbs|fcs)\/game\/([^/]+)$/);
  if (footballGameMatch) {
    const LEAGUES = { nfl: "NFL", fbs: "College FBS", fcs: "College FCS" };
    return {
      label: `${LEAGUES[footballGameMatch[1]] || "Football"} game`,
      hint: "Score, win probability and drives",
      icon: "🏈",
    };
  }

  const footballMatch = pathname.match(/^\/(?=nfl|cfb\/)(?:cfb\/)?(nfl|fbs|fcs)(?:\/([^/]+))?$/);
  if (footballMatch) {
    const LEAGUES = { nfl: "NFL", fbs: "College FBS", fcs: "College FCS" };
    const SECTIONS = {
      picks: "picks",
      scoreboard: "scores and schedule",
      rankings: "power rankings",
      diagnostics: "model diagnostics",
      models: "model comparison",
      leaders: "league leaders",
      players: "player stats",
      stats: "team stats",
    };
    const league = LEAGUES[footballMatch[1]] || "Football";
    return {
      label: league,
      hint: SECTIONS[footballMatch[2]] || "Weekly board",
      icon: "🏈",
    };
  }

  const teamTransactionsMatch = pathname.match(/^\/mlb\/transactions\/([^/]+)$/);
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
