import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import StrikeZone from './LiveGameStrikeZone';
import BoxScore from './BoxScore';
import apiService from '../services/api';
import "./styles/Game.css";

// Map half-inning names to short labels
const halfInningLabel = (half) => {
  if (!half) return "";
  return half.toLowerCase() === "top" ? "▲" : "▼";
};

// Differentiated result badge — GO/FO/LD/PO instead of generic OUT
const resultBadge = (description = "") => {
  const d = description.toLowerCase();
  if (d.includes("home run"))                                return { label: "HR",  bg: "danger" };
  if (d.includes("triple"))                                  return { label: "3B",  bg: "warning" };
  if (d.includes("double play") || d.includes("double"))    return { label: "2B",  bg: "warning" };
  if (d.includes("single"))                                  return { label: "1B",  bg: "success" };
  if (d.includes("strikeout") || d.includes("struck out"))  return { label: "K",   bg: "secondary" };
  if (d.includes("walk") || d.includes("intentional"))      return { label: "BB",  bg: "info" };
  if (d.includes("hit by pitch"))                           return { label: "HBP", bg: "info" };
  if (d.includes("sac fly"))                                return { label: "SF",  bg: "primary" };
  if (d.includes("sac bunt") || d.includes("sacrifice bunt")) return { label: "SH", bg: "primary" };
  if (d.includes("fielder") && d.includes("choice"))        return { label: "FC",  bg: "warning" };
  if (d.includes("grounded out") || d.includes("ground"))   return { label: "GO",  bg: "secondary" };
  if (d.includes("lined out") || d.includes("line"))        return { label: "LD",  bg: "secondary" };
  if (d.includes("popped out") || d.includes("pop out"))    return { label: "PO",  bg: "secondary" };
  if (d.includes("flied out") || d.includes("fly"))         return { label: "FO",  bg: "secondary" };
  if (d.includes("field"))                                   return { label: "FO",  bg: "secondary" };
  return { label: "•", bg: "light" };
};

