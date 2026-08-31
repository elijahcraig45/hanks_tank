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
import "./styles/HomePage.css";

/**
 * The front page of a two-sport site.
 *
 * Structured as rails rather than a baseball dashboard with football bolted on: one
 * "today" rail per sport, then a single mixed board of the model's best picks across
 * both. The mixed board is the point — it is the only place the two pipelines are
 * compared side by side, and it is what makes this read as a sports page instead of
 * two products sharing a domain.
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
// click away on the football tab.
const FOOTBALL_RAILS = [
  { key: "nfl", sport: "nfl", division: null, label: "NFL" },
  { key: "fbs", sport: "cfb", division: "fbs", label: "College FBS" },
];

// The homepage board shows at most this many picks from any one sport. Without a cap
// football wins every slot: a 95% FBS-over-FCS mismatch outranks every baseball game
// ever played, and the board stops being about both sports.
const PICKS_PER_SPORT = 4;

const DIAGNOSTICS_WINDOW_DAYS = 30;

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
 * Best picks across both sports, capped per sport so each is actually represented.
 *
 * Cross-division games are dropped outright. An FBS side favoured over an FCS one is
 * the model's most confident output and its least interesting — the page's own
 * reasoning calls those picks cheap, so it should not lead with eight of them.
 */
export function buildPicksBoard(mlbPicks, footballPicks, limit = PICKS_PER_SPORT) {
  const TIER_RANK = { high: 0, medium: 1, low: 2 };
  const rank = (a, b) =>
    (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) ||
    Math.abs(b.homeProb - 0.5) - Math.abs(a.homeProb - 0.5);

  const usable = (p) => p.homeProb != null && !p.crossDivision;

  return [
    ...footballPicks.filter(usable).sort(rank).slice(0, limit),
    ...mlbPicks.filter(usable).sort(rank).slice(0, limit),
  ].sort(rank);
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
    href: sport === "mlb" ? `/game/${row.game_pk}` : `/football/${leagueKey}/picks`,
  };
}

