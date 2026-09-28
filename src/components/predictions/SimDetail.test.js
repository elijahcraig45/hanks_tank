import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarginExact, splitMarginExact } from './SimDetail';

const game = { game_id: 'g1', home: { abbr: 'CHI' }, away: { abbr: 'PHI' } };

function fullPmf() {
  const out = { '<=-61': 0.01, '>=61': 0.02 };
  for (let k = -60; k <= 60; k += 1) out[String(k)] = 0.97 / 121;
  return out;
}

describe('splitMarginExact', () => {
  it('keeps bars inside +/-21 and sums everything beyond, tails included', () => {
    const { entries, beyond } = splitMarginExact(fullPmf());
    expect(entries).toHaveLength(43);
    expect(entries[0][0]).toBe(-21);
    expect(beyond.away).toBeCloseTo(0.01 + (39 * 0.97) / 121, 9);
    expect(beyond.home).toBeCloseTo(0.02 + (39 * 0.97) / 121, 9);
    const inside = entries.reduce((a, [, p]) => a + p, 0);
    expect(inside + beyond.away + beyond.home).toBeCloseTo(1, 9);
  });

  it('reports the tail as unknown for old -21..21 rows', () => {
    const old = {};
    for (let k = -21; k <= 21; k += 1) old[String(k)] = 0.02;
    const { entries, beyond } = splitMarginExact(old);
    expect(entries).toHaveLength(43);
    expect(beyond).toBeNull();
  });
});

describe('MarginExact', () => {
  it('shows the mass beyond the window for full rows', () => {
    render(<MarginExact exact={fullPmf()} game={game} />);
    expect(screen.getByTestId('margin-beyond').textContent).toMatch(/PHI by 22\+: 32\.3% · CHI by 22\+: 33\.3%/);
  });

  it('says the tail was not stored for old rows', () => {
    const old = {};
    for (let k = -21; k <= 21; k += 1) old[String(k)] = 0.02;
    render(<MarginExact exact={old} game={game} />);
    expect(screen.getByTestId('margin-beyond').textContent).toMatch(/not stored/);
  });
});
