import React, { useState } from "react";
import { Badge, Collapse } from "react-bootstrap";
import "./styles/ScoutingReport.css";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(v) {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}
function fmt(v, digits = 3) {
  if (v == null) return "—";
  return Number(v).toFixed(digits);
}
function woba(v) {
  if (v == null) return "—";
  return `.${Math.round(v * 1000)}`;
}

const HOT_COLOR  = "#e84040";
const COLD_COLOR = "#2979ff";

// ─── sub-sections ─────────────────────────────────────────────────────────────

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
          {pred.model_version && (
            <Badge bg="dark" className="sr-badge">{pred.model_version}</Badge>
          )}
          {pred.confidence_tier && (
            <Badge
              bg={pred.confidence_tier === "HIGH" ? "success" : pred.confidence_tier === "MEDIUM" ? "warning" : "secondary"}
              className="sr-badge"
            >
              {pred.confidence_tier}
            </Badge>
          )}
          {!pred.lineup_confirmed && (
            <Badge bg="secondary" className="sr-badge">PROBABLE</Badge>
          )}
        </div>
      </div>
      <div className="sr-prob-bar">
        <div
          className={`sr-prob-seg sr-prob-away${!isHome ? " sr-winner" : ""}`}
          style={{ width: `${awayP}%` }}
        >
          <span className="sr-prob-lbl">{awayP}%</span>
        </div>
        <div
          className={`sr-prob-seg sr-prob-home${isHome ? " sr-winner" : ""}`}
          style={{ width: `${homeP}%` }}
        >
          <span className="sr-prob-lbl">{homeP}%</span>
        </div>
      </div>
      <div className="d-flex justify-content-between mt-1">
        <span className="sr-team-label">{report.away_team_name?.split(" ").slice(-1)[0]}</span>
        <span className="sr-team-label">{report.home_team_name?.split(" ").slice(-1)[0]}</span>
      </div>
    </div>
  );
}