/* ── Horizontal rail with scroll affordances ─────────────────────────────── */
function Rail({ title, accent, count, moreTo, moreLabel, children }) {
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
    <section className={`rail rail--${accent}`}>
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

/* ── Tiles ───────────────────────────────────────────────────────────────── */
function MlbGameTile({ game }) {
  const away = game.teams.away;
  const home = game.teams.home;
  const status = gameStatusLabel(game);
  const showScore = status.cls === "live" || status.cls === "final";

  const side = (t) => (
    <div className="tile-row">
      <img
        src={getTeamLogoUrl(t.team.id)}
        alt=""
        className="tile-logo"
        onError={(e) => { e.target.style.display = "none"; }}
      />
      <span className="tile-team">{getTeamShortName(t.team.name)}</span>
      <span className="tile-rec">{t.leagueRecord?.wins}-{t.leagueRecord?.losses}</span>
      {showScore && <span className="tile-score">{t.score ?? ""}</span>}
    </div>
  );

  return (
    <Link to={`/game/${game.gamePk}`} className="tile">
      <div className={`tile-inner${status.cls === "live" ? " tile-inner--live" : ""}`}>
        <div className="tile-status">
          <span className={`ts ts--${status.cls}`}>{status.text}</span>
        </div>
        {side(away)}
        {side(home)}
        {game.venue && <div className="tile-venue">{game.venue.name}</div>}
      </div>
    </Link>
  );
}

function FootballGameTile({ row, leagueKey }) {
  const homePct = Math.round((row.home_win_probability || 0) * 100);
  const settled = row.prediction_correct !== null && row.prediction_correct !== undefined;
  const homeFav = homePct >= 50;

  return (
    <Link to={`/football/${leagueKey}/picks`} className="tile">
      <div className="tile-inner">
        <div className="tile-status">
          <span className="ts ts--preview">{fmtDay(row.game_date)}</span>
          {settled && (
            <span className={`ts-res ts-res--${row.prediction_correct ? "hit" : "miss"}`}>
              {row.prediction_correct ? "✓" : "✗"}
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
        <div className="tile-bar">
          <div className="tile-bar-away" style={{ width: `${100 - homePct}%` }} />
          <div className="tile-bar-home" style={{ width: `${homePct}%` }} />
        </div>
      </div>
    </Link>
  );
}

function PickRow({ pick }) {
  const homeFav = (pick.homeProb ?? 0.5) >= 0.5;
  const favProb = homeFav ? pick.homeProb : 1 - pick.homeProb;
  return (
    <Link to={pick.href} className={`pick pick--${pick.sport}`}>
      <span className="pick-sport" aria-hidden="true">{pick.sport === "mlb" ? "⚾" : "🏈"}</span>
      <span className="pick-copy">
        <span className="pick-teams">{pick.away} <span className="pick-at">@</span> {pick.home}</span>
        <span className="pick-meta">
          {pick.leagueKey.toUpperCase()} · {fmtDay(pick.date)} · picks <strong>{pick.winner}</strong>
        </span>
      </span>
      <span className="pick-prob">{formatPercent(favProb)}</span>
    </Link>
  );
}

/* ── HomePage ───────────────────────────────────────────────────────────── */
function HomePage() {
  const [news, setNews] = useState({ mlb: [], braves: [] });
  const [standings, setStandings] = useState({});
  const [games, setGames] = useState([]);
  const [football, setFootball] = useState({});
  const [cfbRanks, setCfbRanks] = useState([]);
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

      // allSettled throughout: a football table that has not been created yet must not
      // blank the baseball half of the page, and vice versa.
      const [
        , standingsData, gamesData, diagnosticsData, mlbPreds, cfbRankRes, ...footballRes
      ] = await Promise.all([
        fetchNews(),
        apiService.getStandings(year).catch(() => null),
        apiService.getGames().catch(() => null),
        apiService.getPredictionDiagnostics({ startDate: diagStart, endDate: today })
          .catch(() => null),
        apiService.getPredictions().catch(() => null),
        apiService.getFootballRankings?.("cfb", year, 25).catch(() => null) ?? null,
        ...FOOTBALL_RAILS.map((l) =>
          apiService.getFootballPredictions?.(l.sport, {
            season: year, division: l.division,
          }).catch(() => null) ?? null
        ),
      ]);

      const raw = standingsData?.data?.standings?.records;
      if (raw) setStandings(formatStandings(raw));

      setGames(gamesData?.dates?.[0]?.games || []);
      setCfbRanks(cfbRankRes?.data || []);

      const byLeague = {};
      const footballPicks = [];
      FOOTBALL_RAILS.forEach((l, i) => {
        const rows = footballRes[i]?.data || [];
        byLeague[l.key] = upcomingFootball(rows);
        byLeague[l.key].forEach((r) => footballPicks.push(normalizePick(r, "football", l.key)));
      });
      setFootball(byLeague);

      const mlbPicks = (mlbPreds?.predictions || []).map((r) => normalizePick(r, "mlb", "mlb"));
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
        <p>Loading Hank's Tank…</p>
      </div>
    );
  }

  return (
    <div className="home">
      {error && (
        <div className="home-alert">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── Masthead ── */}
      <header className="home-mast">
        <div className="home-mast-inner">
          <div>
            <h1>Today</h1>
            <p className="home-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
              {lastUpdated && (
                <span className="home-updated"> · updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </p>
          </div>

          <div className="home-kpis">
            {[
              { sport: "mlb", val: games.length || "—", label: "MLB games" },
              { sport: "ftbl", val: footballCount || "—", label: "Football games" },
              {
                sport: "mlb",
                val: formatPercent(diagnosticsSummary?.accuracy),
                label: `MLB model · ${DIAGNOSTICS_WINDOW_DAYS}d`,
              },
              {
                sport: "mlb",
                val: formatPercent(highConfidenceSummary?.accuracy),
                label: `High conf · ${DIAGNOSTICS_WINDOW_DAYS}d`,
              },
            ].map(({ sport, val, label }) => (
              <div key={label} className={`kpi kpi--${sport}`}>
                <div className="kpi-val">{val}</div>
                <div className="kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="home-body">
        {/* ── Sport rails ── */}
        {games.length > 0 && (
          <Rail title="MLB" accent="mlb" count={games.length} moreTo="/games" moreLabel="Scoreboard">
            {games.map((g) => <MlbGameTile key={g.gamePk} game={g} />)}
          </Rail>
        )}

        {FOOTBALL_RAILS.map((l) => {
          const rows = football[l.key] || [];
          if (!rows.length) return null;
          return (
            <Rail
              key={l.key}
              title={l.label}
              accent="ftbl"
              count={rows.length}
              moreTo={`/football/${l.key}/picks`}
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
            Nothing on the board right now. Try the{" "}
            <Link to="/football">football tab</Link> or{" "}
            <Link to="/predictions">MLB predictions</Link>.
          </div>
        )}

        {/* ── Two-column main ── */}
        <div className="home-grid">
          <div className="home-col-main">
            {picks.length > 0 && (
              <section className="card">
                <div className="card-head">
                  <h2>Model's best picks</h2>
                  <span className="card-meta">both sports, highest confidence first</span>
                </div>
                <div className="pick-list">
                  {picks.map((p) => <PickRow key={p.key} pick={p} />)}
                </div>
              </section>
            )}

            {recentViews.length > 0 && (
              <section className="card">
                <div className="card-head">
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
              <section className="card">
                <div className="card-head"><h2>Favorite teams</h2></div>
                <div className="fav-grid">
                  {favoriteTeams.map((team) => (
                    <Link key={team.abbreviation} to={`/team/${team.abbreviation}`} className="fav">
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
                <section className="card" key={key}>
                  <div className="card-head">
                    <h2>{title}</h2>
                    {key === "mlb" && (
                      <button
                        className="btn-ghost"
                        onClick={handleRefreshNews}
                        disabled={newsRefreshing}
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

          {/* ── Right rail: one panel, two sports ── */}
          <aside className="home-col-side">
            <section className="card card--sticky">
              <div className="side-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={rightTab === "standings"}
                  className={`side-tab${rightTab === "standings" ? " side-tab--active" : ""}`}
                  onClick={() => setRightTab("standings")}
                >
                  ⚾ Standings
                </button>
                <button
                  role="tab"
                  aria-selected={rightTab === "cfb"}
                  className={`side-tab${rightTab === "cfb" ? " side-tab--active" : ""}`}
                  onClick={() => setRightTab("cfb")}
                >
                  🏈 Top 25
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
                                  <Link to={`/team/${abbr(team.Tm)}`} className="std-team">
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
                      No college rankings for {new Date().getFullYear()} yet.
                      <br />
                      <Link to="/football/fbs/rankings">See last season's board</Link>
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
