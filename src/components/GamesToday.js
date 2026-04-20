import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Table, Badge, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import "./styles/TodaysGames.css";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function offsetDate(iso, days) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function getGamePhase(statusCode) {
  if (statusCode === "F") return "final";
  if (statusCode === "S" || statusCode === "P") return "upcoming";
  return "live";
}

function normalizeConfidenceTier(value) {
  if (!value) return "";
  return String(value).toLowerCase();
}

function formatConfidenceTier(value) {
  const normalized = normalizeConfidenceTier(value);
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function predictionEdgePoints(pred) {
  if (pred?.home_win_probability == null || pred?.away_win_probability == null) return 0;
  return Math.round(Math.abs(pred.home_win_probability - pred.away_win_probability) * 100);
}

function liveBaseState(linescore) {
  const offense = linescore?.offense || {};
  const bases = [
    offense.first ? "1st" : null,
    offense.second ? "2nd" : null,
    offense.third ? "3rd" : null,
  ].filter(Boolean);
  return bases.length ? `On ${bases.join(" & ")}` : "Bases empty";
}

function liveSnapshot(feed) {
  const linescore = feed?.liveData?.linescore;
  const play = feed?.liveData?.plays?.currentPlay;
  if (!linescore || !play?.about) return null;

  const outs = linescore.outs ?? play.count?.outs ?? 0;
  const batter = play.matchup?.batter?.fullName;
  const pitcher = play.matchup?.pitcher?.fullName;

  return {
    inning: `${play.about.halfInning?.toUpperCase() || ""} ${play.about.inning ?? ""}`.trim(),
    outsLabel: `${outs} out${outs === 1 ? "" : "s"}`,
    baseState: liveBaseState(linescore),
    matchup: batter && pitcher ? `${batter} vs ${pitcher}` : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal generation — branches on V8 (Elo/Pythagorean) vs V6-V7 (wOBA)
// ─────────────────────────────────────────────────────────────────────────────
const NEUTRAL_WOBA = 0.320;

function generateSignals(pred) {
  if (!pred) return [];
  const signals = [];
  const homeTeam = pred.home_team_name?.split(" ").slice(-1)[0] || "Home";
  const awayTeam = pred.away_team_name?.split(" ").slice(-1)[0] || "Away";
  const isV8 = pred.elo_differential != null || (pred.model_version || "").includes("8");

  if (isV8) {
    // Elo rating edge
    if (pred.elo_differential != null && Math.abs(pred.elo_differential) >= 18) {
      const favored = pred.elo_differential > 0 ? homeTeam : awayTeam;
      const edge    = Math.abs(Math.round(pred.elo_differential));
      signals.push({
        type: pred.elo_differential > 0 ? "positive" : "negative",
        text: `${favored} Elo edge +${edge} pts`,
      });
    }

    // Pythagorean win%
    const hp = pred.home_pythag_season;
    const ap = pred.away_pythag_season;
    if (hp != null && ap != null && Math.abs(hp - ap) >= 0.045) {
      const better  = hp > ap ? homeTeam : awayTeam;
      const bestPct = Math.round(Math.max(hp, ap) * 100);
      const wrstPct = Math.round(Math.min(hp, ap) * 100);
      signals.push({
        type: hp > ap ? "positive" : "negative",
        text: `Pythagorean: ${better} ${bestPct}% vs ${wrstPct}%`,
      });
    }

    // Active winning/losing streak ≥ 3
    const hSt = pred.home_current_streak;
    const aSt = pred.away_current_streak;
    const bigStreak = [
      hSt && Math.abs(hSt) >= 3 ? { team: homeTeam, val: hSt } : null,
      aSt && Math.abs(aSt) >= 3 ? { team: awayTeam, val: aSt } : null,
    ].filter(Boolean).sort((a, b) => Math.abs(b.val) - Math.abs(a.val))[0];
    if (bigStreak) {
      const w = bigStreak.val > 0;
      signals.push({
        type: w ? "positive" : "negative",
        text: `${bigStreak.team} on ${w ? "W" : "L"}${Math.abs(bigStreak.val)} streak`,
      });
    }

    // Last-10 run differential
    const h10 = pred.home_run_diff_10g ?? 0;
    const a10 = pred.away_run_diff_10g ?? 0;
    const best10 = Math.abs(h10) >= Math.abs(a10) ? { team: homeTeam, val: h10 } : { team: awayTeam, val: a10 };
    if (Math.abs(best10.val) >= 6) {
      signals.push({
        type: best10.val > 0 ? "positive" : "negative",
        text: `${best10.team} ${best10.val > 0 ? "+" : ""}${best10.val} run diff (L10)`,
      });
    }

    // H2H win%
    if (pred.h2h_win_pct_3yr != null && (pred.h2h_game_count_3yr ?? 0) >= 5) {
      const pct = Math.round(pred.h2h_win_pct_3yr * 100);
      if (pct >= 56 || pct <= 44) {
        signals.push({
          type: pct >= 56 ? "positive" : "negative",
          text: `${homeTeam} ${pct}% H2H vs ${awayTeam} (3yr)`,
        });
      }
    }

  } else {
    // V6 / V7 wOBA-based signals
    const homeHand = pred.away_starter_hand;
    const awayHand = pred.home_starter_hand;

    if (pred.home_lineup_woba_vs_hand != null) {
      const d   = pred.home_lineup_woba_vs_hand - NEUTRAL_WOBA;
      const dir = d >= 0.010 ? "strong" : d <= -0.010 ? "weak" : "avg";
      signals.push({
        type: d >= 0.010 ? "positive" : d <= -0.010 ? "negative" : "neutral",
        text: `${homeTeam} .${Math.round(pred.home_lineup_woba_vs_hand * 1000)} wOBA vs ${homeHand}HP — ${dir}`,
      });
    }
    if (pred.away_lineup_woba_vs_hand != null) {
      const d   = pred.away_lineup_woba_vs_hand - NEUTRAL_WOBA;
      const dir = d >= 0.010 ? "strong" : d <= -0.010 ? "weak" : "avg";
      signals.push({
        type: d >= 0.010 ? "positive" : d <= -0.010 ? "negative" : "neutral",
        text: `${awayTeam} .${Math.round(pred.away_lineup_woba_vs_hand * 1000)} wOBA vs ${awayHand}HP — ${dir}`,
      });
    }
    if (pred.home_h2h_woba != null && pred.home_h2h_pa_total >= 10) {
      const d   = pred.home_h2h_woba - NEUTRAL_WOBA;
      const adj = pred.home_h2h_pa_total < 60 ? " (sm sample)" : "";
      signals.push({
        type: d >= 0.015 ? "positive" : d <= -0.015 ? "negative" : "neutral",
        text: `${homeTeam} vs ${pred.away_starter_name?.split(" ").slice(-1)[0]}: .${Math.round(pred.home_h2h_woba * 1000)} wOBA${adj}`,
      });
    }
    if (pred.away_h2h_woba != null && pred.away_h2h_pa_total >= 10) {
      const d   = pred.away_h2h_woba - NEUTRAL_WOBA;
      const adj = pred.away_h2h_pa_total < 60 ? " (sm sample)" : "";
      signals.push({
        type: d >= 0.015 ? "positive" : d <= -0.015 ? "negative" : "neutral",
        text: `${awayTeam} vs ${pred.home_starter_name?.split(" ").slice(-1)[0]}: .${Math.round(pred.away_h2h_woba * 1000)} wOBA${adj}`,
      });
    }
    if (pred.away_starter_woba_allowed != null) {
      const d = pred.away_starter_woba_allowed - NEUTRAL_WOBA;
      if (Math.abs(d) >= 0.015) {
        signals.push({
          type: d <= -0.015 ? "negative" : "positive",
          text: `${pred.away_starter_name?.split(" ").slice(-1)[0]} allows .${Math.round(pred.away_starter_woba_allowed * 1000)} wOBA`,
        });
      }
    }
    if (pred.home_starter_woba_allowed != null) {
      const d = pred.home_starter_woba_allowed - NEUTRAL_WOBA;
      if (Math.abs(d) >= 0.015) {
        signals.push({
          type: d <= -0.015 ? "positive" : "negative",
          text: `${pred.home_starter_name?.split(" ").slice(-1)[0]} allows .${Math.round(pred.home_starter_woba_allowed * 1000)} wOBA`,
        });
      }
    }
  }

  return signals.slice(0, 4);
}

const TodaysGames = () => {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [games, setGames] = useState([]);
  const [livefeed, setLivefeed] = useState([]);
  const [predictions, setPredictions] = useState({}); // keyed by gamePk
  const [statusFilter, setStatusFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("time");


  // Re-fetch games whenever the selected date changes
  useEffect(() => {
    setGames([]);
    setLivefeed([]);
    setPredictions({});
    let isMounted = true;
    const fetchGames = async () => {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${selectedDate}`
        );
        if (!response?.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (!isMounted) return;
        if (data.dates?.length > 0 && data.dates[0].games) {
          setGames(data.dates[0].games);
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error("Failed to fetch games:", error);
      }
    };

    fetchGames();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Fetch predictions whenever the date changes
  useEffect(() => {
    let isMounted = true;
    const fetchPredictions = async () => {
      try {
        const data = await apiService.getPredictions(selectedDate);
        if (!isMounted) return;
        if (data?.predictions) {
          const byPk = {};
          data.predictions.forEach((p) => { byPk[p.game_pk] = p; });
          setPredictions(byPk);
        }
      } catch (err) {
        console.warn("Predictions unavailable:", err.message);
      }
    };
    fetchPredictions();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;
    const fetchGameDetails = async () => {
      try {
        const responses = await Promise.allSettled(
          games.map(async (game) => {
            const gamePk = game.gamePk;
            const response = await fetch(
              `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
            );
            if (!response?.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
        );
        if (!isMounted) return;
        setLivefeed(
          responses
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
        );
      } catch (error) {
        console.error("Failed to fetch game details:", error);
      }
    };

    if (games.length) {
      fetchGameDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [games]);

  const gameEntries = games.map((game) => {
    const gameFeed = livefeed.find((feed) => feed.gamePk === game.gamePk);
    const statusCode = game.status.statusCode;
    const phase = getGamePhase(statusCode);
    const isScheduled = statusCode === "S";
    const isFinal = statusCode === "F";
    const isPreGame = statusCode === "P";
    const inProgress = phase === "live";

    const innings = gameFeed ? gameFeed.liveData.linescore.innings : [];
    const awayTotals = gameFeed
      ? gameFeed.liveData.linescore.teams.away
      : { runs: "—", hits: "—", errors: "—" };
    const homeTotals = gameFeed
      ? gameFeed.liveData.linescore.teams.home
      : { runs: "—", hits: "—", errors: "—" };

    const pred = predictions[game.gamePk];
    const awayProb = pred?.away_win_probability != null ? Math.round(pred.away_win_probability * 100) : null;
    const homeProb = pred?.home_win_probability != null ? Math.round(pred.home_win_probability * 100) : null;

    return {
      game,
      gameFeed,
      phase,
      isScheduled,
      isFinal,
      isPreGame,
      inProgress,
      innings,
      awayTotals,
      homeTotals,
      pred,
      awayProb,
      homeProb,
    };
  });

  const filteredEntries = gameEntries
    .filter((entry) => statusFilter === "all" || entry.phase === statusFilter)
    .filter((entry) => confidenceFilter === "all" || normalizeConfidenceTier(entry.pred?.confidence_tier) === confidenceFilter)
    .filter((entry) => !confirmedOnly || entry.pred?.lineup_confirmed)
    .sort((a, b) => {
      if (sortMode === "edge") {
        const edgeDelta = predictionEdgePoints(b.pred) - predictionEdgePoints(a.pred);
        if (edgeDelta !== 0) return edgeDelta;
      }
      return new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime();
    });

  const liveGames = filteredEntries.filter((entry) => entry.phase === "live");
  const upcomingGames = filteredEntries.filter((entry) => entry.phase === "upcoming");
  const finalGames = filteredEntries.filter((entry) => entry.phase === "final");

  const renderGameCard = (entry, entries, sectionClass = "") => {
    const {
      game,
      gameFeed,
      isScheduled,
      isFinal,
      isPreGame,
      inProgress,
      innings,
      awayTotals,
      homeTotals,
      pred,
      awayProb,
      homeProb,
    } = entry;
    const snapshot = inProgress ? liveSnapshot(gameFeed) : null;
    const signalItems = generateSignals(pred).slice(0, 2);
    const edgePoints = predictionEdgePoints(pred);
    const liveColSpan = entries.length === 1 ? { xs: 12 } : { xs: 12, xl: 6 };

    return (
      <Col
        key={game.gamePk}
        xs={12}
        md={sectionClass === "games-section--live" ? liveColSpan.md : 6}
        xl={sectionClass === "games-section--live" ? liveColSpan.xl : 4}
        className="game-grid-col"
      >
        <Link to={`/game/${game.gamePk}`} className="game-card-link text-decoration-none">
          <Card className={`game-card shadow-sm${inProgress ? " game-card--live" : ""}`}>
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="game-team">
                  <div className="game-team-name">{game.teams.away.team.name}</div>
                  <div className="game-team-record text-muted">
                    {game.teams.away.leagueRecord.wins}–{game.teams.away.leagueRecord.losses}
                  </div>
                </div>
                <div className="game-at text-muted">@</div>
                <div className="game-team text-end">
                  <div className="game-team-name">{game.teams.home.team.name}</div>
                  <div className="game-team-record text-muted">
                    {game.teams.home.leagueRecord.wins}–{game.teams.home.leagueRecord.losses}
                  </div>
                </div>
              </div>

              {(isScheduled || isPreGame) && pred?.away_starter_name && (
                <div className="game-pitchers text-muted mb-2">
                  <span>{pred.away_starter_name?.split(" ").slice(-1)[0]}</span>
                  <span className="mx-1">vs</span>
                  <span>{pred.home_starter_name?.split(" ").slice(-1)[0]}</span>
                </div>
              )}

              {snapshot && (
                <div className="live-snapshot mb-2">
                  <div className="live-snapshot-pills">
                    <span className="live-pill live-pill--accent">{snapshot.inning}</span>
                    <span className="live-pill">{snapshot.outsLabel}</span>
                    <span className="live-pill">{snapshot.baseState}</span>
                  </div>
                  {snapshot.matchup && <div className="live-matchup mt-2">{snapshot.matchup}</div>}
                </div>
              )}

              {innings.length > 0 && (
                <div className="table-responsive mb-2">
                  <Table size="sm" className="game-linescore mb-0">
                    <thead>
                      <tr>
                        <th></th>
                        {innings.map((_, i) => <th key={i}>{i + 1}</th>)}
                        <th>R</th><th>H</th><th>E</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-semibold">
                          {gameFeed?.gameData.teams.away.abbreviation}
                        </td>
                        {innings.map((inn, i) => <td key={i}>{inn.away?.runs ?? "—"}</td>)}
                        <td className="fw-bold">{awayTotals.runs}</td>
                        <td>{awayTotals.hits}</td>
                        <td>{awayTotals.errors}</td>
                      </tr>
                      <tr>
                        <td className="fw-semibold">
                          {gameFeed?.gameData.teams.home.abbreviation}
                        </td>
                        {innings.map((inn, i) => <td key={i}>{inn.home?.runs ?? "—"}</td>)}
                        <td className="fw-bold">{homeTotals.runs}</td>
                        <td>{homeTotals.hits}</td>
                        <td>{homeTotals.errors}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              )}

              <div className="game-status-line">
                {isScheduled && (
                  <span className="game-time">
                    {new Date(game.gameDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {isPreGame && <span className="badge bg-warning text-dark">Pregame</span>}
                {isFinal && <span className="badge bg-secondary">Final</span>}
                {inProgress && gameFeed?.liveData.plays.currentPlay?.about && (
                  <span className="badge bg-success">
                    {gameFeed.liveData.plays.currentPlay.about.halfInning.toUpperCase()}{" "}
                    {gameFeed.liveData.plays.currentPlay.about.inning}
                  </span>
                )}
              </div>

              {pred && (
                <div className="prediction-panel mt-2" onClick={(e) => e.preventDefault()}>
                  <div className="prediction-header d-flex align-items-center justify-content-between mb-1">
                    <span className="prediction-label">
                      Prediction
                      {pred.model_version && <span className="model-version ms-1">v{pred.model_version.replace("v","")}</span>}
                    </span>
                    <div className="d-flex gap-1">
                      {pred.confidence_tier && (
                        <Badge bg={pred.confidence_tier.toUpperCase() === "HIGH" ? "success" : pred.confidence_tier.toUpperCase() === "MEDIUM" ? "warning" : "secondary"} className="confidence-badge">
                          {formatConfidenceTier(pred.confidence_tier)}
                        </Badge>
                      )}
                      <Badge bg={pred.lineup_confirmed ? "success" : "secondary"} className="confidence-badge">
                        {pred.lineup_confirmed ? "Lineups in" : "Probable"}
                      </Badge>
                    </div>
                  </div>
                  {awayProb != null && homeProb != null && (
                    <div className="prob-bar-wrap">
                      <div
                        className={`prob-segment away-prob${pred.predicted_winner === pred.away_team_name ? " predicted-winner" : ""}`}
                        style={{ width: `${awayProb}%` }}
                      >
                        <span className="prob-label">{awayProb}%</span>
                      </div>
                      <div
                        className={`prob-segment home-prob${pred.predicted_winner === pred.home_team_name ? " predicted-winner" : ""}`}
                        style={{ width: `${homeProb}%` }}
                      >
                        <span className="prob-label">{homeProb}%</span>
                      </div>
                    </div>
                  )}
                  <div className="prediction-meta mt-2">
                    <span className="prediction-lean">
                      {pred.predicted_winner?.split(" ").slice(-1)[0] || "Model"} by {edgePoints} pts
                    </span>
                  </div>
                  {signalItems.length > 0 && (
                    <ul className="signal-list mt-2 mb-0">
                      {signalItems.map((s, i) => (
                        <li key={i} className={`signal-item signal-${s.type}`}>{s.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Link>
      </Col>
    );
  };

  const renderSection = (title, entries, sectionClass = "") => {
    if (!entries.length) return null;

    return (
      <section className={`games-section ${sectionClass}`.trim()} aria-label={title}>
        <div className="games-section-header px-3 pt-1">
          <h5 className="games-section-title mb-0">{title}</h5>
        </div>
        <Row className="g-3 px-3 py-3">
          {entries.map((entry) => renderGameCard(entry, entries, sectionClass))}
        </Row>
      </section>
    );
  };

  return (
    <Container fluid className="games-page bg-light" style={{ minHeight: "100vh" }}>
      <div className="px-3 pt-4 pb-2">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
          <h4 className="games-page-title mb-0">Games</h4>
          <div className="date-picker-wrap d-flex align-items-center gap-2">
            <button
              className="date-nav-btn"
              onClick={() => setSelectedDate(d => offsetDate(d, -1))}
              aria-label="Previous day"
            >‹</button>
            <input
              type="date"
              className="date-input"
              value={selectedDate}
              max={offsetDate(todayISO(), 7)}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <button
              className="date-nav-btn"
              onClick={() => setSelectedDate(d => offsetDate(d, 1))}
              aria-label="Next day"
            >›</button>
            {selectedDate !== todayISO() && (
              <button className="date-today-btn" onClick={() => setSelectedDate(todayISO())}>
                Today
              </button>
            )}
          </div>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: "0.82rem" }}>
          {formatDisplayDate(selectedDate)}
        </p>
      </div>
      <div className="games-toolbar px-3 pb-3">
        <div className="status-chip-row" role="group" aria-label="Filter by game status">
          {[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "upcoming", label: "Upcoming" },
            { value: "final", label: "Final" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`status-chip${statusFilter === option.value ? " status-chip--active" : ""}`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="games-toolbar-grid mt-2">
          <Form.Group controlId="games-confidence-filter">
            <Form.Label className="games-toolbar-label">Confidence</Form.Label>
            <Form.Select
              size="sm"
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
            >
              <option value="all">All confidence</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="games-sort-mode">
            <Form.Label className="games-toolbar-label">Sort</Form.Label>
            <Form.Select
              size="sm"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
            >
              <option value="time">Game time</option>
              <option value="edge">Strongest edge</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="games-confirmed-only" className="games-toolbar-toggle">
            <Form.Check
              type="switch"
              label="Confirmed lineups only"
              checked={confirmedOnly}
              onChange={(e) => setConfirmedOnly(e.target.checked)}
            />
          </Form.Group>
        </div>
      </div>
      {games.length === 0 ? (
        <Row className="g-3 px-3 py-3">
          <Col xs={12}>
            <p className="text-muted text-center py-5">No games scheduled for this date.</p>
          </Col>
        </Row>
      ) : filteredEntries.length === 0 ? (
        <Row className="g-3 px-3 py-3">
          <Col xs={12}>
            <p className="text-muted text-center py-5 mb-0">No games match the active filters.</p>
          </Col>
        </Row>
      ) : (
        <>
          {renderSection("Live now", liveGames, "games-section--live")}
          {renderSection("Later today", upcomingGames)}
          {renderSection("Completed", finalGames)}
        </>
      )}
    </Container>
  );
};

export default TodaysGames;

