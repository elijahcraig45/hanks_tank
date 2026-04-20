import React, { useState } from "react";
import { Badge, Collapse } from "react-bootstrap";
import "./styles/ScoutingReport.css";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(v) {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}
function woba(v) {
  if (v == null) return "—";
  return `.${Math.round(v * 1000)}`;
}
function lastName(full) {
  if (!full) return "TBD";
  return full.split(" ").slice(-1)[0];
}
function teamLast(name) {
  return name?.split(" ").slice(-1)[0] || name || "";
}

const HOT_COLOR  = "#e84040";
const COLD_COLOR = "#2979ff";

// Percentile colour: 80+ = green, 60-79 = teal, 40-59 = neutral, 20-39 = orange, <20 = red
function pctColor(v) {
  if (v == null) return "#adb5bd";
  if (v >= 80) return "#198754";
  if (v >= 60) return "#20c997";
  if (v >= 40) return "#6c757d";
  if (v >= 20) return "#fd7e14";
  return "#dc3545";
}

// ─── Narrative lede ───────────────────────────────────────────────────────────

function buildLede(report) {
  const { momentum, starters, watch_list } = report;
  const homeLast = teamLast(report.home_team_name);
  const awayLast = teamLast(report.away_team_name);

  const parts = [];

  const homeStr = momentum?.home?.streak;
  const awayStr = momentum?.away?.streak;
  const homeRD  = momentum?.home?.run_diff_10g;
  const awayRD  = momentum?.away?.run_diff_10g;

  if (homeStr && awayStr) {
    const homeHot  = homeStr.startsWith("W") && parseInt(homeStr.slice(1)) >= 2;
    const awayHot  = awayStr.startsWith("W") && parseInt(awayStr.slice(1)) >= 2;
    const homeCold = homeStr.startsWith("L") && parseInt(homeStr.slice(1)) >= 2;
    const awayCold = awayStr.startsWith("L") && parseInt(awayStr.slice(1)) >= 2;

    if (homeHot && awayCold) {
      parts.push(`${homeLast} (${homeStr}) welcome a struggling ${awayLast} squad (${awayStr}) to town.`);
    } else if (awayHot && homeCold) {
      parts.push(`${awayLast} (${awayStr}) roll into ${homeLast}'s park riding momentum against a cold home side (${homeStr}).`);
    } else if (homeHot && awayHot) {
      parts.push(`Both squads come in hot — ${awayLast} (${awayStr}) visit ${homeLast} (${homeStr}) in a clash of winners.`);
    } else if (homeCold && awayCold) {
      parts.push(`Neither side is playing their best ball lately — ${awayLast} (${awayStr}) at ${homeLast} (${homeStr}).`);
    } else {
      parts.push(`${awayLast} (${awayStr}) travel to face ${homeLast} (${homeStr}).`);
    }
  }

  if (homeRD != null && awayRD != null) {
    const combined = ((homeRD + awayRD) / 2);
    if (Math.abs(combined) >= 1.0) {
      const s = combined.toFixed(1);
      parts.push(combined > 0
        ? `Both teams have been scoring freely (+${s} combined run diff L10).`
        : `Run scoring has been tough for both sides (${s} combined run diff L10).`);
    }
  }

  const ha = report.arsenal?.home || {};
  const aa = report.arsenal?.away || {};
  const homeP = starters?.home?.name;
  const awayP = starters?.away?.name;

  if (homeP && awayP) {
    const awayPctText = aa.xera_pct != null ? `xERA ${aa.xera_pct}th pct` : null;
    const homePctText = ha.xera_pct != null ? `xERA ${ha.xera_pct}th pct` : null;
    if (awayPctText && homePctText) {
      parts.push(`On the mound: ${awayP} (${awayPctText}) vs ${homeP} (${homePctText}).`);
    } else {
      parts.push(`${awayP} takes the hill against ${homeP}.`);
    }
  }

  const bigStreak = (watch_list || []).find(w => w.type === "streak");
  if (bigStreak) parts.push(bigStreak.label + ".");

  return parts.join(" ");
}

function NarrativeLede({ report }) {
  const lede = buildLede(report);
  if (!lede) return null;
  return (
    <div className="sr-lede mb-3">
      <p className="sr-lede-text">{lede}</p>
    </div>
  );
}

// ─── Prediction bar ───────────────────────────────────────────────────────────

