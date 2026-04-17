import React, { useState, useEffect, useRef } from "react";
import {
  Container, Row, Col, Card, Table,
  Spinner, Alert, Button, ListGroup,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import "./styles/HomePage.css";

// ── constants ────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.REACT_APP_API_URL || "https://hankstank.uc.r.appspot.com/api";

const DIVISION_MAP = {
  200: "AL West", 201: "AL East", 202: "AL Central",
  203: "NL West", 204: "NL East", 205: "NL Central",
};
const DIVISION_ORDER = [
  "AL East", "AL Central", "AL West",
  "NL East", "NL Central", "NL West",
];

const TEAM_ABBR = {
  "Atlanta Braves": "ATL", "Braves": "ATL",
  "Miami Marlins": "MIA", "Marlins": "MIA",
  "New York Mets": "NYM", "Mets": "NYM",
  "Philadelphia Phillies": "PHI", "Phillies": "PHI",
  "Washington Nationals": "WSN", "Nationals": "WSN",
  "Chicago Cubs": "CHC", "Cubs": "CHC",
  "Cincinnati Reds": "CIN", "Reds": "CIN",
  "Milwaukee Brewers": "MIL", "Brewers": "MIL",
  "Pittsburgh Pirates": "PIT", "Pirates": "PIT",
  "St. Louis Cardinals": "STL", "Cardinals": "STL",
  "Arizona Diamondbacks": "ARI", "D-backs": "ARI",
  "Colorado Rockies": "COL", "Rockies": "COL",
  "Los Angeles Dodgers": "LAD", "Dodgers": "LAD",
  "San Diego Padres": "SDP", "Padres": "SDP",
  "San Francisco Giants": "SFG", "Giants": "SFG",
  "Baltimore Orioles": "BAL", "Orioles": "BAL",
  "Boston Red Sox": "BOS", "Red Sox": "BOS",
  "New York Yankees": "NYY", "Yankees": "NYY",
  "Tampa Bay Rays": "TBR", "Rays": "TBR",
  "Toronto Blue Jays": "TOR", "Blue Jays": "TOR",
  "Chicago White Sox": "CWS", "White Sox": "CWS",
  "Cleveland Guardians": "CLE", "Guardians": "CLE",
  "Detroit Tigers": "DET", "Tigers": "DET",
  "Kansas City Royals": "KC", "Royals": "KC",
  "Minnesota Twins": "MIN", "Twins": "MIN",
  "Houston Astros": "HOU", "Astros": "HOU",
  "Los Angeles Angels": "LAA", "Angels": "LAA",
  "Oakland Athletics": "OAK", "Athletics": "OAK",
  "Seattle Mariners": "SEA", "Mariners": "SEA",
  "Texas Rangers": "TEX", "Rangers": "TEX",
};

const abbr = (name) => TEAM_ABBR[name] || (name || "").substring(0, 3).toUpperCase();
const logoUrl = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

const fmtTime = (utc) => {
  if (!utc) return "";
  return new Date(utc).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
};

const gameStatusLabel = (game) => {
  const state = game?.status?.abstractGameState;
  const detail = game?.status?.detailedState;
  if (state === "Live") return { text: detail || "Live", cls: "live" };
  if (state === "Final") return { text: "Final", cls: "final" };
  return { text: fmtTime(game.gameDate), cls: "preview" };
};

// ── formatStandings ──────────────────────────────────────────────────────────

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

// ── GamesCarousel ────────────────────────────────────────────────────────────

function GamesCarousel({ games }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el && el.removeEventListener("scroll", checkScroll);
  }, [games]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  if (!games.length) return null;

  return (
    <div className="games-carousel-wrap mb-4">
      <div className="games-carousel-header d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">⚾ Today's Games</h5>
        <div className="d-flex gap-1">
          <button
            className="carousel-btn"
            onClick={() => scroll(-1)}
            disabled={!canLeft}
            aria-label="Scroll left"
          >‹</button>
          <button
            className="carousel-btn"
            onClick={() => scroll(1)}
            disabled={!canRight}
            aria-label="Scroll right"
          >›</button>
        </div>
      </div>
      <div className="games-carousel-track" ref={trackRef}>
        {games.map((game) => {
          const away = game.teams.away;
          const home = game.teams.home;
          const status = gameStatusLabel(game);
          const isLive = status.cls === "live";
          const isFinal = status.cls === "final";
          return (
            <Link
              key={game.gamePk}
              to={`/game/${game.gamePk}`}
              className="game-tile text-decoration-none"
            >
              <div className={`game-tile-inner${isLive ? " game-tile-live" : ""}`}>
                <div className="game-status-badge">
                  <span className={`gs-${status.cls}`}>{status.text}</span>
                </div>
                <div className="game-team-row">
                  <img src={logoUrl(away.team.id)} alt="" className="game-logo" onError={(e) => { e.target.style.display = "none"; }} />
                  <span className="game-team-name">{away.team.name.split(" ").slice(-1)[0]}</span>
                  <span className="game-record text-muted">{away.leagueRecord.wins}-{away.leagueRecord.losses}</span>
                  {(isLive || isFinal) && <span className="game-score">{away.score ?? ""}</span>}
                </div>
                <div className="game-at">@</div>
                <div className="game-team-row">
                  <img src={logoUrl(home.team.id)} alt="" className="game-logo" onError={(e) => { e.target.style.display = "none"; }} />
                  <span className="game-team-name">{home.team.name.split(" ").slice(-1)[0]}</span>
                  <span className="game-record text-muted">{home.leagueRecord.wins}-{home.leagueRecord.losses}</span>
                  {(isLive || isFinal) && <span className="game-score">{home.score ?? ""}</span>}
                </div>
                {game.venue && <div className="game-venue text-muted">{game.venue.name}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── HomePage ─────────────────────────────────────────────────────────────────

function HomePage() {
  const [news, setNews] = useState({ mlb: [], braves: [] });
  const [standings, setStandings] = useState({});
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchNews = async () => {
    const [mlbRes, bravesRes] = await Promise.all([
      fetch(`${BASE_URL}/mlb-news`).catch(() => null),
      fetch(`${BASE_URL}/braves-news`).catch(() => null),
    ]);
    const mlb = mlbRes?.ok ? (await mlbRes.json()).articles || [] : [];
    const braves = bravesRes?.ok ? (await bravesRes.json()).articles || [] : [];
    setNews({ mlb, braves });
  };

  const handleRefreshNews = async () => {
    setNewsRefreshing(true);
    try {
      await fetch(`${BASE_URL}/news/refresh`, { method: "POST" });
      await fetchNews();
    } catch (e) {
      console.error("News refresh failed:", e);
    } finally {
      setNewsRefreshing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const year = new Date().getFullYear();
        const [, standingsData, gamesData] = await Promise.all([
          fetchNews(),
          apiService.getStandings(year).catch(() => null),
          fetch("https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1")
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        const raw = standingsData?.data?.standings?.records;
        if (raw) setStandings(formatStandings(raw));

        const todayGames = gamesData?.dates?.[0]?.games || [];
        setGames(todayGames);

        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sortedNews = (arr) =>
    [...(arr || [])].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading Hank's Tank…</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="xl" className="py-4 home-page">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Header ── */}
      <div className="home-header text-center mb-4">
        <h1 className="home-title">Hank's Tank</h1>
        <p className="home-subtitle mb-2">MLB ANALYTICS · {new Date().getFullYear()}</p>
        {lastUpdated && (
          <small className="text-muted" style={{ fontSize: "0.75rem" }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </small>
        )}
      </div>

      {/* ── Stat pills ── */}
      <div className="stat-pill-row justify-content-center mb-4">
        {[
          { icon: "⚾", val: games.length || "—", label: "Games Today" },
          { icon: "📊", val: "100K+", label: "Statcast PAs" },
          { icon: "🤖", val: "V10", label: "Model Version" },
          { icon: "🎯", val: "54.7%", label: "2026 Live Acc." },
          { icon: "🏟️", val: "30", label: "MLB Teams" },
        ].map(({ icon, val, label }) => (
          <div key={label} className="stat-pill fade-up">
            <span className="stat-pill-icon">{icon}</span>
            <div>
              <div className="stat-pill-val">{val}</div>
              <div className="stat-pill-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Games Carousel ── */}
      {games.length > 0 && <GamesCarousel games={games} />}

      {/* ── Main Grid ── */}
      <Row className="g-4">
        {/* ── Left col: nav + news ── */}
        <Col xs={12} lg={8}>

          {/* Quick nav cards */}
          <div className="quick-nav-grid mb-4">
            {[
              { to: "/predictions",       icon: "🔮", label: "Predictions",     primary: true },
              { to: "/games",             icon: "📅", label: "Scoreboard",      primary: false },
              { to: "/TeamBatting",       icon: "🏏", label: "Team Batting",    primary: false },
              { to: "/TeamPitching",      icon: "⚾", label: "Team Pitching",   primary: false },
              { to: "/PlayerBatting",     icon: "🧢", label: "Player Batting",  primary: false },
              { to: "/PlayerPitching",    icon: "💪", label: "Player Pitching", primary: false },
              { to: "/advanced-analysis", icon: "🔬", label: "Advanced",        primary: false },
              { to: "/transactions",      icon: "🔄", label: "Transactions",    primary: false },
            ].map(({ to, icon, label, primary }) => (
              <Link
                key={to}
                to={to}
                className={`quick-nav-card${primary ? " quick-nav-card--primary" : ""}`}
              >
                <span className="quick-nav-icon">{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          {/* News columns */}
          <Row className="g-3">
            {[
              { key: "mlb", title: "⚾ MLB News", items: sortedNews(news.mlb) },
              { key: "braves", title: "🪓 Braves News", items: sortedNews(news.braves) },
            ].map(({ key, title, items }) => (
              <Col md={6} key={key}>
                <Card className="news-card h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">{title}</span>
                    {key === "mlb" && (
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={handleRefreshNews}
                        disabled={newsRefreshing}
                      >
                        {newsRefreshing ? <Spinner size="sm" animation="border" /> : "↺"}
                      </Button>
                    )}
                  </Card.Header>
                  <div className="news-scroll">
                    {items.length === 0 ? (
                      <div className="text-center text-muted py-4 small">No articles available</div>
                    ) : (
                      <ListGroup variant="flush">
                        {items.slice(0, 10).map((item, i) => (
                          <ListGroup.Item key={i} className="news-item px-3 py-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              <div className="news-title">{item.title}</div>
                              <small className="text-muted">
                                {item.source?.name} · {new Date(item.publishedAt).toLocaleDateString()}
                              </small>
                            </a>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        {/* ── Right col: standings ── */}
        <Col xs={12} lg={4}>
          <Card className="standings-card">
            <Card.Header>
              <span className="fw-semibold">🏆 {new Date().getFullYear()} Standings</span>
            </Card.Header>
            <div className="standings-scroll">
              {Object.keys(standings).length === 0 ? (
                <div className="text-center text-muted py-5 small">
                  Standings unavailable
                </div>
              ) : (
                Object.entries(standings).map(([div, teams]) => (
                  <div key={div} className="standings-division">
                    <div className="standings-div-header">{div}</div>
                    <Table size="sm" className="standings-table mb-0">
                      <thead>
                        <tr>
                          <th>Team</th>
                          <th>W</th>
                          <th>L</th>
                          <th>PCT</th>
                          <th>GB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, i) => (
                          <tr
                            key={i}
                            className={
                              team.Tm === "Braves" || team.Tm === "Atlanta Braves"
                                ? "standings-braves"
                                : ""
                            }
                          >
                            <td>
                              <Link
                                to={`/team/${abbr(team.Tm)}`}
                                className="text-decoration-none fw-medium standings-team-link"
                              >
                                {team.tmId && (
                                  <img
                                    src={logoUrl(team.tmId)}
                                    alt=""
                                    className="standings-logo me-1"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                  />
                                )}
                                {team.Tm}
                              </Link>
                            </td>
                            <td>{team.W}</td>
                            <td>{team.L}</td>
                            <td>{team.pct}</td>
                            <td>{team.GB}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;
