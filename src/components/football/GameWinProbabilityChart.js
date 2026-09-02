import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

/**
 * Home win probability across a game.
 *
 * One series, not two: away probability is 1 − home, so plotting both would draw the
 * same information twice mirrored about 50% and imply two independent measures. A single
 * line against a 50% reference reads as "who was winning, and by how much" — and because
 * it is one series it needs no legend; the axis label and title say whose line it is.
 *
 * The 0–100% domain is fixed rather than fitted. Auto-scaling a probability makes a
 * close game look like a blowout, which is the axis-truncation anti-pattern.
 *
 * Palette: one hue, the football accent already used across these pages. Validated
 * against the panel surface (contrast >= 3:1) rather than eyeballed.
 */

const ACCENT = '#c2410c';        // --sport-ftbl
const GRID = '#e5e7eb';
const AXIS_TEXT = '#52514e';

function WpTooltip({ active, payload, homeName, awayName }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const home = Number(p.homeWp);
  const leader = home >= 0.5 ? homeName : awayName;
  const chance = home >= 0.5 ? home : 1 - home;

  return (
    <div className="fg-tip">
      <div className="fg-tip-head">
        {leader} {(chance * 100).toFixed(0)}%
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
    .map((p, i) => ({
      i,
      playNumber: p.playNumber ?? i,
      homeWp: Number(p.homeWinProbability),
      playText: p.playText || '',
      scoreText: (p.homeScore !== undefined && p.awayScore !== undefined)
        ? `${awayName} ${p.awayScore} — ${p.homeScore} ${homeName}`
        : '',
      situation: (p.down && p.distance !== undefined)
        ? `${p.down} & ${p.distance}`
        : '',
    })), [plays, homeName, awayName]);

  if (data.length < 2) {
    return (
      <p className="ft-note">
        Not enough play data to draw a win-probability curve for this game.
      </p>
    );
  }

  const closing = data[data.length - 1].homeWp;

  return (
    <figure className="fg-figure">
      <figcaption className="fg-figure-cap">
        <span className="fg-figure-title">
          Win probability — <strong>{homeName}</strong>
        </span>
        <span className="fg-figure-meta">
          closed at {(closing * 100).toFixed(0)}%
        </span>
      </figcaption>

      <div className="fg-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
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
              // Fixed 0-100: a fitted probability axis exaggerates a close game.
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v) => `${v * 100}%`}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              stroke={GRID}
              width={44}
            />
            {/* Even money — the line the curve is read against. */}
            <ReferenceLine y={0.5} stroke={AXIS_TEXT} strokeDasharray="4 4" />
            <Tooltip
              content={<WpTooltip homeName={homeName} awayName={awayName} />}
              cursor={{ stroke: AXIS_TEXT, strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="homeWp"
              stroke={ACCENT}
              strokeWidth={2}
              // A marker on every one of ~150 plays is noise; the crosshair does the
              // per-play reading instead.
              dot={false}
              activeDot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="fg-figure-note">
        Above the dashed line, {homeName} were favoured; below it, {awayName}.
        Hover for the play.
      </p>
    </figure>
  );
}
