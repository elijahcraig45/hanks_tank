import * as d3 from 'd3';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import './styles/Strikezone.css';

// ── Pitch type palette ─────────────────────────────────────────────────────────
const PITCH_META = {
  FF: { name: "4-Seam FB",     color: "#e63946" },
  FT: { name: "2-Seam FB",     color: "#f4722b" },
  SI: { name: "Sinker",        color: "#f4722b" },
  FA: { name: "Fastball",      color: "#e63946" },
  FC: { name: "Cutter",        color: "#e07b00" },
  FS: { name: "Splitter",      color: "#9b5de5" },
  SL: { name: "Slider",        color: "#c9a227" },
  ST: { name: "Sweeper",       color: "#0096c7" },
  SV: { name: "Sweeper",       color: "#0096c7" },
  CU: { name: "Curveball",     color: "#4361ee" },
  KC: { name: "Knuckle-Curve", color: "#3f37c9" },
  CB: { name: "Curveball",     color: "#4361ee" },
  CH: { name: "Changeup",      color: "#2dc653" },
  CS: { name: "Slow Curve",    color: "#22a244" },
  KN: { name: "Knuckleball",   color: "#adb5bd" },
  EP: { name: "Eephus",        color: "#adb5bd" },
  PO: { name: "Pitchout",      color: "#6c757d" },
};
const pitchMeta = (code) => PITCH_META[code] || { name: code || "Unknown", color: "#6c757d" };

// ── SVG constants ───────────────────────────────────────────────────────────────
const SVG_SIZE = 320;
const MARGIN   = 22;
const INNER    = SVG_SIZE - MARGIN * 2; // 276