function StartersSection({ report }) {
  const s = report?.starters;
  if (!s?.home?.name && !s?.away?.name) return null;
  const arsenal = report?.arsenal || {};
  const home = s.home || {};
  const away = s.away || {};
  const ha = arsenal.home || {};
  const aa = arsenal.away || {};

  const fmtPct = (v) => v != null ? `${Math.round(v)}th` : null;
  const hasV10Home = ha.xera_pct != null || ha.k_pct != null;
  const hasV10Away = aa.xera_pct != null || aa.k_pct != null;

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">⚾ Probable Starters</div>
      <div className="sr-starters">
        <div className="sr-starter-col">
          <div className="sr-starter-name">{away.name || "TBD"} {away.hand && <span className="sr-hand">({away.hand}HP)</span>}</div>
          {hasV10Away ? (
            <div className="sr-starter-stats text-muted">
              {fmtPct(aa.xera_pct) && <span>xERA {fmtPct(aa.xera_pct)}</span>}
              {fmtPct(aa.k_pct) && <span> · K% {fmtPct(aa.k_pct)}</span>}
              {fmtPct(aa.bb_pct) && <span> · BB% {fmtPct(aa.bb_pct)}</span>}
              {fmtPct(aa.whiff_pct) && <span> · Whiff {fmtPct(aa.whiff_pct)}</span>}
              {fmtPct(aa.fbv_pct) && <span> · FBV {fmtPct(aa.fbv_pct)}</span>}
              {aa.sp_known === false && <span className="text-warning"> (lg avg)</span>}
            </div>
          ) : (
            <div className="sr-starter-stats text-muted">
              {aa.mean_velo && <span>{aa.mean_velo} mph</span>}
              {aa.k_bb_pct != null && <span> · K-BB {pct(aa.k_bb_pct)}</span>}
              {aa.xwoba_allowed != null && <span> · xwOBA {woba(aa.xwoba_allowed)}</span>}
            </div>
          )}
        </div>
        <div className="sr-starter-vs text-muted">vs</div>
        <div className="sr-starter-col text-end">
          <div className="sr-starter-name">{home.name || "TBD"} {home.hand && <span className="sr-hand">({home.hand}HP)</span>}</div>
          {hasV10Home ? (
            <div className="sr-starter-stats text-muted">
              {fmtPct(ha.xera_pct) && <span>xERA {fmtPct(ha.xera_pct)}</span>}
              {fmtPct(ha.k_pct) && <span> · K% {fmtPct(ha.k_pct)}</span>}
              {fmtPct(ha.bb_pct) && <span> · BB% {fmtPct(ha.bb_pct)}</span>}
              {fmtPct(ha.whiff_pct) && <span> · Whiff {fmtPct(ha.whiff_pct)}</span>}
              {fmtPct(ha.fbv_pct) && <span> · FBV {fmtPct(ha.fbv_pct)}</span>}
              {ha.sp_known === false && <span className="text-warning"> (lg avg)</span>}
            </div>
          ) : (
            <div className="sr-starter-stats text-muted">
              {ha.mean_velo && <span>{ha.mean_velo} mph</span>}
              {ha.k_bb_pct != null && <span> · K-BB {pct(ha.k_bb_pct)}</span>}
              {ha.xwoba_allowed != null && <span> · xwOBA {woba(ha.xwoba_allowed)}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MomentumSection({ report }) {
  const mom = report?.momentum;
  if (!mom?.home && !mom?.away) return null;
  const home = mom.home || {};
  const away = mom.away || {};
  const awayName = report.away_team_name?.split(" ").slice(-1)[0];
  const homeName = report.home_team_name?.split(" ").slice(-1)[0];

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">📊 Team Form</div>
      <div className="sr-momentum-grid">
        <div className="sr-mom-col">
          <div className="sr-mom-team">{awayName}</div>
          {away.elo    && <div className="sr-mom-row"><span className="sr-mom-key">Elo</span><span className="sr-mom-val">{away.elo}</span></div>}
          {away.pythag_pct != null && <div className="sr-mom-row"><span className="sr-mom-key">Pythag</span><span className="sr-mom-val">{pct(away.pythag_pct)}</span></div>}
          {away.streak && <div className="sr-mom-row"><span className="sr-mom-key">Streak</span><span className={`sr-streak ${away.streak.startsWith("W") ? "sr-streak-w" : "sr-streak-l"}`}>{away.streak}</span></div>}
          {away.run_diff_10g != null && <div className="sr-mom-row"><span className="sr-mom-key">Run diff L10</span><span className={`sr-mom-val ${away.run_diff_10g > 0 ? "text-success" : "text-danger"}`}>{away.run_diff_10g > 0 ? "+" : ""}{away.run_diff_10g}</span></div>}
        </div>
        <div className="sr-mom-divider text-muted">
          {mom.elo_differential != null && (
            <div className="sr-elo-diff">
              <span className="sr-elo-badge">
                {Math.abs(mom.elo_differential)} Elo
              </span>
              <div className="sr-elo-label text-muted">edge</div>
            </div>
          )}
          {mom.h2h_win_pct_3yr != null && (mom.h2h_game_count_3yr || 0) >= 5 && (
            <div className="sr-h2h-badge mt-1">
              <span className="sr-h2h">{pct(mom.h2h_win_pct_3yr)}</span>
              <div className="sr-elo-label text-muted">H2H 3yr</div>
            </div>
          )}
        </div>
        <div className="sr-mom-col text-end">
          <div className="sr-mom-team">{homeName}</div>
          {home.elo    && <div className="sr-mom-row justify-content-end"><span className="sr-mom-val">{home.elo}</span><span className="sr-mom-key ms-2">Elo</span></div>}
          {home.pythag_pct != null && <div className="sr-mom-row justify-content-end"><span className="sr-mom-val">{pct(home.pythag_pct)}</span><span className="sr-mom-key ms-2">Pythag</span></div>}
          {home.streak && <div className="sr-mom-row justify-content-end"><span className={`sr-streak ${home.streak.startsWith("W") ? "sr-streak-w" : "sr-streak-l"}`}>{home.streak}</span><span className="sr-mom-key ms-2">Streak</span></div>}
          {home.run_diff_10g != null && <div className="sr-mom-row justify-content-end"><span className={`sr-mom-val ${home.run_diff_10g > 0 ? "text-success" : "text-danger"}`}>{home.run_diff_10g > 0 ? "+" : ""}{home.run_diff_10g}</span><span className="sr-mom-key ms-2">Run diff L10</span></div>}
        </div>
      </div>
    </div>
  );
}

function HotColdSection({ report }) {
  const hc = report?.hot_cold;
  if (!hc) return null;

  const renderPlayers = (players, side) => {
    if (!players?.length) return <span className="text-muted" style={{ fontSize: "0.75rem" }}>No data</span>;
    return players.map((p, i) => (
      <div key={i} className="sr-player-row">
        <span className="sr-player-name">{p.name}</span>
        <span className="sr-player-stat" style={{ color: side === "hot" ? HOT_COLOR : COLD_COLOR }}>
          {woba(p.woba_14d)} wOBA
        </span>
        {p.hr > 0 && <span className="sr-player-hr">{p.hr} HR</span>}
      </div>
    ));
  };

  const homeHot  = hc.home?.hot  || [];
  const homeCold = hc.home?.cold || [];
  const awayHot  = hc.away?.hot  || [];
  const awayCold = hc.away?.cold || [];

  if (!homeHot.length && !homeCold.length && !awayHot.length && !awayCold.length) return null;

  const awayName = report.away_team_name?.split(" ").slice(-1)[0];
  const homeName = report.home_team_name?.split(" ").slice(-1)[0];

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🔥 Hot / ❄️ Cold (Last 14 Days)</div>
      <div className="sr-hc-grid">
        <div className="sr-hc-team">
          <div className="sr-hc-team-name">{awayName}</div>
          {awayHot.length > 0 && (
            <div className="sr-hc-group">
              <div className="sr-hc-group-label" style={{ color: HOT_COLOR }}>🔥 Hot</div>
              {renderPlayers(awayHot, "hot")}
            </div>
          )}
          {awayCold.length > 0 && (
            <div className="sr-hc-group mt-2">
              <div className="sr-hc-group-label" style={{ color: COLD_COLOR }}>❄️ Cold</div>
              {renderPlayers(awayCold, "cold")}
            </div>
          )}
        </div>
        <div className="sr-hc-team">
          <div className="sr-hc-team-name">{homeName}</div>
          {homeHot.length > 0 && (
            <div className="sr-hc-group">
              <div className="sr-hc-group-label" style={{ color: HOT_COLOR }}>🔥 Hot</div>
              {renderPlayers(homeHot, "hot")}
            </div>
          )}
          {homeCold.length > 0 && (
            <div className="sr-hc-group mt-2">
              <div className="sr-hc-group-label" style={{ color: COLD_COLOR }}>❄️ Cold</div>
              {renderPlayers(homeCold, "cold")}
            </div>
          )}
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

function NewsSection({ report }) {
  const news = report?.news;
  const homeName = report.home_team_name?.split(" ").slice(-1)[0];
  const awayName = report.away_team_name?.split(" ").slice(-1)[0];

  const allArticles = [
    ...(news?.away || []).map(a => ({ ...a, _team: awayName })),
    ...(news?.home || []).map(a => ({ ...a, _team: homeName })),
  ];

  if (!allArticles.length) return null;

  // Deduplicate by URL
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  return (
    <div className="sr-section mb-1">
      <div className="sr-section-title">📰 Recent News</div>
      <div className="sr-news-list">
        {unique.map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sr-news-item"
          >
            <div className="d-flex gap-2 align-items-start">
              <Badge bg="secondary" className="sr-news-team-badge flex-shrink-0">{a._team}</Badge>
              <div>
                <div className="sr-news-title">{a.title}</div>
                {a.description && (
                  <div className="sr-news-desc">{a.description?.slice(0, 120)}{a.description?.length > 120 ? "…" : ""}</div>
                )}
                <div className="sr-news-meta">
                  {a.source}
                  {a.published_at && <span> · {new Date(a.published_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function H2HYearlySection({ report }) {
  const rows = report?.h2h_yearly;
  if (!rows?.length) return null;
  const homeName = report.home_team_name?.split(" ").slice(-1)[0];
  const awayName = report.away_team_name?.split(" ").slice(-1)[0];

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">📅 Head-to-Head by Year</div>
      <table className="sr-h2h-table">
        <thead>
          <tr>
            <th>Year</th>
            <th className="text-center">{awayName}</th>
            <th className="text-center">{homeName}</th>
            <th className="text-center">GP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const awayW = r.team2_wins;  // away = team2 in fetch (away_tid)
            const homeW = r.team1_wins;  // home = team1 in fetch (home_tid)
            const homeEdge = homeW > awayW;
            const awayEdge = awayW > homeW;
            return (
              <tr key={r.year}>
                <td className="sr-h2h-year">{r.year}</td>
                <td className={`text-center sr-h2h-wins ${awayEdge ? "sr-h2h-leader" : ""}`}>{awayW}</td>
                <td className={`text-center sr-h2h-wins ${homeEdge ? "sr-h2h-leader" : ""}`}>{homeW}</td>
                <td className="text-center text-muted" style={{ fontSize: "0.72rem" }}>{r.total_games}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BatterVsSPSection({ report }) {
  const bvsp = report?.batter_vs_sp;
  const home = bvsp?.home || [];
  const away = bvsp?.away || [];
  if (!home.length && !away.length) return null;

  const homeSP = report?.starters?.home?.name;
  const awaySP = report?.starters?.away?.name;
  const homeName = report.home_team_name?.split(" ").slice(-1)[0];
  const awayName = report.away_team_name?.split(" ").slice(-1)[0];

  const renderRows = (players) => {
    const sorted = [...players].sort((a, b) => Math.abs((b.woba || 0.32) - 0.32) - Math.abs((a.woba || 0.32) - 0.32));
    return sorted.map((p, i) => {
      const w = p.woba || 0;
      const isHot  = w >= 0.380;
      const isCold = w <= 0.230;
      return (
        <div key={i} className="sr-matchup-row">
          <span className="sr-matchup-name">{p.player_name}</span>
          <span className={`sr-matchup-woba ${isHot ? "text-danger" : isCold ? "text-primary" : ""}`}>
            .{Math.round(w * 1000)} wOBA
          </span>
          <span className="sr-matchup-pa text-muted">{p.pa} PA</span>
          {p.hr > 0 && <span className="sr-matchup-hr">{p.hr} HR</span>}
        </div>
      );
    });
  };

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🎯 vs Today's Starters (Career)</div>
      <div className="sr-matchup-grid">
        {home.length > 0 && awaySP && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{homeName} vs {awaySP}</div>
            {renderRows(home)}
          </div>
        )}
        {away.length > 0 && homeSP && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{awayName} vs {homeSP}</div>
            {renderRows(away)}
          </div>
        )}
      </div>
    </div>
  );
}

function VenueStatsSection({ report }) {
  const vs = report?.venue_stats;
  const home = vs?.home || [];
  const away = vs?.away || [];
  if (!away.length) return null;  // visiting batters at this park is most interesting
  const venueName = report?.venue_name || "this park";
  const awayName = report.away_team_name?.split(" ").slice(-1)[0];

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🏟️ {awayName} Batters at {venueName}</div>
      <div className="sr-venue-list">
        {away.map((p, i) => {
          const w = p.woba || 0;
          const isHot  = w >= 0.380;
          const isCold = w <= 0.230;
          return (
            <div key={i} className="sr-matchup-row">
              <span className="sr-matchup-name">{p.player_name}</span>
              <span className={`sr-matchup-woba ${isHot ? "text-danger" : isCold ? "text-primary" : ""}`}>
                .{Math.round(w * 1000)} wOBA
              </span>
              <span className="sr-matchup-pa text-muted">{p.pa} PA</span>
              {p.hr > 0 && <span className="sr-matchup-hr">{p.hr} HR</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

function FunFactsSection({ report }) {
  const facts = report?.fun_facts;
  if (!facts?.length) return null;
  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">⚡ Fun Facts &amp; Storylines</div>
      <ul className="sr-facts-list mb-0">
        {facts.map((f, i) => (
          <li key={i} className="sr-fact-item">{f}</li>
        ))}
      </ul>
    </div>
  );
}

function MatchupSection({ report }) {
  const mvt = report?.matchup_vs_team;
  if (!mvt) return null;

  const home = (mvt.home || []).filter(p => p.woba != null);
  const away = (mvt.away || []).filter(p => p.woba != null);
  if (!home.length && !away.length) return null;

  const awayName = report.away_team_name?.split(" ").slice(-1)[0];
  const homeName = report.home_team_name?.split(" ").slice(-1)[0];

  const renderRows = (players, opp) => {
    // Show top 5 sorted by abs(woba - 0.320)
    const sorted = [...players].sort((a, b) =>
      Math.abs((b.woba || 0.320) - 0.320) - Math.abs((a.woba || 0.320) - 0.320)
    ).slice(0, 5);
    return sorted.map((p, i) => {
      const w = p.woba || 0;
      const isHot  = w >= 0.375;
      const isCold = w <= 0.235;
      return (
        <div key={i} className="sr-matchup-row">
          <span className="sr-matchup-name">{p.player_name}</span>
          <span className="sr-matchup-opp text-muted">vs {opp}</span>
          <span className={`sr-matchup-woba ${isHot ? "text-danger" : isCold ? "text-primary" : ""}`}>
            .{Math.round(w * 1000)} wOBA
          </span>
          <span className="sr-matchup-pa text-muted">{p.pa} PA</span>
          {p.hr > 0 && <span className="sr-matchup-hr">{p.hr} HR</span>}
        </div>
      );
    });
  };

  return (
    <div className="sr-section mb-3">
      <div className="sr-section-title">🔍 Career Matchup History (2024–2026)</div>
      <div className="sr-matchup-grid">
        {home.length > 0 && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{homeName} vs {awayName} pitching</div>
            {renderRows(home, awayName)}
          </div>
        )}
        {away.length > 0 && (
          <div className="sr-matchup-col">
            <div className="sr-matchup-team-header">{awayName} vs {homeName} pitching</div>
            {renderRows(away, homeName)}
          </div>
        )}
      </div>
    </div>
  );
}

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
      <FunFactsSection report={report} />
      <StartersSection report={report} />
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
          <span>Updated {new Date(report.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </div>
    </div>
  );

  if (alwaysExpanded) {
    return <div className="scouting-report scouting-report--inline">{body}</div>;
  }

  return (
    <div className="scouting-report" onClick={e => e.preventDefault()}>
      <button
        className="sr-toggle-btn"
        onClick={e => { e.preventDefault(); setOpen(!open); }}
        aria-expanded={open}
      >
        <span className="sr-toggle-label">🗒 Scouting Report</span>
        <span className="sr-toggle-chevron">{open ? "▲" : "▼"}</span>
      </button>
      <Collapse in={open}>
        {body}
      </Collapse>
    </div>
  );
};

export default ScoutingReport;

