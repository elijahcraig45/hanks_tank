import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import StrikeZone from './LiveGameStrikeZone';
import BoxScore from './BoxScore';
import ScoutingReport from './ScoutingReport';
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

// ── Main page ─────────────────────────────────────────────────────────────────
const GameDetailsPage = () => {
  const { gamePk } = useParams();
  const [gameDetails, setGameDetails]   = useState(null);
  const [selectedAtBat, setSelectedAtBat] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [prediction, setPrediction]     = useState(null);
  const [scoutingReport, setScoutingReport] = useState(null);

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

  // Fetch pre-computed BQ scouting report
  useEffect(() => {
    const fetchScout = async () => {
      try {
        const data = await apiService.getScoutingReportByGame(gamePk);
        if (data?.report) {
          const parsed = typeof data.report === 'string' ? JSON.parse(data.report) : data.report;
          setScoutingReport(parsed);
        }
      } catch { /* scouting report is optional */ }
    };
    fetchScout();
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

      {/* Rich Scouting Report from BQ — always expanded on the game page */}
      {(scoutingReport || prediction) && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="py-2 fw-semibold d-flex align-items-center justify-content-between">
            <span>🗒 Scouting Report</span>
            {prediction?.confidence_tier && (
              <Badge
                bg={prediction.confidence_tier === "HIGH" ? "success" :
                    prediction.confidence_tier === "MEDIUM" ? "warning" : "secondary"}
                style={{ fontSize: "0.68rem" }}
              >
                {prediction.confidence_tier}
              </Badge>
            )}
          </Card.Header>
          <Card.Body className="p-3">
            <ScoutingReport
              report={scoutingReport}
              alwaysExpanded={true}
            />
          </Card.Body>
        </Card>
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