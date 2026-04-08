import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Table, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import "./styles/TodaysGames.css";

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
  const [games, setGames] = useState([]);
  const [livefeed, setLivefeed] = useState([]);
  const [predictions, setPredictions] = useState({}); // keyed by gamePk

  useEffect(() => {
    const fetchTodaysGames = async () => {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1`
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        if (data.dates && data.dates.length > 0 && data.dates[0].games) {
          setGames(data.dates[0].games);
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error("Failed to fetch today's games:", error);
      }
    };

    fetchTodaysGames();
  }, []);

  // Fetch predictions once games load
  useEffect(() => {
    if (!games.length) return;
    const fetchPredictions = async () => {
      try {
        const data = await apiService.getPredictions();
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
  }, [games]);

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const responses = await Promise.all(
          games.map(async (game) => {
            const gamePk = game.gamePk;
            const response = await fetch(
              `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
            );
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
        );
        setLivefeed(responses);
      } catch (error) {
        console.error("Failed to fetch game details:", error);
      }
    };

    if (games.length) {
      fetchGameDetails();
    }
  }, [games]);

  return (
    <Container fluid className="games-page bg-light" style={{ minHeight: "100vh" }}>
      <div className="px-3 pt-4 pb-2">
        <h4 className="games-page-title mb-0">Today's Games</h4>
        <p className="text-muted mb-0" style={{ fontSize: "0.82rem" }}>
          {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <Row className="g-3 px-3 py-3">
        {games.map((game) => {
          const gameFeed = livefeed.find((feed) => feed.gamePk === game.gamePk);
          const statusCode = game.status.statusCode;
          const isScheduled = statusCode === "S";
          const isFinal = statusCode === "F";
          const isPreGame = statusCode === "P";
          const inProgress = !isScheduled && !isPreGame && !isFinal;

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

          return (
            <Col key={game.gamePk} xs={12} md={6} xl={4}>
              <Link to={`/game/${game.gamePk}`} className="text-decoration-none">
                <Card className="game-card h-100 shadow-sm">
                  <Card.Body className="p-3">
                    {/* Teams row */}
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

                    {/* Probable pitchers (pre-game) */}
                    {(isScheduled || isPreGame) && pred?.away_starter_name && (
                      <div className="game-pitchers text-muted mb-2">
                        <span>{pred.away_starter_name?.split(" ").slice(-1)[0]}</span>
                        <span className="mx-1">vs</span>
                        <span>{pred.home_starter_name?.split(" ").slice(-1)[0]}</span>
                      </div>
                    )}

                    {/* Linescore table (only if game has innings data) */}
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

                    {/* Status line */}
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

                    {/* Prediction panel */}
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
                                {pred.confidence_tier}
                              </Badge>
                            )}
                            {!pred.lineup_confirmed && (
                              <Badge bg="secondary" className="confidence-badge">PROBABLE</Badge>
                            )}
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
                        {generateSignals(pred).length > 0 && (
                          <ul className="signal-list mt-2 mb-0">
                            {generateSignals(pred).map((s, i) => (
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
        })}
      </Row>
    </Container>
  );
};

export default TodaysGames;

