import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Badge, Spinner, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import "./styles/PredictionsPage.css";

const TEAM_COLORS = {
  "Arizona Diamondbacks": "#A71930", "Atlanta Braves": "#CE1141",
  "Baltimore Orioles": "#DF4601", "Boston Red Sox": "#BD3039",
  "Chicago Cubs": "#0E3386", "Chicago White Sox": "#27251F",
  "Cincinnati Reds": "#C6011F", "Cleveland Guardians": "#E31937",
  "Colorado Rockies": "#33006F", "Detroit Tigers": "#FA4616",
  "Houston Astros": "#002D62", "Kansas City Royals": "#004687",
  "Los Angeles Angels": "#BA0021", "Los Angeles Dodgers": "#005A9C",
  "Miami Marlins": "#00A3E0", "Milwaukee Brewers": "#FFC52F",
  "Minnesota Twins": "#002B5C", "New York Mets": "#002D72",
  "New York Yankees": "#0C2340", "Oakland Athletics": "#003831",
  "Philadelphia Phillies": "#E81828", "Pittsburgh Pirates": "#27251F",
  "San Diego Padres": "#2F241D", "San Francisco Giants": "#FD5A1E",
  "Seattle Mariners": "#0C2C56", "St. Louis Cardinals": "#C41E3A",
  "Tampa Bay Rays": "#092C5C", "Texas Rangers": "#003278",
  "Toronto Blue Jays": "#134A8E", "Washington Nationals": "#AB0003",
};
const teamColor = (name) => TEAM_COLORS[name] || "#6c757d";
const teamLogoUrl = (teamId) =>
  `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

// ─── Helpers ────────────────────────────────────────────────────────────────

const NEUTRAL_WOBA = 0.320;
const NEUTRAL_VELO = 93.0;
const NEUTRAL_VELO_NORM = 0.0;

const fmt = (v, digits = 3) =>
  v != null ? `.${String(Math.round(v * 1000)).padStart(3, "0")}` : "—";

const confidenceColor = (tier) => {
  if (!tier) return "secondary";
  const t = tier.toUpperCase();
  if (t === "HIGH") return "success";
  if (t === "MEDIUM") return "warning";
  return "secondary";
};

function generateWhyText(pred) {
  if (!pred) return [];
  const isV8 = pred.model_version?.toLowerCase().includes("v8");
  return isV8 ? generateWhyV8(pred) : generateWhyV7(pred);
}

function generateWhyV8(pred) {
  const reasons = [];
  const homeTeam = pred.home_team_name?.split(" ").slice(-1)[0] || "Home";
  const awayTeam = pred.away_team_name?.split(" ").slice(-1)[0] || "Away";
  const isHomeWinner = pred.predicted_winner === pred.home_team_name;

  // --- Elo ratings ---
  if (pred.elo_differential != null) {
    const eloDiff = pred.elo_differential;
    const eloFavored = eloDiff > 0 ? homeTeam : awayTeam;
    const eloEdge = Math.abs(eloDiff);
    const eloHomePct = pred.elo_home_win_prob != null
      ? `${Math.round(pred.elo_home_win_prob * 100)}%`
      : null;
    reasons.push({
      icon: "📈",
      type: (eloDiff > 15) === isHomeWinner || (eloDiff < -15) === !isHomeWinner ? "positive" : "neutral",
      title: eloEdge < 15
        ? "Teams evenly rated (Elo)"
        : `${eloFavored} has the Elo edge (+${Math.round(eloEdge)} pts)`,
      detail: `Elo differential: ${eloDiff > 0 ? "+" : ""}${Math.round(eloDiff)} pts${eloHomePct ? ` · Elo-implied home win probability: ${eloHomePct}` : ""}.`,
    });
  }

  // --- Pythagorean win% ---
  if (pred.home_pythag_season != null && pred.away_pythag_season != null) {
    const homePct = Math.round(pred.home_pythag_season * 1000) / 10;
    const awayPct = Math.round(pred.away_pythag_season * 1000) / 10;
    const diff = pred.pythag_differential;
    const pythagFavored = diff > 0 ? homeTeam : awayTeam;
    reasons.push({
      icon: "📐",
      type: Math.abs(diff) < 0.02 ? "neutral" : (diff > 0) === isHomeWinner ? "positive" : "negative",
      title: Math.abs(diff) < 0.02
        ? "Pythagorean win% roughly matched"
        : `${pythagFavored} outperforming by run differential`,
      detail: `Expected win% from runs scored/allowed — ${homeTeam}: ${homePct}% · ${awayTeam}: ${awayPct}%. Differential: ${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)} pts.`,
    });
  }

  // --- Rolling form (last 10 games) ---
  if (pred.home_run_diff_10g != null && pred.away_run_diff_10g != null) {
    const hRD = pred.home_run_diff_10g;
    const aRD = pred.away_run_diff_10g;
    const formFavored = hRD > aRD ? homeTeam : awayTeam;
    reasons.push({
      icon: "🔥",
      type: (hRD > aRD) === isHomeWinner ? "positive" : "neutral",
      title: `${formFavored} in better recent form`,
      detail: `Last 10 games run differential — ${homeTeam}: ${hRD >= 0 ? "+" : ""}${hRD.toFixed(1)} · ${awayTeam}: ${aRD >= 0 ? "+" : ""}${aRD.toFixed(1)}.`,
    });
  }

  // --- Win streaks ---
  if (pred.home_current_streak != null && pred.away_current_streak != null) {
    const hS = pred.home_current_streak;
    const aS = pred.away_current_streak;
    const hotTeam = hS > aS ? homeTeam : aS > hS ? awayTeam : null;
    if (Math.abs(hS) >= 3 || Math.abs(aS) >= 3) {
      reasons.push({
        icon: hS > 2 || aS < -2 ? "🔥" : aS > 2 || hS < -2 ? "❄️" : "➡️",
        type: hotTeam === (isHomeWinner ? homeTeam : awayTeam) ? "positive" : "neutral",
        title: hotTeam
          ? `${hotTeam} on a ${Math.abs(hS > aS ? hS : aS)}-game ${(hS > aS ? hS : aS) > 0 ? "winning" : "losing"} streak`
          : "Both teams streaking",
        detail: `Current streaks — ${homeTeam}: ${hS > 0 ? "W" : "L"}${Math.abs(hS)} · ${awayTeam}: ${aS > 0 ? "W" : "L"}${Math.abs(aS)}.`,
      });
    }
  }

  // --- H2H 3-year record ---
  if (pred.h2h_win_pct_3yr != null && Math.abs(pred.h2h_win_pct_3yr - 0.5) > 0.05) {
    const h2hFavored = pred.h2h_win_pct_3yr > 0.5 ? homeTeam : awayTeam;
    const h2hPct = Math.round(pred.h2h_win_pct_3yr > 0.5
      ? pred.h2h_win_pct_3yr * 100
      : (1 - pred.h2h_win_pct_3yr) * 100);
    reasons.push({
      icon: "🔁",
      type: (pred.h2h_win_pct_3yr > 0.5) === isHomeWinner ? "positive" : "negative",
      title: `${h2hFavored} dominates this matchup historically`,
      detail: `3-year head-to-head: ${h2hFavored} wins ${h2hPct}% of games between these clubs.`,
    });
  }

  // --- Divisional rivalry ---
  if (pred.is_divisional) {
    reasons.push({
      icon: "⚔️",
      type: "neutral",
      title: "Divisional rivalry",
      detail: "Intra-division games historically tighter than league average — familiarity compresses win probabilities slightly.",
    });
  }

  // --- Probable starters note (no lineup wOBA for V8) ---
  if (!pred.lineup_confirmed) {
    reasons.push({
      icon: "📋",
      type: "neutral",
      title: "Probable starters only",
      detail: "V8 uses team-level Elo, run differential, and Pythagorean metrics — lineup wOBA splits are not part of this model's feature set.",
    });
  }

  // --- Home field / form footer ---
  reasons.push({
    icon: "🏠",
    type: isHomeWinner ? "positive" : "neutral",
    title: "Home field advantage",
    detail: "Home teams win ~53-54% of MLB games. Elo ratings include a +80 point home bonus that the model was trained on.",
  });

  return reasons;
}

function generateWhyV7(pred) {
  const reasons = [];
  const homeTeam = pred.home_team_name?.split(" ").slice(-1)[0] || "Home";
  const awayTeam = pred.away_team_name?.split(" ").slice(-1)[0] || "Away";
  const isHomeWinner = pred.predicted_winner === pred.home_team_name;

  // Base: lineup / no lineup
  if (!pred.lineup_confirmed) {
    reasons.push({
      icon: "📋",
      type: "neutral",
      title: "Probable starters only",
      detail:
        "Lineups haven't been posted yet. Prediction is driven by pitcher arsenal stats and team rolling form — no platoon split wOBA adjustments available.",
    });
  }

  // Matchup advantage
  if (pred.matchup_advantage_home != null && Math.abs(pred.matchup_advantage_home) >= 0.05) {
    const adv = pred.matchup_advantage_home;
    const favored = adv > 0 ? homeTeam : awayTeam;
    reasons.push({
      icon: adv > 0 ? "⚾" : "⚾",
      type: (adv > 0) === isHomeWinner ? "positive" : "negative",
      title: `Lineup matchup favors ${favored}`,
      detail: `Matchup advantage score: ${adv > 0 ? "+" : ""}${adv.toFixed(3)} (platoon wOBA vs starter hand).`,
    });
  }

  // Pitcher arsenal
  const homeVeloNorm = pred.home_starter_velo_norm;
  const awayVeloNorm = pred.away_starter_velo_norm;
  const homeKBB = pred.home_starter_k_bb_pct;
  const awayKBB = pred.away_starter_k_bb_pct;
  const homeXwoba = pred.home_starter_xwoba_allowed;
  const awayXwoba = pred.away_starter_xwoba_allowed;

  const homeHasArsenal = homeVeloNorm != null && homeVeloNorm !== NEUTRAL_VELO_NORM;
  const awayHasArsenal = awayVeloNorm != null && awayVeloNorm !== NEUTRAL_VELO_NORM;
  const hasArsenal = homeHasArsenal || awayHasArsenal;

  if (hasArsenal) {
    const homeVelo = ((homeVeloNorm ?? 0) * 3 + NEUTRAL_VELO).toFixed(1);
    const awayVelo = ((awayVeloNorm ?? 0) * 3 + NEUTRAL_VELO).toFixed(1);
    const arsenalAdv = pred.starter_arsenal_advantage;

    const betterPitcher =
      arsenalAdv != null
        ? arsenalAdv > 0.05
          ? pred.home_starter_name?.split(" ").slice(-1)[0]
          : arsenalAdv < -0.05
          ? pred.away_starter_name?.split(" ").slice(-1)[0]
          : null
        : null;

    const homeLabel = homeHasArsenal
      ? `${homeVelo} mph FB, K-BB% ${homeKBB != null ? (homeKBB * 100).toFixed(1) : "—"}%, xwOBA ${fmt(homeXwoba)}`
      : `${NEUTRAL_VELO} mph FB (lg avg)`;
    const awayLabel = awayHasArsenal
      ? `${awayVelo} mph FB, K-BB% ${awayKBB != null ? (awayKBB * 100).toFixed(1) : "—"}%, xwOBA ${fmt(awayXwoba)}`
      : `${NEUTRAL_VELO} mph FB (lg avg)`;

    reasons.push({
      icon: "🎯",
      type: betterPitcher
        ? (betterPitcher === pred.home_starter_name?.split(" ").slice(-1)[0]) === isHomeWinner
          ? "positive"
          : "negative"
        : "neutral",
      title: betterPitcher
        ? `${betterPitcher} has the arsenal edge`
        : "Pitchers roughly matched",
      detail: `${pred.home_starter_name?.split(" ").slice(-1)[0] || homeTeam}: ${homeLabel} · ${pred.away_starter_name?.split(" ").slice(-1)[0] || awayTeam}: ${awayLabel}`,
    });
  } else {
    reasons.push({
      icon: "🎯",
      type: "neutral",
      title: "Pitcher arsenal: league-average defaults",
      detail: `No 2026 statcast data yet for ${pred.home_starter_name?.split(" ").slice(-1)[0] || homeTeam} or ${pred.away_starter_name?.split(" ").slice(-1)[0] || awayTeam}. Both treated as league average (93 mph, K-BB% 10%).`,
    });
  }

  // Lineup wOBA
  if (pred.home_lineup_woba_vs_hand != null) {
    const hd = pred.home_lineup_woba_vs_hand - NEUTRAL_WOBA;
    const ad = pred.away_lineup_woba_vs_hand - NEUTRAL_WOBA;
    const homeHand = pred.away_starter_hand;
    const awayHand = pred.home_starter_hand;
    reasons.push({
      icon: "📊",
      type: hd > 0.01 ? "positive" : hd < -0.01 ? "negative" : "neutral",
      title: "Batter vs pitcher hand splits",
      detail: `${homeTeam} lineup: ${fmt(pred.home_lineup_woba_vs_hand)} wOBA vs ${homeHand || "?"}HP (${hd >= 0 ? "+" : ""}${(hd * 1000).toFixed(0)} pts vs avg) · ${awayTeam} lineup: ${fmt(pred.away_lineup_woba_vs_hand)} wOBA vs ${awayHand || "?"}HP (${ad >= 0 ? "+" : ""}${(ad * 1000).toFixed(0)} pts vs avg)`,
    });
  }

  // Venue wOBA
  if (pred.venue_woba_differential != null) {
    const diff = pred.venue_woba_differential;
    reasons.push({
      icon: "🏟️",
      type: diff > 0.01 ? "positive" : diff < -0.01 ? "negative" : "neutral",
      title: diff > 0.01
        ? `${homeTeam} batters historically stronger at this park`
        : diff < -0.01
        ? `${awayTeam} batters historically stronger at this park`
        : "Venue history roughly neutral",
      detail: `Home lineup venue wOBA differential: ${diff >= 0 ? "+" : ""}${(diff * 1000).toFixed(0)} pts vs season wOBA.`,
    });
  }

  // H2H
  if (pred.h2h_data_available) {
    reasons.push({
      icon: "🔁",
      type: "neutral",
      title: "Head-to-head data used",
      detail: "Historical batter vs pitcher matchup data was available and factored into the lineup wOBA estimates.",
    });
  }

  // Home field / form
  reasons.push({
    icon: "🏠",
    type: isHomeWinner ? "positive" : "neutral",
    title: "Home field + team form",
    detail: `Home teams win ~53-54% of MLB games. Rolling win%, run differential, and EMA form for both teams weight the baseline probability before lineup/pitcher adjustments.`,
  });

  return reasons;
}

// ─── Confidence chip ────────────────────────────────────────────────────────

function ConfidencePill({ tier, lineupConfirmed }) {
  return (
    <div className="d-flex gap-1">
      {tier && (
        <Badge bg={confidenceColor(tier)} className="pred-conf-badge">
          {tier}
        </Badge>
      )}
      {!lineupConfirmed && (
        <Badge bg="secondary" className="pred-conf-badge">PROBABLE</Badge>
      )}
    </div>
  );
}

// ─── Single game prediction card ────────────────────────────────────────────

function PredictionCard({ pred, game }) {
  const [expanded, setExpanded] = useState(false);

  const homeProb = pred.home_win_probability != null
    ? Math.round(pred.home_win_probability * 100) : null;
  const awayProb = pred.away_win_probability != null
    ? Math.round(pred.away_win_probability * 100) : null;

  const awayWins = pred.predicted_winner === pred.away_team_name;
  const homeWins = pred.predicted_winner === pred.home_team_name;
  const awayColor = teamColor(pred.away_team_name);
  const homeColor = teamColor(pred.home_team_name);

  const awayId = game?.teams?.away?.team?.id;
  const homeId = game?.teams?.home?.team?.id;

  const reasons = generateWhyText(pred);

  return (
    <Card className="pred-card mb-3 shadow-sm">
      <Card.Body className="p-3">
        {/* Header: matchup + predicted winner */}
        <div className="pred-matchup-row">
          {/* Away */}
          <div className={`pred-team-cell ${awayWins ? "pred-team-winner" : "pred-team-loser"}`}>
            {awayId && (
              <img
                src={teamLogoUrl(awayId)}
                alt=""
                className="pred-team-logo"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <div>
              <div className="pred-team-name" style={{ color: awayWins ? awayColor : undefined }}>
                {pred.away_team_name}
              </div>
              <div className="pred-team-record text-muted">
                {game?.teams?.away?.leagueRecord
                  ? `${game.teams.away.leagueRecord.wins}–${game.teams.away.leagueRecord.losses}`
                  : ""}
              </div>
            </div>
            {awayWins && <span className="pred-winner-crown">👑</span>}
          </div>

          <div className="pred-at text-muted">@</div>

          {/* Home */}
          <div className={`pred-team-cell pred-team-cell--home ${homeWins ? "pred-team-winner" : "pred-team-loser"}`}>
            {homeWins && <span className="pred-winner-crown">👑</span>}
            <div className="text-end">
              <div className="pred-team-name" style={{ color: homeWins ? homeColor : undefined }}>
                {pred.home_team_name}
              </div>
              <div className="pred-team-record text-muted">
                {game?.teams?.home?.leagueRecord
                  ? `${game.teams.home.leagueRecord.wins}–${game.teams.home.leagueRecord.losses}`
                  : ""}
              </div>
            </div>
            {homeId && (
              <img
                src={teamLogoUrl(homeId)}
                alt=""
                className="pred-team-logo"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
          </div>
        </div>

        {/* Probability bar */}
        {awayProb != null && homeProb != null && (
          <div className="mt-2">
            <div className="pred-prob-bar">
              <div
                className="pred-prob-segment"
                style={{
                  width: `${awayProb}%`,
                  background: awayWins ? awayColor : `${awayColor}55`,
                }}
              >
                {awayProb >= 18 && (
                  <span className="pred-prob-label">
                    {awayWins && "✓ "}{awayProb}%
                  </span>
                )}
              </div>
              <div
                className="pred-prob-segment"
                style={{
                  width: `${homeProb}%`,
                  background: homeWins ? homeColor : `${homeColor}55`,
                }}
              >
                {homeProb >= 18 && (
                  <span className="pred-prob-label">
                    {homeWins && "✓ "}{homeProb}%
                  </span>
                )}
              </div>
            </div>
            <div className="pred-bar-labels">
              <span style={{ color: awayColor }}>{pred.away_team_name?.split(" ").slice(-1)[0]}</span>
              <span style={{ color: homeColor }}>{pred.home_team_name?.split(" ").slice(-1)[0]}</span>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="d-flex align-items-center justify-content-between mt-2 flex-wrap gap-1">
          <div className="pred-starters text-muted">
            {pred.away_starter_name?.split(" ").slice(-1)[0] || "—"}
            {pred.away_starter_hand ? ` (${pred.away_starter_hand})` : ""}
            <span className="mx-1 text-muted">vs</span>
            {pred.home_starter_name?.split(" ").slice(-1)[0] || "—"}
            {pred.home_starter_hand ? ` (${pred.home_starter_hand})` : ""}
          </div>
          <ConfidencePill tier={pred.confidence_tier} lineupConfirmed={pred.lineup_confirmed} />
        </div>

        {/* Why / toggle */}
        <button
          className="pred-why-toggle mt-2 w-100 text-start"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "▲ Hide analysis" : "▼ Why this prediction?"}
        </button>

        {expanded && (
          <div className="pred-why-body mt-2">
            {reasons.map((r, i) => (
              <div key={i} className={`pred-reason pred-reason--${r.type}`}>
                <div className="pred-reason-title">
                  <span className="me-1">{r.icon}</span>
                  {r.title}
                </div>
                <div className="pred-reason-detail">{r.detail}</div>
              </div>
            ))}
            {pred.game_pk && (
              <div className="mt-2 text-end">
                <Link to={`/game/${pred.game_pk}`} className="pred-game-link">
                  View game →
                </Link>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const PredictionsPage = () => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [predictions, setPredictions] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch predictions and schedule in parallel
      const [predData, scheduleData] = await Promise.all([
        apiService.getPredictions(date),
        fetch(
          `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${date}&hydrate=team`
        ).then((r) => r.json()),
      ]);

      const preds = predData?.predictions || [];
      const rawGames =
        scheduleData?.dates?.[0]?.games || [];

      // Build game lookup by gamePk
      const gameMap = {};
      rawGames.forEach((g) => { gameMap[g.gamePk] = g; });

      setPredictions(preds);
      setGames(gameMap);
    } catch (err) {
      setError("Could not load predictions for this date.");
      setPredictions([]);
      setGames({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  // Summary stats
  const highConf = predictions.filter(
    (p) => p.confidence_tier?.toUpperCase() === "HIGH"
  );
  const medConf = predictions.filter(
    (p) => p.confidence_tier?.toUpperCase() === "MEDIUM"
  );
  const lineupPreds = predictions.filter((p) => p.lineup_confirmed);

  return (
    <Container fluid className="predictions-page py-4 px-3 px-md-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="fw-bold mb-0">Predictions</h3>
        <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
          {predictions.length > 0
            ? `Daily game outcome forecasts · ${predictions[0].model_version ?? "—"}${
                predictions[0].model_version?.toLowerCase().includes("v8")
                  ? " (Elo + Pythagorean ensemble, 57.7% overall · 65.4% high-confidence)"
                  : " (pitcher-venue stacked ensemble)"
              }`
            : "Daily game outcome forecasts"}
        </p>
      </div>

      {/* Date picker */}
      <div className="pred-date-row mb-4">
        <button
          className="pred-date-nav"
          onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}
        >
          ‹
        </button>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="pred-date-input"
        />
        <button
          className="pred-date-nav"
          disabled={selectedDate >= today}
          onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}
        >
          ›
        </button>
        <span className="pred-date-label text-muted ms-2">
          {new Date(selectedDate + "T12:00:00").toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Summary chips */}
      {!loading && predictions.length > 0 && (
        <div className="pred-summary-chips mb-3">
          <span className="pred-chip">{predictions.length} games</span>
          {highConf.length > 0 && (
            <span className="pred-chip pred-chip--high">
              {highConf.length} high confidence
            </span>
          )}
          {medConf.length > 0 && (
            <span className="pred-chip pred-chip--med">
              {medConf.length} medium confidence
            </span>
          )}
          {lineupPreds.length > 0 && (
            <span className="pred-chip pred-chip--lineup">
              {lineupPreds.length} with confirmed lineups
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Loading predictions…</p>
        </div>
      )}

      {!loading && error && (
        <Alert variant="warning">{error}</Alert>
      )}

      {!loading && !error && predictions.length === 0 && (
        <div className="pred-empty text-center py-5">
          <div className="pred-empty-icon">⚾</div>
          <h5 className="text-muted mt-2">No predictions for this date</h5>
          <p className="text-muted" style={{ fontSize: "0.875rem" }}>
            Predictions are generated for game days. Try a different date or check back once the
            pipeline has run.
          </p>
        </div>
      )}

      {!loading && !error && predictions.length > 0 && (
        <>
          {/* High confidence first, then medium, then low */}
          {["HIGH", "MEDIUM", "LOW"].map((tier) => {
            const group = predictions.filter(
              (p) => (p.confidence_tier?.toUpperCase() || "LOW") === tier
            );
            if (!group.length) return null;
            return (
              <div key={tier} className="mb-4">
                <div className="pred-group-header">
                  <Badge bg={confidenceColor(tier)} className="me-2">
                    {tier}
                  </Badge>
                  <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                    {tier === "HIGH"
                      ? "Strong signal — confirmed lineup + large matchup advantage"
                      : tier === "MEDIUM"
                      ? "Moderate signal — meaningful lineup or arsenal edge"
                      : "Baseline — team form + park factors only"}
                  </span>
                </div>
                <Row className="g-3">
                  {group.map((pred) => (
                    <Col key={pred.game_pk} xs={12} md={6} xl={4}>
                      <PredictionCard
                        pred={pred}
                        game={games[pred.game_pk]}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            );
          })}
        </>
      )}
    </Container>
  );
};

export default PredictionsPage;
