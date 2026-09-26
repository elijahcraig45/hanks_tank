import React, { useId, useState } from 'react';

/**
 * The one place the distribution vocabulary is explained. Every page that shows a Dist
 * (median, 90% range, IQR, min/max …) wraps the word in <DistTerm>, so the definitions
 * cannot drift between the slate, the simulation detail and the player table.
 */
export const DIST_GLOSSARY = {
  mean: 'Mean: the average over every simulated game. It can be a fraction (4.6 runs) even though real games only score whole runs.',
  median: 'Median (p50): half the simulated games came in at or below this value, half at or above.',
  range90: '90% range (p05–p95): 90 of every 100 simulated games landed inside it; 5 fell below and 5 above.',
  iqr: 'Middle 50% (p25–p75, the interquartile range): the typical outcome. Half the simulated games landed inside it.',
  minmax: 'Min / max: the lowest and highest values seen in any simulated game. Rare, but they happened in the simulation.',
  sd: 'Standard deviation: how spread out the simulated outcomes are around the mean.',
  n: 'n: how many games were simulated to build the distribution.',
  pAtLeast1: 'P(≥1): the share of simulated games in which the player recorded at least one.',
  pregame: 'Pregame: written before the start. Only pregame predictions are ever scored.',
  late: 'Written after the start: shown for completeness, flagged, and never scored.',
  consensus: 'Consensus: the average home-win probability across the models that have a prediction for this game.',
  disagreement: 'Disagreement: the gap between the highest and lowest home-win probability across the models. Low is under 8 points, high is 15 or more.',
  calibrated: 'Calibrated: this projection has been scored against real outcomes and matches them.',
  experimental: 'Experimental: not yet shown to match real outcomes. Treat the number as a sketch.',
};

export default function DistTerm({ term, children, note }) {
  const id = useId();
  const text = note || DIST_GLOSSARY[term] || '';
  // Open toward the side with room, so a tip near the right edge never runs off-screen.
  const [side, setSide] = useState('left');
  const place = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    setSide(r.left + 280 > vw ? 'right' : 'left');
  };
  return (
    <span className={`up-term up-term--${side}`} onMouseEnter={place} onFocus={place}>
      <span className="up-term-word" tabIndex={0} aria-describedby={id}>{children}</span>
      <span role="tooltip" id={id} className="up-term-tip">{text}</span>
    </span>
  );
}
