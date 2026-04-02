import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Table, Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import "./styles/TodaysGames.css";

// -----------------------------------------------------------------------
// Signal generation — readable insights from raw matchup feature values
// -----------------------------------------------------------------------
const NEUTRAL_WOBA = 0.320;
const NEUTRAL_K = 0.220;

function fmt(val, decimals = 3) {
  return val != null ? val.toFixed(decimals) : null;
}

function wobaDelta(val) {
  if (val == null) return null;
  const d = val - NEUTRAL_WOBA;
  return d > 0 ? `+${(d * 1000).toFixed(0)}pts above avg` : `${(d * 1000).toFixed(0)}pts below avg`;
}

function generateSignals(pred) {
  if (!pred) return [];
  const signals = [];

  const homeTeam = pred.home_team_name?.split(" ").slice(-1)[0] || "Home";
  const awayTeam = pred.away_team_name?.split(" ").slice(-1)[0] || "Away";
  const homeHand = pred.away_starter_hand; // home BATTERS face the away starter
  const awayHand = pred.home_starter_hand;

  // --- Lineup platoon wOBA vs starter hand ---
  if (pred.home_lineup_woba_vs_hand != null) {
    const d = pred.home_lineup_woba_vs_hand - NEUTRAL_WOBA;
    const dir = d >= 0.010 ? "strong" : d <= -0.010 ? "weak" : "average";
    signals.push({
      type: d >= 0.010 ? "positive" : d <= -0.010 ? "negative" : "neutral",
      team: "home",
      text: `${homeTeam} lineup .${Math.round(pred.home_lineup_woba_vs_hand * 1000)} wOBA vs ${homeHand}HP — ${dir} platoon matchup`,
    });
  }
  if (pred.away_lineup_woba_vs_hand != null) {
    const d = pred.away_lineup_woba_vs_hand - NEUTRAL_WOBA;
    const dir = d >= 0.010 ? "strong" : d <= -0.010 ? "weak" : "average";
    signals.push({
      type: d >= 0.010 ? "positive" : d <= -0.010 ? "negative" : "neutral",
      team: "away",
      text: `${awayTeam} lineup .${Math.round(pred.away_lineup_woba_vs_hand * 1000)} wOBA vs ${awayHand}HP — ${dir} platoon matchup`,
    });
  }

  // --- H2H history ---
  if (pred.home_h2h_woba != null && pred.home_h2h_pa_total >= 10) {
    const d = pred.home_h2h_woba - NEUTRAL_WOBA;
    const adj = pred.home_h2h_pa_total < 60 ? " (small sample, shrunk)" : "";
    signals.push({
      type: d >= 0.015 ? "positive" : d <= -0.015 ? "negative" : "neutral",
      team: "home",
      text: `${homeTeam} vs ${pred.away_starter_name?.split(" ").slice(-1)[0]}: .${Math.round(pred.home_h2h_woba * 1000)} wOBA historically (${pred.home_h2h_pa_total} PA${adj})`,
    });
  }
  if (pred.away_h2h_woba != null && pred.away_h2h_pa_total >= 10) {
    const d = pred.away_h2h_woba - NEUTRAL_WOBA;
    const adj = pred.away_h2h_pa_total < 60 ? " (small sample, shrunk)" : "";
    signals.push({
      type: d >= 0.015 ? "positive" : d <= -0.015 ? "negative" : "neutral",
      team: "away",
      text: `${awayTeam} vs ${pred.home_starter_name?.split(" ").slice(-1)[0]}: .${Math.round(pred.away_h2h_woba * 1000)} wOBA historically (${pred.away_h2h_pa_total} PA${adj})`,
    });
  }

  // --- Starter quality ---
  if (pred.away_starter_woba_allowed != null) {
    const d = pred.away_starter_woba_allowed - NEUTRAL_WOBA;
    if (Math.abs(d) >= 0.015) {
      signals.push({
        type: d <= -0.015 ? "negative" : "positive", // good away pitcher = bad for home
        team: "away",
        text: `${pred.away_starter_name?.split(" ").slice(-1)[0]} (${awayTeam}) allows .${Math.round(pred.away_starter_woba_allowed * 1000)} wOBA — ${d < 0 ? "elite" : "hittable"} arm`,
      });
    }
  }
  if (pred.home_starter_woba_allowed != null) {
    const d = pred.home_starter_woba_allowed - NEUTRAL_WOBA;
    if (Math.abs(d) >= 0.015) {
      signals.push({
        type: d <= -0.015 ? "positive" : "negative", // good home pitcher = good for home
        team: "home",
        text: `${pred.home_starter_name?.split(" ").slice(-1)[0]} (${homeTeam}) allows .${Math.round(pred.home_starter_woba_allowed * 1000)} wOBA — ${d < 0 ? "elite" : "hittable"} arm`,
      });
    }
  }

  // Cap at 4 signals — most impactful first (sort by absolute deviation)
  return signals.slice(0, 4);
}

function confidenceColor(tier) {
  if (!tier) return "secondary";
  const t = tier.toUpperCase();
  if (t === "HIGH") return "success";
  if (t === "MEDIUM") return "warning";
  return "secondary";
}