// ── Batter silhouette ──────────────────────────────────────────────────────────
// The batter is drawn in a fixed local coordinate box (100 wide × 180 tall),
// then transformed into position.  The figure always faces RIGHT in its own
// local space (plate side = right).  We flip it horizontally when we need it
// to face left.
//
// Layout logic (from catcher's perspective = umpire view):
//   RHB → left batter's box  (~x = -1.4 ft) → faces right (toward plate)
//   LHB → right batter's box (~x = +1.4 ft) → faces left  (toward plate)
//
// In pitcher view the scaleX domain is reversed, so the same logical positions
// map to mirrored pixel positions automatically — we just keep the same facing.
function drawBatter(svg_g, scaleX, scaleY, batSide) {
  // In catcher/umpire coords: RHB stands at x≈-1.4, LHB at x≈+1.4
  const isLeft  = batSide === "L";
  const standX  = isLeft ? 1.4 : -1.4;  // logical feet
  const cx      = scaleX(standX);        // pixel centre (already accounts for view flip)

  // Vertical anchor: feet at ~0.3 ft, top of head ~ 6.5 ft (scaled)
  const yFoot   = scaleY(0.25);
  const yKnee   = scaleY(1.10);
  const yHip    = scaleY(2.05);
  const yWaist  = scaleY(2.35);
  const yChest  = scaleY(3.20);
  const yShoulder = scaleY(3.55);
  const yNeck   = scaleY(3.75);
  const yHead   = scaleY(4.08);
  const yHelmet = scaleY(4.42);

  // scaleX can be reversed (pitcher view), so we cannot use pixel offsets to
  // determine "toward plate" direction.  We always want the front side of the
  // batter (hands / bat) pointing toward the plate (x=0).
  // Plate is always at logical x=0.  In *pixel* space, plate is always at
  // scaleX(0), so:
  const platePixX = scaleX(0);
  // +1 if plate is to the right of the batter in pixel space, -1 if to the left
  const towardPlate = platePixX > cx ? 1 : -1;

  const grp = svg_g.append("g")
    .attr("class", "batter-silhouette")
    .attr("opacity", 0.70);

  const bodySt  = "#8fa3b8";
  const helmetC = "#1e293b";
  const batC    = "#7c4a1e";
  const skinC   = "#f0c4a0";
  const uniformC = "#6b84a0";

  const W = 9;   // stroke-width for limbs

  // ── Legs ──────────────────────────────────────────────────────────
  // Rear leg (away from plate side)
  grp.append("line")
    .attr("x1", cx - towardPlate * 4).attr("y1", yHip)
    .attr("x2", cx - towardPlate * 10).attr("y2", yKnee)
    .attr("stroke", uniformC).attr("stroke-width", W + 2).attr("stroke-linecap", "round");
  grp.append("line")
    .attr("x1", cx - towardPlate * 10).attr("y1", yKnee)
    .attr("x2", cx - towardPlate * 8).attr("y2", yFoot)
    .attr("stroke", uniformC).attr("stroke-width", W).attr("stroke-linecap", "round");
  // Front leg (plate side)
  grp.append("line")
    .attr("x1", cx + towardPlate * 4).attr("y1", yHip)
    .attr("x2", cx + towardPlate * 12).attr("y2", yKnee)
    .attr("stroke", uniformC).attr("stroke-width", W + 2).attr("stroke-linecap", "round");
  grp.append("line")
    .attr("x1", cx + towardPlate * 12).attr("y1", yKnee)
    .attr("x2", cx + towardPlate * 10).attr("y2", yFoot)
    .attr("stroke", uniformC).attr("stroke-width", W).attr("stroke-linecap", "round");

  // ── Torso ──────────────────────────────────────────────────────────
  grp.append("line")
    .attr("x1", cx).attr("y1", yWaist)
    .attr("x2", cx - towardPlate * 2).attr("y2", yShoulder)
    .attr("stroke", uniformC).attr("stroke-width", 20).attr("stroke-linecap", "round");

  // ── Arm: back (away from plate) ────────────────────────────────────
  grp.append("line")
    .attr("x1", cx - towardPlate * 8).attr("y1", yShoulder)
    .attr("x2", cx - towardPlate * 14).attr("y2", yChest + 4)
    .attr("stroke", uniformC).attr("stroke-width", W - 1).attr("stroke-linecap", "round");

  // ── Arm: front (toward plate) + hands ──────────────────────────────
  const handX = cx + towardPlate * 22;
  const handY = yChest - 2;
  grp.append("line")
    .attr("x1", cx + towardPlate * 6).attr("y1", yShoulder)
    .attr("x2", handX).attr("y2", handY)
    .attr("stroke", uniformC).attr("stroke-width", W - 1).attr("stroke-linecap", "round");
  grp.append("circle")
    .attr("cx", handX).attr("cy", handY)
    .attr("r", 5).attr("fill", "#a0735a");

  // ── Bat ────────────────────────────────────────────────────────────
  // Tip of bat: angled down toward inner part of plate
  const batTipX = cx + towardPlate * 6;
  const batTipY = yHip - 2;
  // Handle at hands, barrel toward plate/zone
  grp.append("line")
    .attr("x1", handX).attr("y1", handY)
    .attr("x2", batTipX).attr("y2", batTipY)
    .attr("stroke", batC).attr("stroke-width", 2.5).attr("stroke-linecap", "round");
  // Barrel (thicker end, lower 55%)
  const bpct = 0.48;
  grp.append("line")
    .attr("x1", handX + (batTipX - handX) * bpct)
    .attr("y1", handY + (batTipY - handY) * bpct)
    .attr("x2", batTipX).attr("y2", batTipY)
    .attr("stroke", batC).attr("stroke-width", 6).attr("stroke-linecap", "round");

  // ── Neck ───────────────────────────────────────────────────────────
  grp.append("line")
    .attr("x1", cx - towardPlate * 3).attr("y1", yShoulder + 2)
    .attr("x2", cx - towardPlate * 3).attr("y2", yNeck)
    .attr("stroke", skinC).attr("stroke-width", 7).attr("stroke-linecap", "round");

  // ── Head ───────────────────────────────────────────────────────────
  const hcx = cx - towardPlate * 3;
  const hcy = yHead;
  grp.append("circle")
    .attr("cx", hcx).attr("cy", hcy)
    .attr("r", 12)
    .attr("fill", skinC).attr("stroke", bodySt).attr("stroke-width", 1);

  // ── Helmet ─────────────────────────────────────────────────────────
  // Dome: upper half of head + crown
  grp.append("path")
    .attr("d", `M ${hcx - 12},${hcy + 2}
                A 12,12 0 0 1 ${hcx + 12},${hcy + 2}
                L ${hcx + 10},${hcy - 4}
                Q ${hcx},${yHelmet} ${hcx - 10},${hcy - 4}
                Z`)
    .attr("fill", helmetC).attr("opacity", 0.92);
  // Bill (facing plate)
  grp.append("path")
    .attr("d", `M ${hcx + towardPlate * 9},${hcy + 3}
                Q ${hcx + towardPlate * 20},${hcy + 6}
                  ${hcx + towardPlate * 18},${hcy + 12}
                Q ${hcx + towardPlate * 10},${hcy + 10}
                  ${hcx + towardPlate * 7},${hcy + 5}
                Z`)
    .attr("fill", helmetC).attr("opacity", 0.92);
}