function PredictionBar({ report }) {
  const pred = report?.prediction;
  if (!pred?.home_win_probability) return null;
  const homeP = Math.round(pred.home_win_probability * 100);
  const awayP = Math.round(pred.away_win_probability * 100);
  const isHome = pred.predicted_winner === report.home_team_name;

  return (
    <div className="sr-prediction mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="sr-label">Model Prediction</span>
        <div className="d-flex gap-1">
          {pred.model_version && <Badge bg="dark" className="sr-badge">{pred.model_version}</Badge>}
          {pred.confidence_tier && (
            <Badge
              bg={pred.confidence_tier === "HIGH" ? "success" : pred.confidence_tier === "MEDIUM" ? "warning" : "secondary"}
              className="sr-badge"
            >{pred.confidence_tier}</Badge>
          )}
          {!pred.lineup_confirmed && <Badge bg="secondary" className="sr-badge">PROBABLE</Badge>}
        </div>
      </div>
      <div className="sr-prob-bar">
        <div className={`sr-prob-seg sr-prob-away${!isHome ? " sr-winner" : ""}`} style={{ width: `${awayP}%` }}>
          <span className="sr-prob-lbl">{awayP}%</span>
        </div>
        <div className={`sr-prob-seg sr-prob-home${isHome ? " sr-winner" : ""}`} style={{ width: `${homeP}%` }}>
          <span className="sr-prob-lbl">{homeP}%</span>
        </div>
      </div>
      <div className="d-flex justify-content-between mt-1">
        <span className="sr-team-label">{teamLast(report.away_team_name)}</span>
        <span className="sr-team-label">{teamLast(report.home_team_name)}</span>
      </div>
    </div>
  );
}

// ─── Pitcher duel ─────────────────────────────────────────────────────────────

const ARSENAL_STATS = [
  { key: "xera_pct",  label: "xERA"  },
  { key: "k_pct",     label: "K%"    },
  { key: "whiff_pct", label: "Whiff" },
  { key: "bb_pct",    label: "BB%"   },
  { key: "fbv_pct",   label: "FBV"   },
];

function StatBar({ label, value, flipped = false }) {
  if (value == null) return null;
  const display = Math.round(value);
  const color = pctColor(value);
  return (
    <div className={`sr-stat-bar-row${flipped ? " sr-stat-bar-row--right" : ""}`}>
      {!flipped && <span className="sr-stat-label">{label}</span>}
      <div className="sr-stat-track">
        <div
          className="sr-stat-fill"
          style={{ width: `${display}%`, background: color, ...(flipped ? { marginLeft: "auto" } : {}) }}
        />
      </div>
      <span className="sr-stat-value" style={{ color }}>{display}<sup>th</sup></span>
      {flipped && <span className="sr-stat-label sr-stat-label--right">{label}</span>}
    </div>
  );
}

function PitcherCard({ pitcher, arsenal, side }) {
  const flipped = side === "home";
  const knownSP = arsenal?.sp_known !== false;
  return (
    <div className={`sr-pitcher-card${flipped ? " sr-pitcher-card--home" : ""}`}>
      <div className="sr-pitcher-name">
        {pitcher?.name || "TBD"}
        {pitcher?.hand && <span className="sr-hand ms-1">({pitcher.hand}HP)</span>}
      </div>
      {!knownSP && <div className="sr-pitcher-unknown">league avg used</div>}
      <div className="sr-pitcher-bars">
        {ARSENAL_STATS.map(s => (
          <StatBar key={s.key} label={s.label} value={arsenal?.[s.key]} flipped={flipped} />
        ))}
      </div>
    </div>
  );
}

function PitcherDuelSection({ report }) {
  const s = report?.starters;
  if (!s?.home?.name && !s?.away?.name) return null;
  const arsenal = report?.arsenal || {};
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">⚾ Pitching Matchup</div>
      <div className="sr-duel">
        <PitcherCard pitcher={s.away} arsenal={arsenal.away} side="away" />
        <div className="sr-duel-vs"><span>VS</span></div>
        <PitcherCard pitcher={s.home} arsenal={arsenal.home} side="home" />
      </div>
      <div className="sr-percentile-legend">
        <span style={{ color: "#dc3545" }}>▬</span>
        <span style={{ color: "#fd7e14" }}>▬</span>
        <span style={{ color: "#6c757d" }}>▬</span>
        <span style={{ color: "#20c997" }}>▬</span>
        <span style={{ color: "#198754" }}>▬</span>
        <span className="sr-legend-text">percentile rank (0→100th)</span>
      </div>
    </div>
  );
}

// ─── Team Form with streak dots ───────────────────────────────────────────────