// ── Scouting report card from prediction data ─────────────────────────────────
const ScoutingReport = ({ pred, awayAbbr, homeAbbr }) => {
  if (!pred) return null;

  const isV8 = pred.elo_differential != null || (pred.model_version || "").includes("8");

  const statRow = (label, val, extra) => val != null ? (
    <div className="scout-row" key={label}>
      <span className="scout-label">{label}</span>
      <span className="scout-val">{val}{extra}</span>
    </div>
  ) : null;

  const fmt = (n, decimals = 0) => n != null ? Number(n).toFixed(decimals) : null;
  const pct  = (n) => n != null ? `${Math.round(n * 100)}%` : null;
  const sign  = (n) => n != null ? (n > 0 ? `+${Math.round(n)}` : String(Math.round(n))) : null;

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="py-2 d-flex align-items-center justify-content-between">
        <span className="fw-semibold">Pre-Game Scouting Report</span>
        <div className="d-flex gap-1 align-items-center">
          {pred.model_version && (
            <Badge bg="light" text="dark" style={{ fontSize: "0.68rem", border: "1px solid #dee2e6" }}>
              {pred.model_version}
            </Badge>
          )}
          {pred.confidence_tier && (
            <Badge
              bg={pred.confidence_tier.toUpperCase() === "HIGH" ? "success" :
                  pred.confidence_tier.toUpperCase() === "MEDIUM" ? "warning" : "secondary"}
              style={{ fontSize: "0.68rem" }}
            >
              {pred.confidence_tier}
            </Badge>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-3">

        {/* Win probability bar */}
        {pred.home_win_probability != null && pred.away_win_probability != null && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.77rem", fontWeight: 600 }}>
              <span>{awayAbbr} {Math.round(pred.away_win_probability * 100)}%</span>
              <span className="text-muted" style={{ fontWeight: 400 }}>win probability</span>
              <span>{homeAbbr} {Math.round(pred.home_win_probability * 100)}%</span>
            </div>
            <div className="scout-prob-bar">
              <div
                className={`scout-prob-away${pred.predicted_winner === pred.away_team_name ? " scout-prob-winner" : ""}`}
                style={{ width: `${Math.round(pred.away_win_probability * 100)}%` }}
              />
              <div
                className={`scout-prob-home${pred.predicted_winner === pred.home_team_name ? " scout-prob-winner" : ""}`}
                style={{ width: `${Math.round(pred.home_win_probability * 100)}%` }}
              />
            </div>
            {pred.predicted_winner && (
              <div className="mt-1 text-center" style={{ fontSize: "0.73rem", color: "#6c757d" }}>
                Predicted winner: <strong style={{ color: "#198754" }}>{pred.predicted_winner}</strong>
              </div>
            )}
          </div>
        )}

        <Row className="g-3">
          {isV8 && (
            <>
              {/* Elo & Pythagorean */}
              <Col xs={6} sm={4}>
                <div className="scout-section">
                  <div className="scout-section-title">Elo Ratings</div>
                  {statRow(`${awayAbbr} Elo`, fmt(pred.elo_away))}
                  {statRow(`${homeAbbr} Elo`, fmt(pred.elo_home))}
                  {statRow("Differential", sign(pred.elo_differential))}
                  {pred.elo_home_win_prob != null && statRow("Model win%", pct(pred.elo_home_win_prob), ` (${homeAbbr})`)}
                </div>
              </Col>

              <Col xs={6} sm={4}>
                <div className="scout-section">
                  <div className="scout-section-title">Pythagorean</div>
                  {statRow(`${awayAbbr} W%`, pct(pred.away_pythag_season))}
                  {statRow(`${homeAbbr} W%`, pct(pred.home_pythag_season))}
                  {statRow("Diff", sign(pred.pythag_differential != null ? pred.pythag_differential * 100 : null), pred.pythag_differential != null ? "%" : "")}
                </div>
              </Col>

              <Col xs={6} sm={4}>
                <div className="scout-section">
                  <div className="scout-section-title">Recent Form</div>
                  {statRow(`${awayAbbr} L10 RD`, sign(pred.away_run_diff_10g))}
                  {statRow(`${homeAbbr} L10 RD`, sign(pred.home_run_diff_10g))}
                  {pred.away_current_streak != null && statRow(`${awayAbbr} streak`, pred.away_current_streak > 0 ? `W${pred.away_current_streak}` : `L${Math.abs(pred.away_current_streak)}`)}
                  {pred.home_current_streak != null && statRow(`${homeAbbr} streak`, pred.home_current_streak > 0 ? `W${pred.home_current_streak}` : `L${Math.abs(pred.home_current_streak)}`)}
                </div>
              </Col>
            </>
          )}

          {/* Starting pitchers */}
          {(pred.away_starter_name || pred.home_starter_name) && (
            <Col xs={12} sm={6}>
              <div className="scout-section">
                <div className="scout-section-title">Starting Pitchers</div>
                {pred.away_starter_name && (
                  <div className="scout-pitcher-row">
                    <span className="scout-pitcher-abbr">{awayAbbr}</span>
                    <span className="scout-pitcher-name">{pred.away_starter_name}</span>
                    {pred.away_starter_hand && (
                      <span className="scout-hand-badge">{pred.away_starter_hand}HP</span>
                    )}
                  </div>
                )}
                {pred.home_starter_name && (
                  <div className="scout-pitcher-row">
                    <span className="scout-pitcher-abbr">{homeAbbr}</span>
                    <span className="scout-pitcher-name">{pred.home_starter_name}</span>
                    {pred.home_starter_hand && (
                      <span className="scout-hand-badge">{pred.home_starter_hand}HP</span>
                    )}
                  </div>
                )}
                {pred.away_starter_era != null && statRow(`${pred.away_starter_name?.split(" ").slice(-1)[0]} ERA`, fmt(pred.away_starter_era, 2))}
                {pred.home_starter_era != null && statRow(`${pred.home_starter_name?.split(" ").slice(-1)[0]} ERA`, fmt(pred.home_starter_era, 2))}
                {pred.away_starter_woba_allowed != null && statRow(`${pred.away_starter_name?.split(" ").slice(-1)[0]} wOBA`, fmt(pred.away_starter_woba_allowed, 3))}
                {pred.home_starter_woba_allowed != null && statRow(`${pred.home_starter_name?.split(" ").slice(-1)[0]} wOBA`, fmt(pred.home_starter_woba_allowed, 3))}
              </div>
            </Col>
          )}

          {/* H2H & Context */}
          <Col xs={12} sm={6}>
            <div className="scout-section">
              <div className="scout-section-title">Context</div>
              {pred.h2h_win_pct_3yr != null && statRow("H2H win% (3yr)", pct(pred.h2h_win_pct_3yr), ` (${homeAbbr})`)}
              {pred.h2h_game_count_3yr != null && statRow("H2H games", pred.h2h_game_count_3yr)}
              {pred.is_divisional != null && statRow("Divisional", pred.is_divisional ? "Yes" : "No")}
              {pred.home_bullpen_era != null && statRow(`${homeAbbr} bullpen ERA`, fmt(pred.home_bullpen_era, 2))}
              {pred.away_bullpen_era != null && statRow(`${awayAbbr} bullpen ERA`, fmt(pred.away_bullpen_era, 2))}
              {pred.temperature != null && statRow("Temp", `${pred.temperature}°F`)}
              {pred.wind_speed != null && statRow("Wind", `${pred.wind_speed} mph`)}
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const GameDetailsPage = () => {
  const { gamePk } = useParams();
  const [gameDetails, setGameDetails]   = useState(null);
  const [selectedAtBat, setSelectedAtBat] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [prediction, setPrediction]     = useState(null);

  const fetchGameDetails = async () => {
    try {
      const response = await fetch(
        `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setGameDetails(data);
      if (data?.liveData?.plays?.currentPlay) {
        setSelectedAtBat(data.liveData.plays.currentPlay);
      }
    } catch (error) {
      console.error("Failed to fetch game details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGameDetails(); }, [gamePk]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch today's predictions and find matching game
  useEffect(() => {
    const fetchPred = async () => {
      try {
        const data = await apiService.getPredictions();
        if (data?.predictions) {
          const match = data.predictions.find(p => String(p.game_pk) === String(gamePk));
          if (match) setPrediction(match);
        }
      } catch { /* predictions are optional */ }
    };
    fetchPred();
  }, [gamePk]);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loading game data…</p>
      </Container>
    );
  }
  if (!gameDetails) {
    return <Container className="py-5"><p className="text-muted">Game data unavailable.</p></Container>;
  }

  const awayTeam        = gameDetails.gameData.teams.away;
  const homeTeam        = gameDetails.gameData.teams.home;
  const linescore       = gameDetails.liveData.linescore;
  const weather         = gameDetails.gameData.weather;
  const probablePitchers = gameDetails.gameData.probablePitchers || {};
  const status          = gameDetails.gameData.status;
  const venue           = gameDetails.gameData.venue;
  const events          = gameDetails.liveData.plays.allPlays.slice().reverse();
  const isPreGame       = status.abstractGameState === "Preview";

  const getPlayerDetails = (playerId, team) =>
    gameDetails.liveData.boxscore.teams[team].players[`ID${playerId}`];

  const renderPlayerRow = (playerId, team) => {
    const player = getPlayerDetails(playerId, team);
    if (!player?.person || !player.stats?.batting || player.position?.type === "Pitcher") return null;
    const stats  = player.stats.batting;
    const season = player.seasonStats.batting;
    return (
      <tr key={player.person.id}>
        <td className="fw-semibold">{player.person.fullName}</td>
        <td className="text-muted">{player.position?.abbreviation || "—"}</td>
        <td>{stats.atBats}</td>
        <td>{stats.hits}</td>
        <td>{stats.strikeOuts}</td>
        <td>{stats.baseOnBalls}</td>
        <td>{stats.rbi}</td>
        <td>{season.avg}</td>
        <td>{season.obp}</td>
        <td>{season.slg}</td>
      </tr>
    );
  };

  const renderPitcherRow = (playerId, team) => {
    const player = getPlayerDetails(playerId, team);
    if (!player?.person || !player.stats?.pitching) return null;
    const stats  = player.stats.pitching;
    const season = player.seasonStats.pitching;
    return (
      <tr key={player.person.id}>
        <td className="fw-semibold">{player.person.fullName}</td>
        <td>{season.wins}–{season.losses}</td>
        <td>{season.era}</td>
        <td>{stats.inningsPitched}</td>
        <td>{stats.strikeOuts}</td>
        <td>{stats.baseOnBalls}</td>
        <td>{stats.hits}</td>
        <td>{stats.runs}</td>
        <td>{season.whip}</td>
        <td>{season.strikeoutsPer9Inn}</td>
      </tr>
    );
  };

  const renderPlayByPlayItem = (event) => {
    const { result, about, count, matchup } = event;
    const badge      = resultBadge(result?.description);
    const isSelected = selectedAtBat?.about?.atBatIndex === about?.atBatIndex;
    return (
      <button
        key={about.atBatIndex}
        className={`pbp-item w-100 text-start border-0 bg-transparent px-3 py-2${isSelected ? " pbp-item--selected" : ""}`}
        onClick={() => setSelectedAtBat(event)}
      >
        <div className="d-flex align-items-start gap-2">
          <span className="pbp-inning text-muted flex-shrink-0">
            {halfInningLabel(about.halfInning)}{about.inning}
          </span>
          <Badge bg={badge.bg} className="pbp-badge flex-shrink-0">{badge.label}</Badge>
          <div className="pbp-text flex-grow-1">
            <span className="pbp-batter">{matchup?.batter?.fullName}</span>
            <span className="pbp-desc text-muted d-block">{result?.description}</span>
          </div>
          <span className="pbp-count text-muted flex-shrink-0">
            {count?.balls}-{count?.strikes} {count?.outs}out
          </span>
        </div>
      </button>
    );
  };

  // batSide for strike zone — from current at-bat or selected at-bat
  const batSide = selectedAtBat?.matchup?.batSide?.code || "R";

  return (
    <Container fluid className="game-page py-3 px-3 px-md-4">
      {/* Header */}
      <div className="game-header mb-4">
        <h2 className="game-title mb-1">
          <span className="text-muted">{awayTeam.abbreviation}</span>
          {" "}
          <span className="text-muted fw-light">@</span>
          {" "}
          <span>{homeTeam.abbreviation}</span>
          <Badge
            bg={status.abstractGameState === "Live" ? "success" : "secondary"}
            className="ms-2 game-status-badge"
          >
            {status.detailedState}
          </Badge>
        </h2>
        <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
          {new Date(gameDetails.gameData.datetime.dateTime).toLocaleString([], {
            weekday: "short", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
          })}
          {" · "}{venue.name}
          {weather?.condition && ` · ${weather.condition} ${weather.temp}°F · ${weather.wind}`}
        </p>
      </div>

      {/* Scouting Report (pre-game or always if prediction available) */}
      {prediction && (isPreGame || true) && (
        <ScoutingReport
          pred={prediction}
          awayAbbr={awayTeam.abbreviation}
          homeAbbr={homeTeam.abbreviation}
        />
      )}

      {/* Linescore */}
      <Row className="mb-4">
        <Col>
          <BoxScore linescore={linescore} awayTeam={awayTeam} homeTeam={homeTeam} />
        </Col>
      </Row>

      {/* Play by Play + Strike Zone */}
      <Row className="mb-4 g-3">
        <Col xs={12} md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <span className="fw-semibold">Play by Play</span>
              <Button size="sm" variant="outline-secondary" onClick={fetchGameDetails}>↻ Refresh</Button>
            </Card.Header>
            <div className="pbp-scroll">
              {events.length > 0
                ? events.map((event) => renderPlayByPlayItem(event))
                : <p className="text-muted p-3 mb-0">No plays yet.</p>
              }
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="py-2">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Strike Zone</span>
                {selectedAtBat?.matchup && (
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                    {selectedAtBat.matchup.batter?.fullName} vs {selectedAtBat.matchup.pitcher?.fullName}
                  </span>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-2">
              <StrikeZone
                pitches={selectedAtBat ? selectedAtBat.playEvents.filter(e => e.isPitch) : []}
                batSide={batSide}
                matchup={selectedAtBat?.matchup}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Lineups */}
      <Row className="mb-4 g-3">
        {["away", "home"].map((side) => {
          const team    = side === "away" ? awayTeam : homeTeam;
          const batters = gameDetails.liveData.boxscore.teams[side].batters;
          return (
            <Col xs={12} lg={6} key={side}>
              <Card className="shadow-sm">
                <Card.Header className="py-2 fw-semibold">{team.teamName} Batting</Card.Header>
                <div className="table-responsive">
                  <Table size="sm" className="game-table mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Player</th><th>Pos</th><th>AB</th><th>H</th>
                        <th>K</th><th>BB</th><th>RBI</th>
                        <th>AVG</th><th>OBP</th><th>SLG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batters.map(id => renderPlayerRow(id, side))}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Pitchers */}
      <Row className="mb-4 g-3">
        {["away", "home"].map((side) => {
          const team     = side === "away" ? awayTeam : homeTeam;
          const pitchers = gameDetails.liveData.boxscore.teams[side].pitchers;
          return (
            <Col xs={12} lg={6} key={side}>
              <Card className="shadow-sm">
                <Card.Header className="py-2 fw-semibold">{team.teamName} Pitching</Card.Header>
                <div className="table-responsive">
                  <Table size="sm" className="game-table mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Pitcher</th><th>W-L</th><th>ERA</th><th>IP</th>
                        <th>K</th><th>BB</th><th>H</th><th>R</th>
                        <th>WHIP</th><th>K/9</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pitchers.map(id => renderPitcherRow(id, side))}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Game info footer */}
      <Row className="mb-4 g-3">
        {probablePitchers.away && (
          <Col xs={12} sm={6} md={4}>
            <Card className="shadow-sm h-100">
              <Card.Header className="py-2 fw-semibold">Starting Pitchers</Card.Header>
              <Card.Body className="py-2">
                <p className="mb-1">
                  <span className="text-muted">{awayTeam.abbreviation}:</span>{" "}
                  {probablePitchers.away?.fullName || "TBD"}
                </p>
                <p className="mb-0">
                  <span className="text-muted">{homeTeam.abbreviation}:</span>{" "}
                  {probablePitchers.home?.fullName || "TBD"}
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}
        {weather?.condition && (
          <Col xs={12} sm={6} md={4}>
            <Card className="shadow-sm h-100">
              <Card.Header className="py-2 fw-semibold">Weather</Card.Header>
              <Card.Body className="py-2">
                <p className="mb-1">{weather.condition} · {weather.temp}°F</p>
                <p className="mb-0 text-muted">{weather.wind}</p>
              </Card.Body>
            </Card>
          </Col>
        )}
        <Col xs={12} sm={6} md={4}>
          <Card className="shadow-sm h-100">
            <Card.Header className="py-2 fw-semibold">Venue</Card.Header>
            <Card.Body className="py-2">
              <p className="mb-0">{venue.name}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default GameDetailsPage;