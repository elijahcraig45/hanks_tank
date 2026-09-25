import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar, { footballSectionOf } from './Navbar';

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Navbar />
    </MemoryRouter>
  );
}

const switcher = () => within(screen.getByRole('navigation', { name: 'Sport' }));

test('offers the three sports as peers, plus an all-sports home', () => {
  renderNavbar();

  expect(switcher().getByRole('link', { name: /all sports/i })).toHaveAttribute('href', '/');
  expect(switcher().getByRole('link', { name: /mlb/i })).toHaveAttribute('href', '/mlb');
  expect(switcher().getByRole('link', { name: /nfl/i })).toHaveAttribute('href', '/nfl');
  expect(switcher().getByRole('link', { name: /cfb/i })).toHaveAttribute('href', '/cfb');
  // No sport bar on the all-sports home.
  expect(screen.queryByRole('navigation', { name: /sections/i })).not.toBeInTheDocument();
});

test('marks the active sport and sets the accent on the document', () => {
  renderNavbar('/nfl/rankings');

  expect(switcher().getByRole('link', { name: /nfl/i })).toHaveClass('ht-switch--active');
  expect(switcher().getByRole('link', { name: /mlb/i })).not.toHaveClass('ht-switch--active');
  expect(document.documentElement).toHaveAttribute('data-sport', 'nfl');
});

test('every sport gets the same core sections in the same order', () => {
  const core = ['Predictions', 'Rankings', 'Stats', 'Models'];
  ['/mlb/predictions', '/nfl/picks', '/cfb/fbs/picks'].forEach((path) => {
    const { unmount } = renderNavbar(path);
    const labels = within(screen.getByRole('navigation', { name: /sections/i }))
      .getAllByRole('link').map((a) => a.textContent);
    expect(labels.filter((l) => core.includes(l))).toEqual(core);
    unmount();
  });
});

test('MLB stats pages open a pill row with every leaderboard', () => {
  renderNavbar('/mlb/stats/team-pitching');

  const pills = within(screen.getByRole('navigation', { name: /stats pages/i }));
  expect(pills.getByRole('link', { name: 'Team pitching' })).toHaveAttribute('aria-current', 'page');
  expect(pills.getByRole('link', { name: 'Player batting' })).toBeInTheDocument();
  expect(pills.getByRole('link', { name: 'Transactions' })).toBeInTheDocument();
});

test('MLB team and game pages keep their section highlighted', () => {
  renderNavbar('/mlb/game/824776');
  const sections = within(screen.getByRole('navigation', { name: /sections/i }));
  expect(sections.getByRole('link', { name: 'Scores' })).toHaveClass('ht-section--active');
});

test('football Models leads to the model scoreboard, and Pick’em sits in the sport', () => {
  renderNavbar('/nfl/diagnostics');

  const sections = within(screen.getByRole('navigation', { name: /sections/i }));
  expect(sections.getByRole('link', { name: 'Models' })).toHaveClass('ht-section--active');
  expect(sections.getByRole('link', { name: /pick/i })).toHaveAttribute('href', '/pickem/nfl');
  expect(sections.getByRole('link', { name: 'Models' })).toHaveAttribute('href', '/nfl/models');
});

test('NFL has no scores section; college does, with a division switch', () => {
  renderNavbar('/nfl/picks');
  expect(within(screen.getByRole('navigation', { name: /sections/i }))
    .queryByRole('link', { name: 'Scores' })).not.toBeInTheDocument();
});

test('the college division switch keeps the current section', () => {
  renderNavbar('/cfb/fbs/rankings');

  const division = within(screen.getByRole('group', { name: 'Division' }));
  expect(division.getByRole('link', { name: 'FCS' })).toHaveAttribute('href', '/cfb/fcs/rankings');
  expect(division.getByRole('link', { name: 'FBS' })).toHaveClass('ht-division-btn--active');
});

test('pick’em pages keep their sport bar', () => {
  renderNavbar('/pickem/nfl/leaderboard');

  const sections = within(screen.getByRole('navigation', { name: /nfl sections/i }));
  expect(sections.getByRole('link', { name: /pick/i })).toHaveClass('ht-section--active');
});

test('renders a bottom tab bar for phones', () => {
  renderNavbar('/mlb/predictions');

  const bottom = within(screen.getByRole('navigation', { name: 'Sports' }));
  expect(bottom.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  expect(bottom.getByRole('link', { name: /mlb/i })).toHaveAttribute('aria-current', 'page');
  expect(bottom.getByRole('link', { name: /pick/i })).toHaveAttribute('href', '/pickem');
});

test('the theme toggle flips the document theme', () => {
  document.documentElement.setAttribute('data-theme', 'light');
  renderNavbar();

  act(() => { screen.getByRole('button', { name: /switch to dark theme/i }).click(); });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
});

test('footballSectionOf reads both path shapes', () => {
  expect(footballSectionOf('/nfl', false)).toBe('picks');
  expect(footballSectionOf('/cfb/fcs/stats', false)).toBe('stats');
  expect(footballSectionOf('/cfb/fbs/game/401', false)).toBe('scoreboard');
  expect(footballSectionOf('/pickem/cfb', true)).toBe('pickem');
});