// -----------------------------------------------------------------------
// Prediction panel component
// -----------------------------------------------------------------------
function PredictionPanel({ pred }) {
  if (!pred) return null;

  const homeProb = pred.home_win_probability != null ? Math.round(pred.home_win_probability * 100) : null;
  const awayProb = pred.away_win_probability != null ? Math.round(pred.away_win_probability * 100) : null;
  const signals = generateSignals(pred);
  const isConfirmed = pred.lineup_confirmed;

  return (
    <div className="prediction-panel mt-3" onClick={(e) => e.preventDefault()}>
      {/* Header row */}
      <div className="prediction-header d-flex align-items-center justify-content-between mb-1">
        <span className="prediction-label">
          Model Prediction
          {pred.model_version && (
            <span className="model-version ms-1">v{pred.model_version.replace("v", "")}</span>
          )}
        </span>
        <div className="d-flex gap-1 align-items-center">
          {pred.confidence_tier && (
            <Badge bg={confidenceColor(pred.confidence_tier)} className="confidence-badge">
              {pred.confidence_tier}
            </Badge>
          )}
          {!isConfirmed && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Based on probable pitchers — lineups not yet confirmed</Tooltip>}
            >
              <Badge bg="secondary" className="confidence-badge">PROBABLE</Badge>
            </OverlayTrigger>
          )}
        </div>
      </div>

      {/* Probability bar */}
      {homeProb != null && awayProb != null && (
        <div className="prob-bar-wrap">
          <div
            className={`prob-segment away-prob ${pred.predicted_winner === pred.away_team_name ? "predicted-winner" : ""}`}
            style={{ width: `${awayProb}%` }}
          >
            <span className="prob-label">{awayProb}%</span>
          </div>
          <div
            className={`prob-segment home-prob ${pred.predicted_winner === pred.home_team_name ? "predicted-winner" : ""}`}
            style={{ width: `${homeProb}%` }}
          >
            <span className="prob-label">{homeProb}%</span>
          </div>
        </div>
      )}

      {/* Key signals */}
      {signals.length > 0 && (
        <ul className="signal-list mt-2 mb-0">
          {signals.map((s, i) => (
            <li key={i} className={`signal-item signal-${s.type}`}>
              {s.text}
            </li>
          ))}
        </ul>
      )}

      {signals.length === 0 && (
        <p className="signal-empty mb-0">Matchup data loading…</p>
      )}
    </div>
  );
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
    <Container fluid className="bg-light" style={{ minHeight: "100vh" }}>
      <h1 className="my-4">Today's Games</h1>
      <Row>
        {games.map((game) => {
          const gameFeed = livefeed.find((feed) => feed.gamePk === game.gamePk);
          const inProgress =
            game.status.statusCode !== "S" &&
            game.status.statusCode !== "P" &&
            game.status.statusCode !== "F";

          const innings = gameFeed
            ? gameFeed.liveData.linescore.innings
            : [];
          const awayTotals = gameFeed
            ? gameFeed.liveData.linescore.teams.away
            : { runs: "0", hits: "0", errors: "0" };
          const homeTotals = gameFeed
            ? gameFeed.liveData.linescore.teams.home
            : { runs: "0", hits: "0", errors: "0" };

          return (
            <Col key={game.gamePk} xs={12} md={6} lg={4} className="mb-3">
              <Link to={`/game/${game.gamePk}`} className="text-decoration-none">
                <Card className="game-card h-100 bg-white border-light shadow-sm">
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col>
                        <h5 className="team-name">
                          {game.teams.away.team.name}
                        </h5>
                        <p className="team-record text-muted">
                          ({game.teams.away.leagueRecord.wins}-
                          {game.teams.away.leagueRecord.losses})
                        </p>
                      </Col>
                      <Col>
                        <h5 className="team-name">
                          {game.teams.home.team.name}
                        </h5>
                        <p className="team-record text-muted">
                          ({game.teams.home.leagueRecord.wins}-
                          {game.teams.home.leagueRecord.losses})
                        </p>
                      </Col>
                    </Row>
                    <Table striped bordered hover size="sm" className="mt-3">
                      <thead>
                        <tr>
                          <th></th>
                          {innings.map((inning, index) => (
                            <th key={index}>{index + 1}</th>
                          ))}
                          <th>R</th>
                          <th>H</th>
                          <th>E</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                          {gameFeed && (
                          <>
                            {gameFeed.gameData.teams.away.abbreviation}{" "}
                          </>)}
                            </td>
                          {innings.map((inning, index) => (
                            <td key={index}>{inning.away?.runs || "0"}</td>
                          ))}
                          <td>{awayTotals.runs}</td>
                          <td>{awayTotals.hits}</td>
                          <td>{awayTotals.errors}</td>
                        </tr>
                        <tr>
                          <td>
                            {gameFeed && (
                          <>
                            {gameFeed.gameData.teams.home.abbreviation}{" "}
                          </>)}
                          </td>
                          {innings.map((inning, index) => (
                            <td key={index}>{inning.home?.runs || "0"}</td>
                          ))}
                          <td>{homeTotals.runs}</td>
                          <td>{homeTotals.hits}</td>
                          <td>{homeTotals.errors}</td>
                        </tr>
                      </tbody>
                    </Table>
                    <Row className="game-status mt-3">
                      <Col className="text-center">
                        {game.status.statusCode === "S" &&
                          new Date(game.gameDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        {game.status.statusCode === "P" && "Pregame"}
                        {game.status.statusCode === "F" && "Final"}
                        {inProgress && gameFeed && (
                          <>
                            {gameFeed.liveData.plays.currentPlay.about.halfInning.toUpperCase()}{" "}
                            {gameFeed.liveData.plays.currentPlay.about.inning}
                          </>
                        )}
                      </Col>
                    </Row>
                    {predictions[game.gamePk] && (
                      <PredictionPanel pred={predictions[game.gamePk]} />
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
