import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

function renderNavbar(initialEntries = ['/']) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Navbar />
    </MemoryRouter>
  );
}

test('marks the football tab active on a football route', () => {
  renderNavbar(['/football/nfl/picks']);

  expect(screen.getByRole('link', { name: /football/i })).toHaveClass('ht-sport--active');
});

test('marks the baseball tab active on any MLB route', () => {
  renderNavbar(['/predictions']);

  expect(screen.getByRole('button', { name: /baseball/i })).toHaveClass('ht-sport--active');
});

test('baseball mega menu groups every MLB page', async () => {
  renderNavbar();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /baseball/i }));
  });

  // One menu now covers what used to be two dropdowns.
  expect(screen.getByText('Scoreboard')).toBeInTheDocument();
  expect(screen.getByText('Team Batting')).toBeInTheDocument();
  expect(screen.getByText('Comparison Workbench')).toBeInTheDocument();
  expect(screen.getByText('Transactions')).toBeInTheDocument();
});

test('football stays a single top-level tab with no dropdown', () => {
  renderNavbar();

  const football = screen.getByRole('link', { name: /football/i });
  expect(football).toHaveAttribute('href', '/football');
  expect(screen.queryByText('College FBS')).not.toBeInTheDocument();
});

test('opens the mobile menu drawer', async () => {
  renderNavbar();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /menu/i }));
  });

  expect(screen.getAllByText(/football/i).length).toBeGreaterThan(1);
  expect(screen.getByText('Player Pitching')).toBeInTheDocument();
});
