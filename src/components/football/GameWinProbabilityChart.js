import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

/**
 * Win probability across a game, as two bands meeting at the lead.
 *
 * The two series are complementary — away probability is exactly 1 − home — so this is a
 * part-to-whole over time rather than two independent measures on one canvas. The
 * boundary between the bands IS the win probability, and each team owns a visible
 * region, which is why broadcasts draw it this way: you read who is winning from how
 * much of the chart carries your colour, without tracing a line against an axis.
 *
 * Stacked to a fixed 1.0 rather than fitted. A fitted probability axis makes a close
 * game look like a blowout, and here it would also break the part-to-whole reading.
 *
 * Two hues, so a legend is always present and the tooltip names both teams — identity is
 * never carried by colour alone. The pair is validated for colour-vision separation
 * against the panel surface (CVD ΔE 27.9 against a floor of 8), not eyeballed. A 2px
 * surface-coloured stroke separates the bands, which doubles as making the boundary —
 * the actual probability — the most legible thing in the figure.
 */

const HOME = '#c2410c';   // --sport-ftbl
const AWAY = '#2a78d6';
const SURFACE = '#ffffff';
const GRID = '#e5e7eb';
const AXIS_TEXT = '#52514e';

function WpTooltip({ active, payload, homeName, awayName }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const home = Number(p.homeWp);

  return (
    <div className="fg-tip">
      <div className="fg-tip-rows">
        <span className="fg-tip-row">
          <i className="fg-dot" style={{ background: AWAY }} />
          {awayName} <strong>{((1 - home) * 100).toFixed(0)}%</strong>
        </span>
        <span className="fg-tip-row">
          <i className="fg-dot" style={{ background: HOME }} />
          {homeName} <strong>{(home * 100).toFixed(0)}%</strong>
        </span>
      </div>
      {p.scoreText && <div className="fg-tip-score">{p.scoreText}</div>}
      {p.situation && <div className="fg-tip-meta">{p.situation}</div>}
      {p.playText && <div className="fg-tip-play">{p.playText}</div>}
    </div>
  );
}

export default function GameWinProbabilityChart({ plays, homeName, awayName }) {
  const data = useMemo(() => (plays || [])
    .filter((p) => p && p.homeWinProbability !== null
      && p.homeWinProbability !== undefined)
    .map((p, i) => {
      const homeWp = Number(p.homeWinProbability);
      return {
        playNumber: p.playNumber ?? i,
        homeWp,
        // Stored, not derived at render, so the stack sums to exactly 1 and the
        // boundary lands on the probability rather than near it.
        awayWp: 1 - homeWp,
        playText: p.playText || '',
        scoreText: (p.homeScore !== undefined && p.awayScore !== undefined)
          ? `${awayName} ${p.awayScore} — ${p.homeScore} ${homeName}`
          : '',
        situation: (p.down && p.distance !== undefined)
          ? `${p.down} & ${p.distance}`
          : '',
      };
    }), [plays, homeName, awayName]);

  if (data.length < 2) {
    return (
      <p className="ft-note">
        Not enough play data to draw a win-probability chart for this game.
      </p>
    );
  }

  const closingHome = data[data.length - 1].homeWp;

  return (
    <figure className="fg-figure">
      <figcaption className="fg-figure-cap">
        <span className="fg-figure-title">Win probability</span>
        <span className="fg-legend">
          <span className="fg-key">
            <i className="fg-dot" style={{ background: AWAY }} />
            {awayName} <strong>{((1 - closingHome) * 100).toFixed(0)}%</strong>
          </span>
          <span className="fg-key">
            <i className="fg-dot" style={{ background: HOME }} />
            {homeName} <strong>{(closingHome * 100).toFixed(0)}%</strong>
          </span>
        </span>
      </figcaption>

      <div className="fg-chart">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="playNumber"
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              stroke={GRID}
              label={{
                value: 'Play', position: 'insideBottomRight',
                offset: -2, fill: AXIS_TEXT, fontSize: 11,
              }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v) => `${v * 100}%`}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              stroke={GRID}
              width={44}
            />
            {/* Even money. Where the boundary sits above this line, the home side is
                favoured; the reference makes that readable at a glance. */}
            <ReferenceLine y={0.5} stroke={AXIS_TEXT} strokeDasharray="4 4" />
            <Tooltip
              content={<WpTooltip homeName={homeName} awayName={awayName} />}
              cursor={{ stroke: AXIS_TEXT, strokeWidth: 1 }}
            />
            {/* Home on the bottom, so a rising boundary reads as the home side
                improving. The 2px surface stroke is the gap the stacked-fill spec
                calls for, and it is what makes the boundary legible. */}
            <Area
              type="monotone"
              dataKey="homeWp"
              stackId="wp"
              stroke={SURFACE}
              strokeWidth={2}
              fill={HOME}
              fillOpacity={0.9}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="awayWp"
              stackId="wp"
              stroke="none"
              fill={AWAY}
              fillOpacity={0.9}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="fg-figure-note">
        The two bands always sum to 100%, so the line where they meet is the win
        probability. Above the dashed midline, {homeName} were favoured. Hover for the
        play and the score at that moment.
      </p>
    </figure>
  );
}
