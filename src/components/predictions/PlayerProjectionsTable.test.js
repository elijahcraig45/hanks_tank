import { fireEvent, render, screen, within } from '@testing-library/react';
import PlayerProjectionsTable from './PlayerProjectionsTable';
import { mockPlayers } from '../../services/predictionMocks';

const rows = mockPlayers('mlb', { date: '2026-09-26', gameId: '824776' }).rows;

test('shows batters and starters with mean, range, P(≥1) and calibration badges', () => {
  render(<PlayerProjectionsTable rows={rows} />);
  const batters = screen.getByTestId('players-batter');
  expect(within(batters).getAllByRole('row')).toHaveLength(1 + 18);
  expect(within(batters).getAllByText('calibrated').length).toBeGreaterThan(0);
  expect(within(batters).getAllByText('experimental').length).toBeGreaterThan(0);
  expect(within(batters).getAllByText(/≥1 \d+%/).length).toBeGreaterThan(0);
  expect(screen.getByTestId('players-starter')).toBeInTheDocument();
  expect(screen.getByText(/20 of 20/)).toBeInTheDocument();
});

test('filters by search, team and role', () => {
  render(<PlayerProjectionsTable rows={rows} />);
  fireEvent.change(screen.getByLabelText('Search players'), { target: { value: 'Olson' } });
  expect(within(screen.getByTestId('players-batter')).getAllByRole('row')).toHaveLength(2);
  expect(screen.queryByTestId('players-starter')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'clear' }));

  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'NYM' } });
  expect(within(screen.getByTestId('players-batter')).getAllByRole('row')).toHaveLength(1 + 9);
  expect(within(screen.getByTestId('players-starter')).getAllByRole('row')).toHaveLength(2);

  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'starter' } });
  expect(screen.queryByTestId('players-batter')).toBeNull();
  expect(screen.getByTestId('players-starter')).toBeInTheDocument();
});

test('columns sort, and the header says which way', () => {
  render(<PlayerProjectionsTable rows={rows} />);
  const table = screen.getByTestId('players-batter');
  const hr = within(table).getByRole('button', { name: /^HR/ });
  fireEvent.click(hr);
  expect(hr.closest('th')).toHaveAttribute('aria-sort', 'descending');
  const means = within(table).getAllByRole('row').slice(1).map((r) => {
    const idx = [...table.querySelectorAll('thead th')].findIndex((th) => th === hr.closest('th'));
    const all = [...r.children];
    return Number(all[idx].querySelector('.up-pcell-mean').textContent);
  });
  expect([...means].sort((a, b) => b - a)).toEqual(means);
  fireEvent.click(hr);
  expect(hr.closest('th')).toHaveAttribute('aria-sort', 'ascending');
});
