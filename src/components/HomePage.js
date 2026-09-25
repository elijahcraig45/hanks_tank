import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import { formatPercent, subtractDaysFromIso, extractIsoDate } from "../utils/analytics";
import {
  buildConfidenceBreakdown,
  summarizePredictionDiagnostics,
} from "../utils/predictionDiagnostics";
import { loadFavoriteTeams } from "../utils/favorites";
import {
  clearRecentViews,
  formatRecentViewTime,
  loadRecentViews,
} from "../utils/recentViews";
import {
  getTeamAbbreviationFromName,
  getTeamLogoUrl,
  getTeamShortName,
} from "../utils/teamMetadata";
import { MLB, footballPath } from "../config/sports";
import RankBand from "./RankBand";
import "./styles/HomePage.css";

/**
 * The all-sports front page.
 *
 * Three sports on equal footing: a summary card each (slate size, model record with
 * its uncertainty, the top of the power rankings), then one rail of upcoming games
 * per sport with win probabilities, then the places the pipelines are compared side
 * by side — the mixed best-picks board and the model scoreboard against baselines.
 */

const DIVISION_MAP = {
  200: "AL West", 201: "AL East", 202: "AL Central",
  203: "NL West", 204: "NL East", 205: "NL Central",
};
const DIVISION_ORDER = [
  "AL East", "AL Central", "AL West",
  "NL East", "NL Central", "NL West",
];

// Football leagues surfaced on the homepage. FCS is deliberately left off: its slate is
// large, its games are rarely what someone opens the front page for, and it is one
// click away in the CFB section.
const FOOTBALL_RAILS = [
  { key: "nfl", sport: "nfl", division: null, label: "NFL" },
  { key: "fbs", sport: "cfb", division: "fbs", label: "College FBS" },
];

// The homepage board shows at most this many picks from any one sport. Without a cap
// football wins every slot: a 95% FBS-over-FCS mismatch outranks every baseball game
// ever played, and the board stops being about all three sports.
const PICKS_PER_SPORT = 3;

const DIAGNOSTICS_WINDOW_DAYS = 30;
const LEADERS_SHOWN = 5;

const abbr = (name) =>
  getTeamAbbreviationFromName(name) || (name || "").substring(0, 3).toUpperCase();

const fmtTime = (utc) => {
  if (!utc) return "";
  return new Date(utc).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
};

const fmtDay = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
};

const gameStatusLabel = (game) => {
  const state = game?.status?.abstractGameState;
  const detail = game?.status?.detailedState;
  if (state === "Live") return { text: detail || "Live", cls: "live" };
  if (state === "Final") return { text: "Final", cls: "final" };
  return { text: fmtTime(game.gameDate), cls: "preview" };
};

