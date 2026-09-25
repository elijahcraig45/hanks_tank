import React from 'react';

/**
 * A team's plausible rank range drawn on the whole board's scale.
 *
 * The bar spans the 5th–95th percentile rank from the bootstrap, the tick is the point
 * rank. Drawn to the full length of the board so a wide band visibly overlaps its
 * neighbours — the point of showing it is that most adjacent ranks are not separated.
 */
export default function RankBand({ rank, lo, hi, total }) {
  if (lo == null || hi == null || !total) return null;
  const pos = (r) => ((r - 1) / Math.max(total - 1, 1)) * 100;
  const left = pos(lo);
  const width = Math.max(pos(hi) - left, 1.5);
  return (
    <span
      className="rank-band"
      role="img"
      aria-label={`Rank ${rank}, plausible range ${lo} to ${hi} of ${total}`}
    >
      <span className="rank-band-range" style={{ left: `${left}%`, width: `${width}%` }} />
      {rank != null && <span className="rank-band-point" style={{ left: `${pos(rank)}%` }} />}
    </span>
  );
}