function StreakDots({ streak }) {
  if (!streak) return null;
  const isWin = streak.startsWith("W");
  const count = parseInt(streak.slice(1), 10) || 1;
  const total = 7;
  return (
    <div className="sr-streak-dots">
      {Array.from({ length: total }).map((_, i) => {
        const active = i >= (total - count);
        return (
          <span key={i} className="sr-dot" style={{
            background: active ? (isWin ? "#198754" : "#dc3545") : "#dee2e6",
          }} />
        );
      })}
    </div>
  );
}

function MomentumSection({ report }) {
  const mom = report?.momentum;
  if (!mom?.home && !mom?.away) return null;
  const home = mom.home || {};
  const away = mom.away || {};
  const awayName = teamLast(report.away_team_name);
  const homeName = teamLast(report.home_team_name);

  const rows = [
    { label: "Elo",         awayV: away.elo,          homeV: home.elo,          fmt: v => v,                    high: true },
    { label: "Pythag Win%", awayV: away.pythag_pct,   homeV: home.pythag_pct,   fmt: pct,                       high: true },
    { label: "Run Diff L10",awayV: away.run_diff_10g, homeV: home.run_diff_10g, fmt: v => v > 0 ? `+${v}` : v,  high: true },
  ].filter(r => r.awayV != null && r.homeV != null);

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">📊 Team Form</div>
      <div className="sr-form-grid">
        <div className="sr-form-col">
          <div className="sr-form-team">{awayName}</div>
          <StreakDots streak={away.streak} />
          <div className="sr-form-streak-label">{away.streak}</div>
        </div>
        <div className="sr-form-center">
          {rows.map((r, i) => {
            const awayEdge = r.high ? r.awayV > r.homeV : r.awayV < r.homeV;
            const homeEdge = r.high ? r.homeV > r.awayV : r.homeV < r.awayV;
            return (
              <div key={i} className="sr-form-row">
                <span className={`sr-form-val${awayEdge ? " sr-form-edge" : ""}`}>{r.fmt(r.awayV)}</span>
                <span className="sr-form-key">{r.label}</span>
                <span className={`sr-form-val text-end${homeEdge ? " sr-form-edge" : ""}`}>{r.fmt(r.homeV)}</span>
              </div>
            );
          })}
          {mom.h2h_win_pct_3yr != null && (mom.h2h_game_count_3yr || 0) >= 5 && (
            <div className="sr-form-h2h mt-1">
              <span className="sr-form-h2h-val">{pct(mom.h2h_win_pct_3yr)} home win rate <span className="text-muted">(3yr H2H)</span></span>
            </div>
          )}
        </div>
        <div className="sr-form-col sr-form-col--right">
          <div className="sr-form-team">{homeName}</div>
          <StreakDots streak={home.streak} />
          <div className="sr-form-streak-label">{home.streak}</div>
        </div>
      </div>
    </div>
  );
}

// ─── H2H visual bars ──────────────────────────────────────────────────────────

