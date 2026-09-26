import { render, screen } from '@testing-library/react';
import RangeBar, { describeDist, niceTicks, scalePct, sharedDomain } from './RangeBar';

const d = { mean: 4.62, sd: 2.91, p05: 1, p25: 2, p50: 4, p75: 6, p95: 10, min: 0, max: 20, n: 3000 };

test('scales values onto a shared domain and clamps', () => {
  expect(scalePct(5, [0, 10])).toBe(50);
  expect(scalePct(-5, [0, 10])).toBe(0);
  expect(scalePct(null, [0, 10])).toBeNull();
  expect(sharedDomain([d, { ...d, max: 25 }])).toEqual([0, 26]);
  expect(sharedDomain([{ ...d, min: -14, p05: -7 }])[0]).toBe(-15);
  expect(sharedDomain([{ ...d, min: 2, p05: 3 }], { includeZero: true })[0]).toBeLessThanOrEqual(0);
});

test('draws whiskers, the 90% box, the middle 50%, the median and the mean where they belong', () => {
  const { container } = render(<RangeBar dist={d} domain={[0, 20]} label="ATL" unit="runs" />);
  const p90 = container.querySelector('[data-part="p90"]');
  expect(p90).toHaveAttribute('x', '5%');
  expect(p90).toHaveAttribute('width', '45%');
  const iqr = container.querySelector('[data-part="iqr"]');
  expect(iqr).toHaveAttribute('x', '10%');
  expect(iqr).toHaveAttribute('width', '20%');
  expect(container.querySelector('[data-part="median"] line')).toHaveAttribute('x1', '20%');
  expect(container.querySelector('[data-part="mean"]')).toHaveAttribute('cx', `${4.62 * 5}%`);
  const whisk = container.querySelector('[data-part="whisker"] line');
  expect(whisk).toHaveAttribute('x1', '0%');
  expect(whisk).toHaveAttribute('x2', '100%');
});

test('has an accessible text description', () => {
  render(<RangeBar dist={d} domain={[0, 20]} label="ATL" unit="runs" />);
  expect(screen.getByRole('img', { name: /ATL: mean 4\.6 runs, median 4, 90% range 1 to 10, middle 50% 2 to 6, min 0, max 20/ })).toBeInTheDocument();
  expect(describeDist(null)).toBe('No distribution');
});

test('a mean-only Dist draws only the mean', () => {
  const { container } = render(<RangeBar dist={{ mean: 3, p05: null, p95: null }} domain={[0, 10]} />);
  expect(container.querySelector('[data-part="p90"]')).toBeNull();
  expect(container.querySelector('[data-part="mean"]')).not.toBeNull();
});

test('axis ticks land on round numbers', () => {
  expect(niceTicks([0, 16])).toEqual([0, 5, 10, 15]);
  expect(niceTicks([-15, 16])).toEqual([-10, 0, 10]);
});
