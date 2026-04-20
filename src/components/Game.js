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

const inningFrameLabel = (half, inning) => {
  if (!inning) return "";
  return `${String(half).toLowerCase() === "top" ? "T" : "B"}${inning}`;
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

const formatConfidenceTier = (tier) => {
  if (!tier) return "";
  const normalized = String(tier).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isScoringPlayEvent = (event) => {
  if (!event) return false;
  if (event.about?.isScoringPlay) return true;
  if ((event.result?.rbi ?? 0) > 0) return true;
  return /\bscores?\b/i.test(event.result?.description || "");
};

const buildGameFlow = (linescore) => {
  const innings = linescore?.innings || [];
  if (!innings.length) return null;

  let awayTotal = 0;
  let homeTotal = 0;
  const points = innings.map((inning, index) => {
    awayTotal += inning.away?.runs ?? 0;
    homeTotal += inning.home?.runs ?? 0;
    return {
      inning: index + 1,
      away: awayTotal,
      home: homeTotal,
    };
  });

  return {
    points,
    maxRuns: Math.max(...points.flatMap((point) => [point.away, point.home]), 1),
  };
};

const buildPolyline = (points, maxRuns, key, width, height, padding) => (
  points.map((point, index) => {
    const x = padding + ((width - (padding * 2)) * index) / Math.max(points.length - 1, 1);
    const y = height - padding - ((height - (padding * 2)) * point[key]) / Math.max(maxRuns, 1);
    return `${x},${y}`;
  }).join(" ")
);

const getLeaderKey = (away, home) => {
  if (away === home) return "tied";
  return away > home ? "away" : "home";
};

const playerLastName = (fullName) => fullName?.split(" ").slice(-1)[0] || "";

const scoringTeamForPlay = (event, awayTeam, homeTeam) => (
  event?.about?.halfInning === "top" ? awayTeam : homeTeam
);

const scoringPlaySummary = (event, awayTeam, homeTeam) => {
  if (!event) return null;

  const team = scoringTeamForPlay(event, awayTeam, homeTeam);
  const opponent = team.abbreviation === awayTeam.abbreviation ? homeTeam : awayTeam;
  const inningLabel = `${halfInningLabel(event.about?.halfInning)}${event.about?.inning}`;
  const frameLabel = inningFrameLabel(event.about?.halfInning, event.about?.inning);
  const batter = playerLastName(event.matchup?.batter?.fullName) || team.abbreviation;
  const playTag = resultBadge(event.result?.description).label;
  const rbi = event.result?.rbi ?? 0;
  const teamScore = event.result?.awayScore != null && event.result?.homeScore != null
    ? (team.abbreviation === awayTeam.abbreviation ? event.result.awayScore : event.result.homeScore)
    : null;
  const opponentScore = event.result?.awayScore != null && event.result?.homeScore != null
    ? (team.abbreviation === awayTeam.abbreviation ? event.result.homeScore : event.result.awayScore)
    : null;

  const value = `${frameLabel || inningLabel} ${batter}${playTag && playTag !== "•" ? ` ${playTag}` : ""}`;
  const meta = teamScore != null && opponentScore != null
    ? `${team.abbreviation} ${teamScore}-${opponentScore} ${opponent.abbreviation}`
    : `${team.abbreviation} ${rbi > 1 ? `${rbi} runs` : "on the board"}`;

  return { value, meta };
};

const parseInningsPitchedToOuts = (value) => {
  if (value == null || value === "") return 0;
  const [wholePart, partialPart = "0"] = String(value).split(".");
  return (Number(wholePart) * 3) + Number(partialPart);
};

const outsToInningsString = (outs) => `${Math.floor(outs / 3)}.${outs % 3}`;

const buildLeverageSnapshot = (linescore, status, awayTeam, homeTeam, leaderText, leadChanges) => {
  const isLive = status?.abstractGameState === "Live";
  if (!isLive) {
    return {
      value: leadChanges > 0 ? "Late pressure" : "Final state",
      meta: leadChanges > 0 ? `${leaderText} after ${leadChanges} swing${leadChanges === 1 ? "" : "s"}` : `${leaderText} at the finish`,
    };
  }

  const baseCount = ["first", "second", "third"].filter((base) => linescore?.offense?.[base]).length;
  const outs = linescore?.outs ?? 0;
  const inning = linescore?.currentInning ?? 0;
  const scoreDiff = Math.abs((linescore?.teams?.away?.runs ?? 0) - (linescore?.teams?.home?.runs ?? 0));
  const pressureScore = (inning >= 7 ? 2 : inning >= 5 ? 1 : 0) + (scoreDiff <= 1 ? 2 : scoreDiff <= 3 ? 1 : 0) + baseCount + (outs <= 1 ? 1 : 0);
  const label = pressureScore >= 5 ? "High leverage" : pressureScore >= 3 ? "Medium leverage" : "Low leverage";
  const basesText = baseCount === 0 ? "bases empty" : `${baseCount} on`;
  const offenseTeam = linescore?.offense?.team?.id === awayTeam.id ? awayTeam.abbreviation : homeTeam.abbreviation;

  return {
    value: label,
    meta: `${offenseTeam} batting ${linescore?.inningHalf === "Top" ? "T" : "B"}${inning} • ${outs} out${outs === 1 ? "" : "s"} • ${basesText}`,
  };
};

const buildResponseTracker = (orderedScoringEvents, awayTeam, homeTeam) => {
  if (!orderedScoringEvents.length) {
    return { value: "No answers yet", meta: "Still waiting for the first run" };
  }

  const responsesByTeam = {};
  let totalResponses = 0;
  let lastResponse = null;

  for (let index = 1; index < orderedScoringEvents.length; index += 1) {
    const previousEvent = orderedScoringEvents[index - 1];
    const currentEvent = orderedScoringEvents[index];
    const previousTeam = scoringTeamForPlay(previousEvent, awayTeam, homeTeam);
    const currentTeam = scoringTeamForPlay(currentEvent, awayTeam, homeTeam);
    const quickAnswer = currentTeam.id !== previousTeam.id &&
      currentEvent.about?.inning <= (previousEvent.about?.inning ?? 0) + 1;

    if (!quickAnswer) continue;

    totalResponses += 1;
    responsesByTeam[currentTeam.abbreviation] = (responsesByTeam[currentTeam.abbreviation] || 0) + 1;
    lastResponse = `${currentTeam.abbreviation} answered ${previousTeam.abbreviation}`;
  }

  if (!totalResponses) {
    return { value: "No quick answers", meta: "Each club scored in separate waves" };
  }

  const topResponder = Object.entries(responsesByTeam).sort((a, b) => b[1] - a[1])[0];
  return {
    value: `${topResponder[0]} ${topResponder[1]} answer${topResponder[1] === 1 ? "" : "s"}`,
    meta: `${totalResponses} momentum swing${totalResponses === 1 ? "" : "s"} • ${lastResponse}`,
  };
};

const buildBullpenBurden = (pitcherIds, playersById, team, opponent) => {
  const pitchers = (pitcherIds || [])
    .map((id) => playersById?.[`ID${id}`])
    .filter((player) => player?.stats?.pitching);

  if (!pitchers.length) {
    return { team: team.abbreviation, outs: 0, relievers: 0, pitches: 0, value: "No bullpen load", meta: "Starter handled it" };
  }

  const relievers = pitchers.slice(1);
  const reliefOuts = relievers.reduce((sum, pitcher) => sum + parseInningsPitchedToOuts(pitcher.stats?.pitching?.inningsPitched), 0);
  const reliefPitches = relievers.reduce((sum, pitcher) => sum + (pitcher.stats?.pitching?.numberOfPitches || 0), 0);

  return {
    team: team.abbreviation,
    outs: reliefOuts,
    relievers: relievers.length,
    pitches: reliefPitches,
    value: `${team.abbreviation} pen ${outsToInningsString(reliefOuts)} IP`,
    meta: `${relievers.length} arm${relievers.length === 1 ? "" : "s"} • ${reliefPitches} pitches vs ${opponent.abbreviation}`,
  };
};

const buildClutchPerformers = (batters, awayTeam, homeTeam) => {
  const candidates = batters
    .map((batter) => {
      const score = ((batter.rbi || 0) * 3) + ((batter.h || 0) * 2) + (batter.bb || 0);
      return { ...batter, score };
    })
    .filter((batter) => batter.score > 0)
    .sort((a, b) => b.score - a.score || (b.rbi || 0) - (a.rbi || 0) || (b.h || 0) - (a.h || 0));

  if (!candidates.length) {
    return { value: "No standout bat", meta: "Offense spread thin today" };
  }

  const topTwo = candidates.slice(0, 2);
  return {
    value: topTwo.map((batter) => playerLastName(batter.name)).join(" / "),
    meta: topTwo.map((batter) => `${batter.team} ${(batter.rbi || 0)} RBI, ${(batter.h || 0)} H`).join(" • "),
  };
};

const buildGamePulse = (linescore, scoringEvents, awayTeam, homeTeam) => {
  const flow = buildGameFlow(linescore);
  if (!flow) return null;

  const orderedScoringEvents = [...scoringEvents].reverse();
  let leadChanges = 0;
  let previousNonTiedLeader = null;
  let tiedFrames = 0;

  flow.points.forEach((point) => {
    const leader = getLeaderKey(point.away, point.home);
    if (leader === "tied") {
      tiedFrames += 1;
      return;
    }
  });

  orderedScoringEvents.forEach((event) => {
    const awayScore = event?.result?.awayScore;
    const homeScore = event?.result?.homeScore;
    if (awayScore == null || homeScore == null) return;

    const leader = getLeaderKey(awayScore, homeScore);
    if (leader === "tied") return;

    if (previousNonTiedLeader && previousNonTiedLeader !== leader) {
      leadChanges += 1;
    }
    previousNonTiedLeader = leader;
  });

  const biggestInning = (linescore?.innings || []).reduce((best, inning, index) => {
    const candidates = [
      { side: "away", runs: inning.away?.runs ?? 0, inning: index + 1 },
      { side: "home", runs: inning.home?.runs ?? 0, inning: index + 1 },
    ];
    const strongest = candidates.sort((a, b) => b.runs - a.runs)[0];
    return strongest.runs > (best?.runs ?? 0) ? strongest : best;
  }, null);

  const lastScoringPlay = scoringEvents[0] || null;
  const firstScoringPlay = orderedScoringEvents[0] || null;
  const lastPoint = flow.points[flow.points.length - 1];
  const currentLeader = getLeaderKey(lastPoint.away, lastPoint.home);
  const leaderText =
    currentLeader === "tied"
      ? "Tied game"
      : `${currentLeader === "home" ? homeTeam.abbreviation : awayTeam.abbreviation} +${Math.abs(lastPoint.home - lastPoint.away)}`;

  return {
    flow,
    leadChanges,
    tiedFrames,
    biggestInning,
    lastScoringPlay,
    firstScoringPlay,
    leaderText,
    totalRuns: lastPoint.home + lastPoint.away,
    scoringPlayCount: scoringEvents.length,
    awayScoringInnings: (linescore?.innings || []).filter((inning) => (inning.away?.runs ?? 0) > 0).length,
    homeScoringInnings: (linescore?.innings || []).filter((inning) => (inning.home?.runs ?? 0) > 0).length,
  };
};

function PulseStat({ label, value, meta, accent = "" }) {
  return (
    <div className={`pulse-stat${accent ? ` pulse-stat--${accent}` : ""}`}>
      <div className="pulse-stat-label">{label}</div>
      <div className="pulse-stat-value">{value}</div>
      {meta && <div className="pulse-stat-meta">{meta}</div>}
    </div>
  );
}

function GamePulseSection({ linescore, scoringEvents, awayTeam, homeTeam, status, gameDetails }) {
  const pulse = buildGamePulse(linescore, scoringEvents, awayTeam, homeTeam);
  if (!pulse) return null;

  const width = 220;
  const height = 88;
  const padding = 14;
  const { flow } = pulse;
  const awayPath = buildPolyline(flow.points, flow.maxRuns, "away", width, height, padding);
  const homePath = buildPolyline(flow.points, flow.maxRuns, "home", width, height, padding);
  const biggestInningText = pulse.biggestInning?.runs
    ? `${pulse.biggestInning.side === "home" ? homeTeam.abbreviation : awayTeam.abbreviation} ${pulse.biggestInning.runs} run${pulse.biggestInning.runs === 1 ? "" : "s"}`
    : "No crooked number";
  const biggestInningMeta = pulse.biggestInning?.runs
    ? `Inning ${pulse.biggestInning.inning}`
    : "Pitchers' game";
  const lastScoreSummary = scoringPlaySummary(pulse.lastScoringPlay, awayTeam, homeTeam);
  const firstPunchSummary = scoringPlaySummary(pulse.firstScoringPlay, awayTeam, homeTeam);
  const scoringInningsText = `${awayTeam.abbreviation} ${pulse.awayScoringInnings} • ${homeTeam.abbreviation} ${pulse.homeScoringInnings}`;
  const leverageSnapshot = buildLeverageSnapshot(linescore, status, awayTeam, homeTeam, pulse.leaderText, pulse.leadChanges);
  const responseTracker = buildResponseTracker([...scoringEvents].reverse(), awayTeam, homeTeam);
  const awayBullpen = buildBullpenBurden(
    gameDetails?.liveData?.boxscore?.teams?.away?.pitchers,
    gameDetails?.liveData?.boxscore?.teams?.away?.players,
    awayTeam,
    homeTeam
  );
  const homeBullpen = buildBullpenBurden(
    gameDetails?.liveData?.boxscore?.teams?.home?.pitchers,
    gameDetails?.liveData?.boxscore?.teams?.home?.players,
    homeTeam,
    awayTeam
  );
  const bullpenBurden = [awayBullpen, homeBullpen].sort((a, b) => b.outs - a.outs || b.pitches - a.pitches)[0];
  const clutchPerformers = buildClutchPerformers([
    ...(gameDetails?.liveData?.boxscore?.teams?.away?.batters || []).map((id) => {
      const player = gameDetails?.liveData?.boxscore?.teams?.away?.players?.[`ID${id}`];
      return player?.stats?.batting ? {
        name: player.person.fullName,
        team: awayTeam.abbreviation,
        h: player.stats.batting.hits,
        rbi: player.stats.batting.rbi,
        bb: player.stats.batting.baseOnBalls,
      } : null;
    }).filter(Boolean),
    ...(gameDetails?.liveData?.boxscore?.teams?.home?.batters || []).map((id) => {
      const player = gameDetails?.liveData?.boxscore?.teams?.home?.players?.[`ID${id}`];
      return player?.stats?.batting ? {
        name: player.person.fullName,
        team: homeTeam.abbreviation,
        h: player.stats.batting.hits,
        rbi: player.stats.batting.rbi,
        bb: player.stats.batting.baseOnBalls,
      } : null;
    }).filter(Boolean),
  ]);

  return (
    <Card className="shadow-sm game-pulse-card">
      <Card.Header className="py-2 d-flex justify-content-between align-items-center">
        <span className="fw-semibold">Game Pulse</span>
        <span className="game-flow-summary">{pulse.leaderText}</span>
      </Card.Header>
      <Card.Body className="p-3">
        <div className="game-pulse-layout">
          <div className="game-pulse-chart-wrap">
            <div className="game-flow-topline">
              <span className="game-flow-label">Game Flow</span>
              <span className="game-flow-top-meta">{awayTeam.abbreviation} {flow.points[flow.points.length - 1].away} - {flow.points[flow.points.length - 1].home} {homeTeam.abbreviation}</span>
            </div>
            <div className="game-flow-legend mb-2">
              <span className="game-flow-team"><span className="game-flow-dot game-flow-dot--away" />{awayTeam.abbreviation}</span>
              <span className="game-flow-team"><span className="game-flow-dot game-flow-dot--home" />{homeTeam.abbreviation}</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="game-flow-chart game-flow-chart--compact" role="img" aria-label="Game flow chart">
              {[0, 0.5, 1].map((step) => {
                const y = padding + ((height - (padding * 2)) * step);
                return <line key={step} x1={padding} y1={y} x2={width - padding} y2={y} className="game-flow-grid" />;
              })}
              <polyline points={awayPath} className="game-flow-line game-flow-line--away" />
              <polyline points={homePath} className="game-flow-line game-flow-line--home" />
              {flow.points.map((point, index) => {
                const x = padding + ((width - (padding * 2)) * index) / Math.max(flow.points.length - 1, 1);
                const awayY = height - padding - ((height - (padding * 2)) * point.away) / Math.max(flow.maxRuns, 1);
                const homeY = height - padding - ((height - (padding * 2)) * point.home) / Math.max(flow.maxRuns, 1);
                return (
                  <g key={point.inning}>
                    <circle cx={x} cy={awayY} r="2.75" className="game-flow-point game-flow-point--away" />
                    <circle cx={x} cy={homeY} r="2.75" className="game-flow-point game-flow-point--home" />
                    <text x={x} y={height - 4} textAnchor="middle" className="game-flow-axis-label">
                      {point.inning}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="game-pulse-stats">
            <PulseStat
              label="Scoring plays"
              value={pulse.scoringPlayCount}
              meta={`${pulse.totalRuns} total runs`}
              accent="gold"
            />
            <PulseStat
              label="Lead changes"
              value={pulse.leadChanges}
              meta={`${pulse.tiedFrames} tied frame${pulse.tiedFrames === 1 ? "" : "s"}`}
              accent="blue"
            />
            <PulseStat
              label="Leverage meter"
              value={leverageSnapshot.value}
              meta={leverageSnapshot.meta}
              accent="blue"
            />
            <PulseStat
              label="Response tracker"
              value={responseTracker.value}
              meta={responseTracker.meta}
              accent="purple"
            />
            <PulseStat
              label="Biggest inning"
              value={biggestInningText}
              meta={pulse.biggestInning?.runs ? `${biggestInningMeta} swing` : biggestInningMeta}
              accent="green"
            />
            <PulseStat
              label="Bullpen burden"
              value={bullpenBurden.value}
              meta={bullpenBurden.meta}
              accent="slate"
            />
            <PulseStat
              label="Clutch performers"
              value={clutchPerformers.value}
              meta={clutchPerformers.meta}
              accent="red"
            />
            <PulseStat
              label="Scoring frames"
              value={scoringInningsText}
              meta="Times each side broke through"
              accent="slate"
            />
            <PulseStat
              label="First / last score"
              value={`${firstPunchSummary?.value || "—"} • ${lastScoreSummary?.value || "—"}`}
              meta={`${firstPunchSummary?.meta || "No opening blow"} • ${lastScoreSummary?.meta || "No closing swing"}`}
              accent="gold"
            />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const GameDetailsPage = () => {
  const { gamePk } = useParams();
  const [gameDetails, setGameDetails]   = useState(null);
  const [selectedAtBat, setSelectedAtBat] = useState(null);
  const [playFilter, setPlayFilter] = useState("all");
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

  // Fetch pre-computed BQ scouting report whenever one is available for this game.
  useEffect(() => {
    let isMounted = true;
    setScoutingReport(null);

    const fetchScout = async () => {
      try {
        const data = await apiService.getScoutingReportByGame(gamePk);
        if (!isMounted) return;
        if (data?.report) {
          const parsed = typeof data.report === 'string' ? JSON.parse(data.report) : data.report;
          setScoutingReport(parsed);
          return;
        }
      } catch (error) {
        if (!isMounted) return;
        if (error?.message !== 'Resource not found') {
          console.warn('Failed to fetch scouting report:', error);
        }
      }
      setScoutingReport(null);
    };
    fetchScout();

    return () => {
      isMounted = false;
    };
  }, [gamePk]);

  useEffect(() => {
    if (!gameDetails) return;

    const allEvents = gameDetails.liveData.plays.allPlays.slice().reverse();
    const nextVisibleEvents = playFilter === "scoring"
      ? allEvents.filter(isScoringPlayEvent)
      : allEvents;

    if (!nextVisibleEvents.length) {
      setSelectedAtBat(null);
      return;
    }

    const selectedAtBatIndex = selectedAtBat?.about?.atBatIndex;
    if (
      selectedAtBatIndex != null &&
      nextVisibleEvents.some((event) => event.about?.atBatIndex === selectedAtBatIndex)
    ) {
      return;
    }

    setSelectedAtBat(nextVisibleEvents[0]);
  }, [gameDetails, playFilter, selectedAtBat]);

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
  const scoringEvents   = events.filter(isScoringPlayEvent);
  const visibleEvents   = playFilter === "scoring" ? scoringEvents : events;
  const reportCardData  = scoutingReport || (
    prediction ? {
      prediction,
      away_team_name: awayTeam.name,
      home_team_name: homeTeam.name,
    } : null
  );
  const reportCardTitle = scoutingReport ? "🗒 Scouting Report" : "🔮 Model Outlook";
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
            {count?.balls}-{count?.strikes} {count?.outs} out
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
      {reportCardData && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="py-2 fw-semibold d-flex align-items-center justify-content-between">
            <span>{reportCardTitle}</span>
            {prediction?.confidence_tier && (
              <Badge
                bg={String(prediction.confidence_tier).toUpperCase() === "HIGH" ? "success" :
                    String(prediction.confidence_tier).toUpperCase() === "MEDIUM" ? "warning" : "secondary"}
                style={{ fontSize: "0.68rem" }}
              >
                {formatConfidenceTier(prediction.confidence_tier)}
              </Badge>
            )}
          </Card.Header>
          <Card.Body className="p-3">
            {!scoutingReport && (
              <p className="text-muted small mb-3">
                Full pregame scouting detail is not available for this matchup, but the model prediction is still shown below.
              </p>
            )}
            <ScoutingReport
              report={reportCardData}
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

      {linescore?.innings?.length > 0 && (
        <Row className="mb-4">
          <Col>
            <GamePulseSection
              linescore={linescore}
              scoringEvents={scoringEvents}
              awayTeam={awayTeam}
              homeTeam={homeTeam}
              status={status}
              gameDetails={gameDetails}
            />
          </Col>
        </Row>
      )}

      {/* Play by Play + Strike Zone */}
      <Row className="mb-4 g-3">
        <Col xs={12} md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="fw-semibold">Play by Play</span>
                <div className="pbp-filter-group" role="group" aria-label="Filter play log">
                  <button
                    type="button"
                    className={`pbp-filter-btn${playFilter === "all" ? " pbp-filter-btn--active" : ""}`}
                    onClick={() => setPlayFilter("all")}
                  >
                    All plays
                  </button>
                  <button
                    type="button"
                    className={`pbp-filter-btn${playFilter === "scoring" ? " pbp-filter-btn--active" : ""}`}
                    onClick={() => setPlayFilter("scoring")}
                  >
                    Scoring plays
                  </button>
                </div>
              </div>
              <Button size="sm" variant="outline-secondary" onClick={fetchGameDetails}>↻ Refresh</Button>
            </Card.Header>
            <div className="pbp-scroll">
              {visibleEvents.length > 0 ? (
                visibleEvents.map((event) => renderPlayByPlayItem(event))
              ) : playFilter === "scoring" ? (
                <p className="text-muted p-3 mb-0">No scoring plays yet.</p>
              ) : (
                <p className="text-muted p-3 mb-0">No plays yet.</p>
              )
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