// ── Component ──────────────────────────────────────────────────────────────────
const StrikeZone = ({ pitches = [], batSide = "R", matchup }) => {
  const svgRef          = useRef(null);
  const [hlIdx, setHlIdx]       = useState(null);
  const [view, setView]         = useState("umpire");

  // Prefer matchup prop, then batSide prop
  const effectiveSide = matchup?.batSide?.code || batSide || "R";
  const sideLabel     = effectiveSide === "L" ? "LHB" : effectiveSide === "S" ? "Switch" : "RHB";

  const pitchTypes = useMemo(() => {
    const seen = new Set();
    pitches.forEach(p => { const c = p.details?.type?.code; if (c) seen.add(c); });
    return [...seen];
  }, [pitches]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.attr("width", SVG_SIZE).attr("height", SVG_SIZE);

    const scaleX = d3.scaleLinear()
      .domain([-2, 2])
      .range(view === "umpire" ? [0, INNER] : [INNER, 0]);
    const scaleY = d3.scaleLinear()
      .domain([0, 4.8])
      .range([INNER, 0]);

    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${MARGIN},${MARGIN})`);

    // Background
    g.append("rect")
      .attr("width", INNER).attr("height", INNER)
      .attr("fill", "#f8f9fa").attr("rx", 4);

    // Grid lines
    scaleX.ticks(7).forEach(v =>
      g.append("line")
        .attr("x1", scaleX(v)).attr("x2", scaleX(v)).attr("y1", 0).attr("y2", INNER)
        .attr("stroke", "#e2e8f0").attr("stroke-width", 0.5)
    );
    scaleY.ticks(6).forEach(v =>
      g.append("line")
        .attr("x1", 0).attr("x2", INNER).attr("y1", scaleY(v)).attr("y2", scaleY(v))
        .attr("stroke", "#e2e8f0").attr("stroke-width", 0.5)
    );

    // Batter's boxes (dashed)
    const bzBoxW = Math.abs(scaleX(0.71) - scaleX(-0.71)) * 0.8;
    [-1.24, 1.24].forEach(cx => {
      g.append("rect")
        .attr("x", scaleX(cx) - bzBoxW / 2)
        .attr("y", scaleY(3.0))
        .attr("width", bzBoxW)
        .attr("height", Math.abs(scaleY(0.5) - scaleY(3.0)))
        .attr("fill", "none")
        .attr("stroke", "#ced4da")
        .attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "3,3");
    });

    // Home plate pentagon
    const px  = scaleX(0);
    const py  = scaleY(0.12);
    const pw  = Math.abs(scaleX(0.71) - scaleX(-0.71));
    const ph  = 10;
    g.append("polygon")
      .attr("points", [
        `${px - pw / 2},${py}`,
        `${px + pw / 2},${py}`,
        `${px + pw / 2},${py + ph * 0.6}`,
        `${px},${py + ph}`,
        `${px - pw / 2},${py + ph * 0.6}`,
      ].join(" "))
      .attr("fill", "#dee2e6").attr("stroke", "#adb5bd").attr("stroke-width", 1);

    // Strike zone box — use Math.min so it works in both umpire and pitcher view
    const szX = Math.min(scaleX(-0.71), scaleX(0.71));
    const szY = scaleY(3.5);
    const szW = Math.abs(scaleX(0.71) - scaleX(-0.71));
    const szH = Math.abs(scaleY(1.5) - scaleY(3.5));
    g.append("rect")
      .attr("x", szX).attr("y", szY)
      .attr("width", szW).attr("height", szH)
      .attr("stroke", "#dc3545").attr("stroke-width", 1.5)
      .attr("fill", "rgba(220,53,69,0.04)");

    // 9-zone grid inside zone
    for (let i = 1; i < 3; i++) {
      g.append("line")
        .attr("x1", szX + szW * i / 3).attr("x2", szX + szW * i / 3)
        .attr("y1", szY).attr("y2", szY + szH)
        .attr("stroke", "#dc3545").attr("stroke-width", 0.4).attr("opacity", 0.45);
      g.append("line")
        .attr("x1", szX).attr("x2", szX + szW)
        .attr("y1", szY + szH * i / 3).attr("y2", szY + szH * i / 3)
        .attr("stroke", "#dc3545").attr("stroke-width", 0.4).attr("opacity", 0.45);
    }

    // Batter silhouette
    const drawSide = effectiveSide === "S" ? "R" : effectiveSide;
    drawBatter(g, scaleX, scaleY, drawSide);

    // Pitches
    pitches.forEach((pitch, idx) => {
      if (!pitch.pitchData?.coordinates) return;
      const { pX, pZ } = pitch.pitchData.coordinates;
      if (pX == null || pZ == null) return;

      const code  = pitch.details?.type?.code;
      const meta  = pitchMeta(code);
      const isHL  = idx === hlIdx;
      const isLast = idx === pitches.length - 1;
      const isHR  = (pitch.details?.description || "").toLowerCase().includes("home run");

      // Glow for highlighted
      if (isHL) {
        g.append("circle")
          .attr("cx", scaleX(pX)).attr("cy", scaleY(pZ))
          .attr("r", 14).attr("fill", meta.color).attr("opacity", 0.22);
      }

      const circle = g.append("circle")
        .attr("cx", scaleX(pX)).attr("cy", scaleY(pZ))
        .attr("r", isHL ? 9 : isLast ? 7 : 5.5)
        .attr("fill", meta.color)
        .attr("opacity", isHL ? 1 : isLast ? 0.95 : 0.75)
        .attr("stroke", isHL || isLast ? "#fff" : "none")
        .attr("stroke-width", isHL ? 2 : 1.5)
        .attr("cursor", "pointer");

      // Pitch sequence number
      g.append("text")
        .attr("x", scaleX(pX)).attr("y", scaleY(pZ) + 3.5)
        .attr("text-anchor", "middle")
        .attr("font-size", isHL ? 8 : 6.5)
        .attr("font-weight", "700")
        .attr("fill", "#fff")
        .attr("pointer-events", "none")
        .text(idx + 1);

      // Home run star marker
      if (isHR) {
        g.append("text")
          .attr("x", scaleX(pX)).attr("y", scaleY(pZ) - 12)
          .attr("text-anchor", "middle").attr("font-size", 12)
          .attr("pointer-events", "none")
          .text("⭐");
      }

      circle
        .on("mouseenter", () => setHlIdx(idx))
        .on("mouseleave", () => setHlIdx(null))
        .on("click", () => setHlIdx(idx === hlIdx ? null : idx));
    });

    // View label at bottom
    g.append("text")
      .attr("x", INNER / 2).attr("y", INNER + 16)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#9ca3af")
      .text(view === "umpire" ? "← 1B · umpire view · 3B →" : "← 3B · pitcher view · 1B →");

  }, [pitches, hlIdx, view, effectiveSide]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlighted = hlIdx != null ? pitches[hlIdx] : null;

  return (
    <div className="live-sz-root">
      {/* Controls */}
      <div className="live-sz-controls">
        <div className="d-flex align-items-center gap-2">
          <button
            className={`live-sz-view-btn${view === "umpire" ? " active" : ""}`}
            onClick={() => setView("umpire")}
          >Umpire</button>
          <button
            className={`live-sz-view-btn${view === "pitcher" ? " active" : ""}`}
            onClick={() => setView("pitcher")}
          >Pitcher</button>
          <span className="live-sz-side-badge">{sideLabel}</span>
        </div>
        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
          {pitches.length} pitch{pitches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Body: SVG + pitch list */}
      <div className="live-sz-body">
        <div className="live-sz-plot">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="live-sz-svg"
          />
          {pitchTypes.length > 0 && (
            <div className="live-sz-legend">
              {pitchTypes.map(code => {
                const m = pitchMeta(code);
                return (
                  <span key={code} className="live-sz-legend-item">
                    <span className="live-sz-legend-dot" style={{ background: m.color }} />
                    {m.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Pitch list */}
        <div className="live-sz-list">
          {pitches.length === 0 ? (
            <p className="text-muted p-2 mb-0" style={{ fontSize: "0.8rem" }}>No pitches yet.</p>
          ) : (
            pitches.slice().reverse().map((pitch, revIdx) => {
              const actualIdx = pitches.length - 1 - revIdx;
              const code  = pitch.details?.type?.code;
              const meta  = pitchMeta(code);
              const isHL  = actualIdx === hlIdx;
              const speed = pitch.pitchData?.startSpeed;
              const desc  = pitch.details?.description || "";
              return (
                <button
                  key={actualIdx}
                  className={`live-sz-pitch-row${isHL ? " live-sz-pitch-row--active" : ""}`}
                  onMouseEnter={() => setHlIdx(actualIdx)}
                  onMouseLeave={() => setHlIdx(null)}
                  onClick={() => setHlIdx(isHL ? null : actualIdx)}
                >
                  <span className="live-sz-pitch-num">{actualIdx + 1}</span>
                  <span className="live-sz-pitch-dot" style={{ background: meta.color }} />
                  <span className="live-sz-pitch-type">{meta.name}</span>
                  {speed != null && (
                    <span className="live-sz-pitch-speed">{Math.round(speed)}</span>
                  )}
                  <span className="live-sz-pitch-desc">{desc}</span>
                  <span className="live-sz-pitch-count text-muted">
                    {pitch.count?.balls}-{pitch.count?.strikes}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected pitch detail */}
      {highlighted && (
        <div className="live-sz-detail">
          <div className="live-sz-detail-header">
            <span className="live-sz-detail-dot"
              style={{ background: pitchMeta(highlighted.details?.type?.code).color }} />
            <strong>{pitchMeta(highlighted.details?.type?.code).name}</strong>
            {highlighted.details?.description && (
              <span className="text-muted ms-2" style={{ fontSize: "0.77rem" }}>
                — {highlighted.details.description}
              </span>
            )}
          </div>
          <div className="live-sz-detail-grid">
            {highlighted.pitchData?.startSpeed != null && (
              <div className="live-sz-detail-stat">
                <span className="live-sz-detail-label">Speed</span>
                <span className="live-sz-detail-val">{Math.round(highlighted.pitchData.startSpeed)} mph</span>
              </div>
            )}
            {highlighted.pitchData?.coordinates?.pX != null && (
              <div className="live-sz-detail-stat">
                <span className="live-sz-detail-label">Horiz</span>
                <span className="live-sz-detail-val">{Number(highlighted.pitchData.coordinates.pX).toFixed(2)} ft</span>
              </div>
            )}
            {highlighted.pitchData?.coordinates?.pZ != null && (
              <div className="live-sz-detail-stat">
                <span className="live-sz-detail-label">Vert</span>
                <span className="live-sz-detail-val">{Number(highlighted.pitchData.coordinates.pZ).toFixed(2)} ft</span>
              </div>
            )}
            {highlighted.pitchData?.breaks?.spinRate != null && (
              <div className="live-sz-detail-stat">
                <span className="live-sz-detail-label">Spin</span>
                <span className="live-sz-detail-val">{Math.round(highlighted.pitchData.breaks.spinRate)} rpm</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StrikeZone;