function H2HYearlySection({ report }) {
  const rows = report?.h2h_yearly;
  if (!rows?.length) return null;
  const homeName = teamLast(report.home_team_name);
  const awayName = teamLast(report.away_team_name);

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">📅 Head-to-Head by Year</div>
      <div className="sr-h2h-bars">
        <div className="sr-h2h-bar-header">
          <span>{awayName}</span>
          <span>{homeName}</span>
        </div>
        {rows.map((r) => {
          const awayW = r.team2_wins;
          const homeW = r.team1_wins;
          const total = r.total_games || (awayW + homeW) || 1;
          const awayPct = Math.round((awayW / total) * 100);
          const homePct = 100 - awayPct;
          return (
            <div key={r.year} className="sr-h2h-bar-row">
              <span className="sr-h2h-bar-year">{r.year}</span>
              <div className="sr-h2h-bar-track">
                <div className="sr-h2h-bar-seg sr-h2h-bar-away" style={{ width: `${awayPct}%`, opacity: awayW >= homeW ? 1 : 0.45 }}>
                  {awayPct >= 20 && <span className="sr-h2h-bar-lbl">{awayW}W</span>}
                </div>
                <div className="sr-h2h-bar-seg sr-h2h-bar-home" style={{ width: `${homePct}%`, opacity: homeW >= awayW ? 1 : 0.45 }}>
                  {homePct >= 20 && <span className="sr-h2h-bar-lbl">{homeW}W</span>}
                </div>
              </div>
              <span className="sr-h2h-bar-gp">{total}G</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Player matchup rows ──────────────────────────────────────────────────────

function PlayerMatchupRow({ player, showK = false }) {
  const w = player.woba || 0;
  const isHot  = w >= 0.380;
  const isCold = w <= 0.230;
  const wobaColor = isHot ? HOT_COLOR : isCold ? COLD_COLOR : "#212529";
  return (
    <div className="sr-matchup-row">
      <span className="sr-matchup-name">{player.player_name}</span>
      <span className="sr-matchup-woba" style={{ color: wobaColor }}>.{Math.round(w * 1000)} wOBA</span>
      <span className="sr-matchup-pa text-muted">{player.pa} PA</span>
      {player.hr > 0 && <span className="sr-matchup-hr">{player.hr}HR</span>}
      {showK && player.k_pct != null && (
        <span className="sr-matchup-k text-muted">{Math.round(player.k_pct * 100)}%K</span>
      )}
    </div>
  );
}

function BatterVsSPSection({ report }) {
  const bvsp = report?.batter_vs_sp;
  const home = bvsp?.home || [];
  const away = bvsp?.away || [];
  if (!home.length && !away.length) return null;
  const homeSP   = report?.starters?.home?.name;
  const awaySP   = report?.starters?.away?.name;
  const homeName = teamLast(report.home_team_name);
  const awayName = teamLast(report.away_team_name);
  const sort = (arr) => [...arr].sort((a,b) => Math.abs((b.woba||0.32)-0.32) - Math.abs((a.woba||0.32)-0.32));
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🎯 Batters vs Today's Starter (Career)</div>
      <div className="sr-matchup-grid">
        {home.length > 0 && awaySP && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{homeName} vs {lastName(awaySP)}</div>
            {sort(home).map((p,i) => <PlayerMatchupRow key={i} player={p} showK />)}
          </div>
        )}
        {away.length > 0 && homeSP && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{awayName} vs {lastName(homeSP)}</div>
            {sort(away).map((p,i) => <PlayerMatchupRow key={i} player={p} showK />)}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchupSection({ report }) {
  const mvt = report?.matchup_vs_team;
  if (!mvt) return null;
  const home = (mvt.home || []).filter(p => p.woba != null);
  const away = (mvt.away || []).filter(p => p.woba != null);
  if (!home.length && !away.length) return null;
  const awayName = teamLast(report.away_team_name);
  const homeName = teamLast(report.home_team_name);
  const sort = (arr) => [...arr].sort((a,b) => Math.abs((b.woba||0.32)-0.32)-Math.abs((a.woba||0.32)-0.32)).slice(0,5);
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🔍 Career vs This Opponent (2024–2026)</div>
      <div className="sr-matchup-grid">
        {home.length > 0 && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{homeName} vs {awayName} pitching</div>
            {sort(home).map((p,i) => <PlayerMatchupRow key={i} player={p} />)}
          </div>
        )}
        {away.length > 0 && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{awayName} vs {homeName} pitching</div>
            {sort(away).map((p,i) => <PlayerMatchupRow key={i} player={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function VenueStatsSection({ report }) {
  const vs = report?.venue_stats;
  const away = vs?.away || [];
  if (!away.length) return null;
  const awayName = teamLast(report.away_team_name);
  const venueName = report?.venue_name || "this park";
  const sort = (arr) => [...arr].sort((a,b) => Math.abs((b.woba||0.32)-0.32)-Math.abs((a.woba||0.32)-0.32));
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🏟️ {awayName} at {venueName} (Career)</div>
      {sort(away).map((p,i) => <PlayerMatchupRow key={i} player={p} />)}
    </div>
  );
}

function HotColdSection({ report }) {
  const hc = report?.hot_cold;
  if (!hc) return null;
  const homeHot  = hc.home?.hot  || [];
  const homeCold = hc.home?.cold || [];
  const awayHot  = hc.away?.hot  || [];
  const awayCold = hc.away?.cold || [];
  if (!homeHot.length && !homeCold.length && !awayHot.length && !awayCold.length) return null;
  const awayName = teamLast(report.away_team_name);
  const homeName = teamLast(report.home_team_name);
  const renderPlayers = (players, side) =>
    players.map((p, i) => (
      <div key={i} className="sr-player-row">
        <span className="sr-player-name">{p.name}</span>
        <span className="sr-player-stat" style={{ color: side === "hot" ? HOT_COLOR : COLD_COLOR }}>{woba(p.woba_14d)} wOBA</span>
        {p.hr > 0 && <span className="sr-player-hr">{p.hr}HR</span>}
      </div>
    ));
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🔥 Hot / ❄️ Cold (Last 14 Days)</div>
      <div className="sr-hc-grid">
        <div className="sr-hc-team">
          <div className="sr-hc-team-name">{awayName}</div>
          {awayHot.length  > 0 && <><div className="sr-hc-group-label" style={{ color: HOT_COLOR  }}>🔥 Hot</div>{renderPlayers(awayHot,  "hot" )}</>}
          {awayCold.length > 0 && <><div className="sr-hc-group-label mt-2" style={{ color: COLD_COLOR }}>❄️ Cold</div>{renderPlayers(awayCold, "cold")}</>}
        </div>
        <div className="sr-hc-team">
          <div className="sr-hc-team-name">{homeName}</div>
          {homeHot.length  > 0 && <><div className="sr-hc-group-label" style={{ color: HOT_COLOR  }}>🔥 Hot</div>{renderPlayers(homeHot,  "hot" )}</>}
          {homeCold.length > 0 && <><div className="sr-hc-group-label mt-2" style={{ color: COLD_COLOR }}>❄️ Cold</div>{renderPlayers(homeCold, "cold")}</>}
        </div>
      </div>
    </div>
  );
}

function WatchListSection({ list }) {
  if (!list?.length) return null;
  const icons = { streak: "📈", h2h: "🔍", hot_player: "🔥", cold_player: "❄️" };
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">👀 Key Things to Watch</div>
      <ul className="sr-watch-list mb-0">
        {list.map((w, i) => (
          <li key={i} className="sr-watch-item">
            <span className="sr-watch-icon">{icons[w.type] || "•"}</span>
            {w.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FunFactsSection({ report }) {
  const facts = report?.fun_facts;
  if (!facts?.length) return null;
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">⚡ Storylines</div>
      <div className="sr-facts-list">
        {facts.map((f, i) => <div key={i} className="sr-fact-item">{f}</div>)}
      </div>
    </div>
  );
}

function NewsSection({ report }) {
  const news = report?.news;
  const homeName = teamLast(report.home_team_name);
  const awayName = teamLast(report.away_team_name);
  const allArticles = [
    ...(news?.away || []).map(a => ({ ...a, _team: awayName })),
    ...(news?.home || []).map(a => ({ ...a, _team: homeName })),
  ];
  if (!allArticles.length) return null;
  const seen = new Set();
  const unique = allArticles.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; });
  return (
    <div className="sr-section mb-1">
      <div className="sr-section-title">📰 Recent News</div>
      <div className="sr-news-list">
        {unique.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="sr-news-item">
            <div className="d-flex gap-2 align-items-start">
              <Badge bg="secondary" className="sr-news-team-badge flex-shrink-0">{a._team}</Badge>
              <div>
                <div className="sr-news-title">{a.title}</div>
                {a.description && <div className="sr-news-desc">{a.description?.slice(0, 120)}{a.description?.length > 120 ? "…" : ""}</div>}
                <div className="sr-news-meta">{a.source}{a.published_at && <span> · {new Date(a.published_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const ScoutingReport = ({ report, defaultOpen = false, alwaysExpanded = false }) => {
  const [open, setOpen] = useState(defaultOpen || alwaysExpanded);
  if (!report) return null;
  const hasContent = report.prediction || report.starters?.home?.name ||
    report.momentum?.home || report.hot_cold || report.watch_list?.length ||
    report.fun_facts?.length || report.h2h_yearly?.length ||
    report.batter_vs_sp?.home?.length || report.batter_vs_sp?.away?.length ||
    (report.news?.home?.length || 0) + (report.news?.away?.length || 0) > 0;
  if (!hasContent) return null;

  const body = (
    <div className="sr-body">
      <PredictionBar report={report} />
      <NarrativeLede report={report} />
      <FunFactsSection report={report} />
      <PitcherDuelSection report={report} />
      <MomentumSection report={report} />
      <H2HYearlySection report={report} />
      <BatterVsSPSection report={report} />
      <MatchupSection report={report} />
      <VenueStatsSection report={report} />
      <HotColdSection report={report} />
      <WatchListSection list={report.watch_list} />
      <NewsSection report={report} />
      <div className="sr-footer text-muted">
        {report.generated_at && (
          <span>Generated {new Date(report.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </div>
    </div>
  );

  if (alwaysExpanded) return <div className="scouting-report scouting-report--inline">{body}</div>;

  return (
    <div className="scouting-report" onClick={e => e.preventDefault()}>
      <button className="sr-toggle-btn" onClick={e => { e.preventDefault(); setOpen(!open); }} aria-expanded={open}>
        <span className="sr-toggle-label">🗒 Scouting Report</span>
        <span className="sr-toggle-chevron">{open ? "▲" : "▼"}</span>
      </button>
      <Collapse in={open}>{body}</Collapse>
    </div>
  );
};

export default ScoutingReport;