/** Calls an ApiService method if it exists, resolving to null on any failure. */
function safe(method, ...args) {
  const fn = apiService[method];
  if (typeof fn !== "function") return Promise.resolve(null);
  try {
    return Promise.resolve(fn.apply(apiService, args)).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/** Half-width of a 95% normal interval on an accuracy, in probability units. */
export function accuracyInterval(p, n) {
  if (p == null || !n) return null;
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

/**
 * College accuracy on FBS-vs-FBS games only.
 *
 * The season accuracy endpoint pools every game on the FBS board, and roughly two in
 * five of those are FBS teams hosting FCS opponents, which the model almost never
 * misses. That flatters the headline. The diagnostics rows carry a per-game
 * `crossDivision` flag, so the like-for-like number can be computed here. Returns null
 * when the rows are missing or do not carry the flag, so the caller can fall back to
 * the pooled number with a caveat instead of showing a made-up split.
 */
export function fbsOnlyRecord(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const flagged = rows.filter(
    (r) => typeof r.crossDivision === "boolean" && typeof r.correct === "boolean"
  );
  if (flagged.length !== rows.length) return null;
  const fbs = flagged.filter((r) => !r.crossDivision);
  if (fbs.length === 0) return null;
  const accuracy = fbs.filter((r) => r.correct).length / fbs.length;
  return { accuracy, n: fbs.length, ci: accuracyInterval(accuracy, fbs.length) };
}

function formatStandings(records) {
  if (!Array.isArray(records)) return {};
  const raw = {};
  records.forEach((rec) => {
    const div = DIVISION_MAP[rec.division?.id];
    if (!div || !Array.isArray(rec.teamRecords)) return;
    raw[div] = rec.teamRecords
      .map((tr) => ({
        Tm: tr.team?.name || "",
        tmId: tr.team?.id,
        W: tr.leagueRecord?.wins ?? 0,
        L: tr.leagueRecord?.losses ?? 0,
        pct: tr.leagueRecord?.pct || ".000",
        GB: tr.gamesBack === "-" ? "--" : tr.gamesBack || "--",
      }))
      .sort((a, b) => b.W - a.W);
  });
  const ordered = {};
  DIVISION_ORDER.forEach((d) => { if (raw[d]) ordered[d] = raw[d]; });
  return ordered;
}

/**
 * The football week a visitor means by "now".
 *
 * A fixed day-window is wrong here: an NFL week runs Thursday to Monday and the slate
 * is what people think in, not a rolling ten days. So this picks the earliest week that
 * still has an unplayed game and returns that whole week, falling back to the most
 * recent completed week once a season is over.
 */
export function upcomingFootball(rows, now = Date.now()) {
  const dated = rows.filter((r) => r.game_date && r.week != null);
  if (!dated.length) return [];

  const future = dated.filter((r) => new Date(r.game_date).getTime() >= now);
  const week = future.length
    ? Math.min(...future.map((r) => r.week))
    : Math.max(...dated.map((r) => r.week));

  return dated
    .filter((r) => r.week === week)
    .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
}

/**
 * Best picks across every sport, capped per sport so each is actually represented.
 *
 * Cross-division games are dropped outright. An FBS side favoured over an FCS one is
 * the model's most confident output and its least interesting — the page's own
 * reasoning calls those picks cheap, so it should not lead with a board of them.
 */
export function buildPicksBoard(mlbPicks, footballPicks, limit = PICKS_PER_SPORT) {
  const TIER_RANK = { high: 0, medium: 1, low: 2 };
  const rank = (a, b) =>
    (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) ||
    Math.abs(b.homeProb - 0.5) - Math.abs(a.homeProb - 0.5);

  const usable = [...footballPicks, ...mlbPicks]
    .filter((p) => p.homeProb != null && !p.crossDivision)
    .sort(rank);
  const taken = {};
  return usable.filter((p) => {
    taken[p.sport] = (taken[p.sport] || 0) + 1;
    return taken[p.sport] <= limit;
  });
}

/** One shape for a pick regardless of which pipeline produced it. */
function normalizePick(row, sport, leagueKey) {
  return {
    key: `${sport}-${leagueKey}-${row.game_pk ?? row.game_id}`,
    sport,
    leagueKey,
    home: row.home_team_name,
    away: row.away_team_name,
    homeProb: row.home_win_probability,
    tier: (row.confidence_tier || "").toLowerCase(),
    winner: row.predicted_winner,
    crossDivision: Boolean(row.cross_division),
    date: row.game_date || row.game_time_utc,
    href: sport === "mlb" ? MLB.game(row.game_pk) : footballPath(leagueKey, "picks"),
  };
}

/** "2026-09-24" → "Sep 24", parsed by hand so it cannot slip a day west of UTC. */
function shortIsoDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}`;
}

function boardFreshness(meta) {
  if (!meta) return null;
  const through = shortIsoDate(meta.as_of_date);
  if (through) return `through ${through}`;
  return meta.as_of_week ? `week ${meta.as_of_week}` : null;
}

/* ── Horizontal rail with scroll affordances ─────────────────────────────── */
function Rail({ title, sport, count, moreTo, moreLabel, children }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, children]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section className="rail" data-sport={sport}>
      <div className="rail-head">
        <h2 className="rail-title">
          {title}
          {count != null && <span className="rail-count">{count}</span>}
        </h2>
        <div className="rail-actions">
          {moreTo && <Link to={moreTo} className="rail-more">{moreLabel} →</Link>}
          <button className="rail-btn" onClick={() => scroll(-1)} disabled={!canLeft} aria-label="Scroll left">‹</button>
          <button className="rail-btn" onClick={() => scroll(1)} disabled={!canRight} aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className="rail-track" ref={trackRef}>{children}</div>
    </section>
  );
}

/** Away/home probability split, with the favourite's side filled. */
function ProbBar({ homeProb }) {
  if (homeProb == null) return null;
  const home = Math.round(homeProb * 100);
  return (
    <div className="tile-bar" aria-hidden="true">
      <div className="tile-bar-away" style={{ width: `${100 - home}%` }} />
      <div className="tile-bar-home" style={{ width: `${home}%` }} />
    </div>
  );
}

/* ── Tiles ───────────────────────────────────────────────────────────────── */
function MlbGameTile({ game, homeProb }) {
  const away = game.teams.away;
  const home = game.teams.home;
  const status = gameStatusLabel(game);
  const showScore = status.cls === "live" || status.cls === "final";
  const probFor = (side) => {
    if (homeProb == null) return null;
    return Math.round((side === "home" ? homeProb : 1 - homeProb) * 100);
  };

  const row = (t, side) => {
    const p = probFor(side);
    return (
      <div className={`tile-row${p != null && p < 50 ? " tile-row--fade" : ""}`}>
        <img
          src={getTeamLogoUrl(t.team.id)}
          alt=""
          className="tile-logo"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <span className="tile-team">{getTeamShortName(t.team.name)}</span>
        <span className="tile-rec">{t.leagueRecord?.wins}-{t.leagueRecord?.losses}</span>
        {showScore
          ? <span className="tile-score">{t.score ?? ""}</span>
          : p != null && <span className="tile-prob">{p}%</span>}
      </div>
    );
  };

  return (
    <Link to={MLB.game(game.gamePk)} className="tile">
      <div className={`tile-inner${status.cls === "live" ? " tile-inner--live" : ""}`}>
        <div className="tile-status">
          <span className={`ts ts--${status.cls}`}>{status.text}</span>
        </div>
        {row(away, "away")}
        {row(home, "home")}
        <ProbBar homeProb={homeProb} />
        {homeProb == null && game.venue && <div className="tile-venue">{game.venue.name}</div>}
      </div>
    </Link>
  );
}

function FootballGameTile({ row, leagueKey }) {
  const homePct = Math.round((row.home_win_probability || 0) * 100);
  const settled = row.prediction_correct !== null && row.prediction_correct !== undefined;
  const homeFav = homePct >= 50;

  return (
    <Link to={footballPath(leagueKey, "picks")} className="tile">
      <div className="tile-inner">
        <div className="tile-status">
          <span className="ts ts--preview">{fmtDay(row.game_date)}</span>
          {settled && (
            <span className={`ts-res ts-res--${row.prediction_correct ? "hit" : "miss"}`}>
              {row.prediction_correct ? "✓ hit" : "✗ miss"}
            </span>
          )}
        </div>
        <div className={`tile-row${homeFav ? " tile-row--fade" : ""}`}>
          <span className="tile-team">{row.away_team_name}</span>
          <span className="tile-prob">{100 - homePct}%</span>
        </div>
        <div className={`tile-row${homeFav ? "" : " tile-row--fade"}`}>
          <span className="tile-team"><span className="tile-at">@</span> {row.home_team_name}</span>
          <span className="tile-prob">{homePct}%</span>
        </div>
        <ProbBar homeProb={row.home_win_probability} />
      </div>
    </Link>
  );
}

const SPORT_ICON = { mlb: "⚾", nfl: "🏈", cfb: "🏟️", football: "🏈" };
const LEAGUE_LABEL = { mlb: "MLB", nfl: "NFL", fbs: "FBS", fcs: "FCS" };

function PickRow({ pick }) {
  const homeFav = (pick.homeProb ?? 0.5) >= 0.5;
  const favProb = homeFav ? pick.homeProb : 1 - pick.homeProb;
  return (
    <Link to={pick.href} className={`pick pick--${pick.sport}`} data-sport={pick.sport}>
      <span className="pick-sport" aria-hidden="true">{SPORT_ICON[pick.sport]}</span>
      <span className="pick-copy">
        <span className="pick-teams">{pick.away} <span className="pick-at">@</span> {pick.home}</span>
        <span className="pick-meta">
          {LEAGUE_LABEL[pick.leagueKey] || pick.leagueKey.toUpperCase()} · {fmtDay(pick.date)}
          {pick.tier && <> · <span className={`tier tier--${pick.tier}`}>{pick.tier}</span></>}
        </span>
      </span>
      <span className="pick-call">
        <span className="pick-winner">{pick.winner}</span>
        <span className="pick-prob">{formatPercent(favProb)}</span>
      </span>
    </Link>
  );
}

/* ── Sport summary card ──────────────────────────────────────────────────── */
function SportCard({ sport, name, slate, record, leader, links }) {
  return (
    <section className="sc" data-sport={sport}>
      <div className="sc-head">
        <span className="sc-icon" aria-hidden="true">{SPORT_ICON[sport]}</span>
        <h2 className="sc-name">{name}</h2>
        <Link to={links[0].to} className="sc-open">Open →</Link>
      </div>
      <dl className="sc-stats">
        <div>
          <dt>{slate.label}</dt>
          <dd>{slate.value ?? "—"}</dd>
        </div>
        <div>
          <dt>{record.label}</dt>
          <dd>
            {formatPercent(record.accuracy)}
            {record.ci != null && <span className="sc-ci"> ±{Math.round(record.ci * 100)}</span>}
          </dd>
          {record.n ? <span className="sc-n">{record.n} games</span> : null}
          {record.secondary && <span className="sc-n sc-secondary">{record.secondary}</span>}
        </div>
        <div className="sc-leader">
          <dt>No. 1</dt>
          <dd title={leader?.team}>{leader ? leader.team : "—"}</dd>
          {leader?.rank_p95 != null && (
            <span className="sc-n">plausible rank {leader.rank_p05}–{leader.rank_p95}</span>
          )}
        </div>
      </dl>
      <nav className="sc-links" aria-label={`${name} shortcuts`}>
        {links.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
      </nav>
    </section>
  );
}

/* ── Model scoreboard ────────────────────────────────────────────────────── */
const AXIS_LO = 0.3;
const AXIS_HI = 0.9;
const axisPos = (p) => `${Math.min(100, Math.max(0, ((p - AXIS_LO) / (AXIS_HI - AXIS_LO)) * 100))}%`;

function ScoreRow({ row }) {
  const ci = accuracyInterval(row.accuracy, row.n);
  const marks = [
    { key: "market", label: "Market", value: row.market },
    { key: "elo", label: "Elo", value: row.elo },
    { key: "home", label: "Home team", value: row.home },
  ].filter((m) => m.value != null);

  return (
    <li className="ms-row" data-sport={row.sport}>
      <div className="ms-label">
        <span className="ms-sport">{row.label}</span>
        <span className="ms-window">{row.window} · n={row.n || 0}</span>
      </div>
      <div className="ms-value">
        <strong>{formatPercent(row.accuracy)}</strong>
        {ci != null && <span className="ms-ci">±{(ci * 100).toFixed(0)} pts</span>}
      </div>
      <div className="ms-plot" aria-hidden="true">
        <span className="ms-coin" style={{ left: axisPos(0.5) }} />
        {row.accuracy != null && ci != null && (
          <span
            className="ms-band"
            style={{ left: axisPos(row.accuracy - ci), right: `calc(100% - ${axisPos(row.accuracy + ci)})` }}
          />
        )}
        {row.accuracy != null && <span className="ms-dot" style={{ left: axisPos(row.accuracy) }} />}
        {marks.map((m) => (
          <span key={m.key} className={`ms-mark ms-mark--${m.key}`} style={{ left: axisPos(m.value) }} />
        ))}
      </div>
      <div className="ms-baselines">
        {marks.length ? marks.map((m) => (
          <span key={m.key} className={`ms-chip ms-chip--${m.key}`}>
            {m.label} {formatPercent(m.value, 0)}
          </span>
        )) : <span className="ms-chip ms-chip--none">{row.note}</span>}
      </div>
    </li>
  );
}

/* ── Power-ranking leaders ───────────────────────────────────────────────── */
function LeadersCard({ sport, label, rows, meta, to }) {
  const scaleTo = Math.max(10, ...rows.map((r) => r.rank_p95 || 0));
  return (
    <div className="pl" data-sport={sport}>
      <div className="pl-head">
        <Link to={to} className="pl-title">{label}</Link>
        <span className="pl-meta">{boardFreshness(meta)}</span>
      </div>
      {rows.length === 0 ? (
        <div className="empty-sm">No board yet this season</div>
      ) : (
        <ol className="pl-list">
          {rows.map((r) => (
            <li key={r.team} className="pl-row">
              <span className="pl-rank">{r.rank}</span>
              <span className="pl-team">
                <span className="pl-name">{r.team}</span>
                <span className="pl-rec">{r.record}</span>
              </span>
              <span className="pl-range">
                <RankBand rank={r.rank} lo={r.rank_p05} hi={r.rank_p95} total={scaleTo} />
                <span className="pl-range-text">
                  {r.rank_p05 != null ? `${r.rank_p05}–${r.rank_p95}` : "—"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── HomePage ───────────────────────────────────────────────────────────── */
function HomePage() {
  const [news, setNews] = useState({ mlb: [], braves: [] });
  const [standings, setStandings] = useState({});
  const [games, setGames] = useState([]);
  const [mlbProbs, setMlbProbs] = useState({});
  const [football, setFootball] = useState({});
  const [cfbRanks, setCfbRanks] = useState([]);
  const [boards, setBoards] = useState({});
  const [footballAccuracy, setFootballAccuracy] = useState({});
  const [cfbFbsOnly, setCfbFbsOnly] = useState(null);
  const [picks, setPicks] = useState([]);
  const [diagnosticsSummary, setDiagnosticsSummary] = useState(null);
  const [highConfidenceSummary, setHighConfidenceSummary] = useState(null);
  const [recentViews, setRecentViews] = useState([]);
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [rightTab, setRightTab] = useState("standings");
  const [loading, setLoading] = useState(true);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchNews = async () => {
    const [mlbResult, bravesResult] = await Promise.allSettled([
      apiService.getMLBNews(),
      apiService.getBravesNews(),
    ]);
    setNews({
      mlb: mlbResult.status === "fulfilled" ? mlbResult.value?.articles || [] : [],
      braves: bravesResult.status === "fulfilled" ? bravesResult.value?.articles || [] : [],
    });
  };

  const handleRefreshNews = async () => {
    setNewsRefreshing(true);
    try {
      await apiService.refreshNews();
      await fetchNews();
    } catch (e) {
      console.error("News refresh failed:", e);
    } finally {
      setNewsRefreshing(false);
    }
  };

  const loadHomepageData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const year = new Date().getFullYear();
      const today = new Date().toISOString().split("T")[0];
      const diagStart = subtractDaysFromIso(today, DIAGNOSTICS_WINDOW_DAYS - 1);

      // Every call settles to null on failure: a football table that has not been
      // built yet must not blank the baseball half of the page, and vice versa.
      const [
        , standingsData, gamesData, diagnosticsData, mlbPreds, cfbRankRes,
        mlbBoard, nflBoard, fbsBoard, nflAcc, fbsAcc, fbsDiag, ...footballRes
      ] = await Promise.all([
        fetchNews(),
        safe("getStandings", year),
        safe("getGames"),
        safe("getPredictionDiagnostics", { startDate: diagStart, endDate: today }),
        safe("getPredictions"),
        safe("getFootballRankings", "cfb", year, 25),
        safe("getRankings", "mlb", { season: year, limit: LEADERS_SHOWN }),
        safe("getRankings", "nfl", { season: year, limit: LEADERS_SHOWN }),
        safe("getRankings", "cfb", { season: year, division: "fbs", limit: LEADERS_SHOWN }),
        safe("getFootballAccuracy", "nfl", year, null),
        safe("getFootballAccuracy", "cfb", year, "fbs"),
        safe("getFootballDiagnostics", "cfb", { seasons: [year], division: "fbs" }),
        ...FOOTBALL_RAILS.map((l) =>
          safe("getFootballPredictions", l.sport, { season: year, division: l.division })
        ),
      ]);

      const raw = standingsData?.data?.standings?.records;
      if (raw) setStandings(formatStandings(raw));

      setGames(gamesData?.dates?.[0]?.games || []);
      setCfbRanks(cfbRankRes?.data || []);
      setBoards({
        mlb: { rows: mlbBoard?.data || [], meta: mlbBoard?.meta },
        nfl: { rows: nflBoard?.data || [], meta: nflBoard?.meta },
        cfb: { rows: fbsBoard?.data || [], meta: fbsBoard?.meta },
      });
      setFootballAccuracy({ nfl: nflAcc?.data || null, cfb: fbsAcc?.data || null });
      setCfbFbsOnly(fbsOnlyRecord(fbsDiag?.diagnostics));

      const byLeague = {};
      const footballPicks = [];
      FOOTBALL_RAILS.forEach((l, i) => {
        const rows = footballRes[i]?.data || [];
        byLeague[l.key] = upcomingFootball(rows);
        byLeague[l.key].forEach((r) => footballPicks.push(normalizePick(r, l.sport, l.key)));
      });
      setFootball(byLeague);

      const mlbRows = mlbPreds?.predictions || [];
      setMlbProbs(Object.fromEntries(
        mlbRows.filter((r) => r.game_pk != null).map((r) => [r.game_pk, r.home_win_probability])
      ));
      const mlbPicks = mlbRows.map((r) => normalizePick(r, "mlb", "mlb"));
      setPicks(buildPicksBoard(mlbPicks, footballPicks));

      const normalizedDiagnostics = (diagnosticsData?.diagnostics || []).map((row) => ({
        ...row,
        gameDate: extractIsoDate(row.gameDate),
      }));
      setDiagnosticsSummary(summarizePredictionDiagnostics(normalizedDiagnostics));
      setHighConfidenceSummary(
        buildConfidenceBreakdown(normalizedDiagnostics).find((e) => e.tier === "HIGH") || null
      );
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError("Failed to load data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRecentViews(loadRecentViews());
    setFavoriteTeams(loadFavoriteTeams());
  }, []);

  useEffect(() => { loadHomepageData(); }, [loadHomepageData]);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return undefined;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") loadHomepageData({ silent: true });
    }, 60000);
    return () => window.clearInterval(id);
  }, [loadHomepageData]);

  const sortedNews = (arr) =>
    [...(arr || [])].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const handleClearRecentViews = () => {
    clearRecentViews();
    setRecentViews([]);
  };

  const footballCount = Object.values(football).reduce((n, r) => n + r.length, 0);

  if (loading) {
    return (
      <div className="home-loading">
        <div className="home-spinner" />
        <p>Loading Hank&rsquo;s Tank…</p>
      </div>
    );
  }

  const season = new Date().getFullYear();
  const accRow = (key) => footballAccuracy[key]?.overall || null;
  const nflOverall = accRow("nfl");
  const cfbOverall = accRow("cfb");

  const scoreboard = [
    {
      sport: "mlb",
      label: "MLB",
      window: `last ${DIAGNOSTICS_WINDOW_DAYS} days`,
      accuracy: diagnosticsSummary?.accuracy,
      n: diagnosticsSummary?.games,
      note: `High-confidence picks ${formatPercent(highConfidenceSummary?.accuracy)} (n=${highConfidenceSummary?.games || 0})`,
    },
    {
      sport: "nfl",
      label: "NFL",
      window: `${season} season`,
      accuracy: nflOverall?.model_accuracy,
      n: nflOverall?.games,
      market: nflOverall?.vegas_accuracy,
      elo: nflOverall?.elo_accuracy,
      home: nflOverall?.always_home_accuracy,
      note: "No baselines published",
    },
    {
      sport: "cfb",
      label: "CFB · FBS",
      window: `${season} season · incl. FCS opponents`,
      accuracy: cfbOverall?.model_accuracy,
      n: cfbOverall?.games,
      market: cfbOverall?.vegas_accuracy,
      elo: cfbOverall?.elo_accuracy,
      home: cfbOverall?.always_home_accuracy,
      note: "No baselines published",
    },
  ];

  const sportCards = [
    {
      sport: "mlb",
      name: "MLB",
      slate: { label: "Games today", value: games.length || null },
      record: {
        label: `Model · ${DIAGNOSTICS_WINDOW_DAYS}d`,
        accuracy: diagnosticsSummary?.accuracy,
        n: diagnosticsSummary?.games,
        ci: accuracyInterval(diagnosticsSummary?.accuracy, diagnosticsSummary?.games),
      },
      leader: boards.mlb?.rows?.[0],
      links: [
        { to: MLB.predictions, label: "Predictions" },
        { to: MLB.games, label: "Scores" },
        { to: MLB.rankings, label: "Rankings" },
        { to: MLB.diagnostics, label: "Models" },
      ],
    },
    {
      sport: "nfl",
      name: "NFL",
      slate: { label: "Games this week", value: football.nfl?.length || null },
      record: {
        label: "Model · season",
        accuracy: nflOverall?.model_accuracy,
        n: nflOverall?.games,
        ci: accuracyInterval(nflOverall?.model_accuracy, nflOverall?.games),
      },
      leader: boards.nfl?.rows?.[0],
      links: [
        { to: footballPath("nfl", "picks"), label: "Predictions" },
        { to: footballPath("nfl", "rankings"), label: "Rankings" },
        { to: footballPath("nfl", "diagnostics"), label: "Models" },
        { to: "/pickem/nfl", label: "Pick’em" },
      ],
    },
    {
      sport: "cfb",
      name: "College football",
      slate: { label: "FBS games this week", value: football.fbs?.length || null },
      // Headline the like-for-like FBS v FBS number; the pooled one is inflated by
      // FCS opponents. Without the split, show the pooled number and say so.
      record: cfbFbsOnly
        ? {
            label: "Model · FBS\u00a0v\u00a0FBS",
            accuracy: cfbFbsOnly.accuracy,
            n: cfbFbsOnly.n,
            ci: cfbFbsOnly.ci,
            secondary: cfbOverall?.model_accuracy != null
              ? `All games ${formatPercent(cfbOverall.model_accuracy)} (n=${cfbOverall.games}) incl. FCS`
              : null,
          }
        : {
            label: "Model · season",
            accuracy: cfbOverall?.model_accuracy,
            n: cfbOverall?.games,
            ci: accuracyInterval(cfbOverall?.model_accuracy, cfbOverall?.games),
            secondary: cfbOverall?.model_accuracy != null ? "Includes FCS opponents" : null,
          },
      leader: boards.cfb?.rows?.[0],
      links: [
        { to: footballPath("fbs", "picks"), label: "Predictions" },
        { to: footballPath("fbs", "scoreboard"), label: "Scores" },
        { to: footballPath("fbs", "rankings"), label: "Rankings" },
        { to: "/pickem/cfb", label: "Pick’em" },
      ],
    },
  ];

  return (
    <div className="home">
      {error && (
        <div className="home-alert" role="alert">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── Masthead ── */}
      <header className="home-mast">
        <div className="home-mast-inner">
          <p className="ht-eyebrow">All sports</p>
          <h1>Today across MLB, NFL and college football</h1>
          <p className="home-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
            {lastUpdated && (
              <span className="home-updated"> · updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
      </header>

      <div className="home-body">
        <div className="sc-grid">
          {sportCards.map((c) => <SportCard key={c.sport} {...c} />)}
        </div>

        {/* ── Sport rails ── */}
        {games.length > 0 && (
          <Rail title="MLB today" sport="mlb" count={games.length} moreTo={MLB.predictions} moreLabel="All predictions">
            {games.map((g) => <MlbGameTile key={g.gamePk} game={g} homeProb={mlbProbs[g.gamePk]} />)}
          </Rail>
        )}

        {FOOTBALL_RAILS.map((l) => {
          const rows = football[l.key] || [];
          if (!rows.length) return null;
          return (
            <Rail
              key={l.key}
              title={`${l.label} this week`}
              sport={l.sport}
              count={rows.length}
              moreTo={footballPath(l.key, "picks")}
              moreLabel="All picks"
            >
              {rows.map((r) => (
                <FootballGameTile key={r.game_id} row={r} leagueKey={l.key} />
              ))}
            </Rail>
          );
        })}

        {games.length === 0 && footballCount === 0 && (
          <div className="home-quiet">
            Nothing on the board right now. Try{" "}
            <Link to={footballPath("nfl", "picks")}>NFL picks</Link>,{" "}
            <Link to={footballPath("fbs", "picks")}>college picks</Link> or{" "}
            <Link to={MLB.predictions}>MLB predictions</Link>.
          </div>
        )}

        {/* ── Two-column main ── */}
        <div className="home-grid">
          <div className="home-col-main">
            {picks.length > 0 && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Model's best picks</h2>
                  <span className="panel-meta">every sport, most confident first</span>
                </div>
                <div className="pick-list">
                  {picks.map((p) => <PickRow key={p.key} pick={p} />)}
                </div>
              </section>
            )}

            <section className="panel">
              <div className="panel-head">
                <h2>Model scoreboard</h2>
                <span className="panel-meta">accuracy picking winners, with a 95% interval</span>
              </div>
              <ul className="ms-list">
                {scoreboard.map((r) => <ScoreRow key={r.sport} row={r} />)}
              </ul>
              <div className="ms-legend" aria-hidden="true">
                <span><i className="ms-dot ms-dot--legend" /> Model</span>
                <span><i className="ms-mark ms-mark--market ms-mark--legend" /> Market favourite</span>
                <span><i className="ms-mark ms-mark--elo ms-mark--legend" /> Elo</span>
                <span><i className="ms-mark ms-mark--home ms-mark--legend" /> Home team</span>
                <span className="ms-axis">axis 30–90%, dashed line = coin flip</span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Power rankings</h2>
                <span className="panel-meta">top {LEADERS_SHOWN} · bars are 90% rank ranges</span>
              </div>
              <div className="pl-grid">
                <LeadersCard sport="mlb" label="MLB" to={MLB.rankings} {...boards.mlb} rows={boards.mlb?.rows || []} />
                <LeadersCard sport="nfl" label="NFL" to={footballPath("nfl", "rankings")} {...boards.nfl} rows={boards.nfl?.rows || []} />
                <LeadersCard sport="cfb" label="College FBS" to={footballPath("fbs", "rankings")} {...boards.cfb} rows={boards.cfb?.rows || []} />
              </div>
            </section>

            {recentViews.length > 0 && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Continue where you left off</h2>
                  <button className="btn-ghost" onClick={handleClearRecentViews}>Clear</button>
                </div>
                <div className="recent-grid">
                  {recentViews.map((view) => (
                    <Link key={view.path} to={view.path} className="recent">
                      <span className="recent-icon" aria-hidden="true">{view.icon}</span>
                      <span className="recent-copy">
                        <span className="recent-title">{view.label}</span>
                        <span className="recent-hint">{view.hint}</span>
                      </span>
                      <span className="recent-time">{formatRecentViewTime(view.visitedAt)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {favoriteTeams.length > 0 && (
              <section className="panel">
                <div className="panel-head"><h2>Favorite teams</h2></div>
                <div className="fav-grid">
                  {favoriteTeams.map((team) => (
                    <Link key={team.abbreviation} to={MLB.team(team.abbreviation)} className="fav">
                      {team.teamId && (
                        <img
                          src={getTeamLogoUrl(team.teamId)}
                          alt=""
                          className="fav-logo"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      )}
                      <span className="fav-copy">
                        <span className="fav-name">{team.name || team.abbreviation}</span>
                        <span className="fav-meta">{team.abbreviation}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="news-cols">
              {[
                { key: "mlb", title: "MLB News", items: sortedNews(news.mlb) },
                { key: "braves", title: "Braves News", items: sortedNews(news.braves) },
              ].map(({ key, title, items }) => (
                <section className="panel" key={key}>
                  <div className="panel-head">
                    <h2>{title}</h2>
                    {key === "mlb" && (
                      <button
                        className="btn-ghost"
                        onClick={handleRefreshNews}
                        disabled={newsRefreshing}
                        aria-label="Refresh news"
                      >
                        {newsRefreshing ? "…" : "↺"}
                      </button>
                    )}
                  </div>
                  <div className="news-scroll">
                    {items.length === 0 ? (
                      <div className="empty-sm">No articles available</div>
                    ) : (
                      items.slice(0, 10).map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="news-item"
                        >
                          <div className="news-title">{item.title}</div>
                          <div className="news-src">
                            {item.source?.name} · {new Date(item.publishedAt).toLocaleDateString()}
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* ── Right rail: standings and the college top 25 ── */}
          <aside className="home-col-side">
            <section className="panel panel--sticky">
              <div className="side-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={rightTab === "standings"}
                  data-sport="mlb"
                  className={`side-tab${rightTab === "standings" ? " side-tab--active" : ""}`}
                  onClick={() => setRightTab("standings")}
                >
                  ⚾ MLB standings
                </button>
                <button
                  role="tab"
                  aria-selected={rightTab === "cfb"}
                  data-sport="cfb"
                  className={`side-tab${rightTab === "cfb" ? " side-tab--active" : ""}`}
                  onClick={() => setRightTab("cfb")}
                >
                  🏟️ CFB top 25
                </button>
              </div>

              <div className="side-scroll">
                {rightTab === "standings" && (
                  Object.keys(standings).length === 0 ? (
                    <div className="empty-sm">Standings unavailable</div>
                  ) : (
                    Object.entries(standings).map(([div, teams]) => (
                      <div key={div} className="std-div">
                        <div className="std-head">{div}</div>
                        <table className="std-table">
                          <thead>
                            <tr><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th></tr>
                          </thead>
                          <tbody>
                            {teams.map((team, i) => (
                              <tr key={i} className={abbr(team.Tm) === "ATL" ? "std-fav" : ""}>
                                <td>
                                  <Link to={MLB.team(abbr(team.Tm))} className="std-team">
                                    {team.tmId && (
                                      <img
                                        src={getTeamLogoUrl(team.tmId)}
                                        alt=""
                                        className="std-logo"
                                        onError={(e) => { e.target.style.display = "none"; }}
                                      />
                                    )}
                                    {getTeamShortName(team.Tm)}
                                  </Link>
                                </td>
                                <td>{team.W}</td>
                                <td>{team.L}</td>
                                <td>{team.pct}</td>
                                <td>{team.GB}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )
                )}

                {rightTab === "cfb" && (
                  cfbRanks.length === 0 ? (
                    <div className="empty-sm">
                      No college rankings for {season} yet.
                      <br />
                      <Link to={footballPath("fbs", "rankings")}>See the FBS board</Link>
                    </div>
                  ) : (
                    <table className="std-table std-table--rank">
                      <thead><tr><th>#</th><th>Team</th><th>Rec</th><th>Rtg</th></tr></thead>
                      <tbody>
                        {cfbRanks.slice(0, 25).map((r) => (
                          <tr key={r.team}>
                            <td className="rk">{r.rank}</td>
                            <td>{r.team}</td>
                            <td>{r.record}</td>
                            <td>{Math.round(r.rating)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
