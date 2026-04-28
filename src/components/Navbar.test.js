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

test('highlights the active top-level route', () => {
  renderNavbar(['/predictions']);

  expect(screen.getAllByText('Predictions')[0]).toHaveClass('ht-link--active');
});

test('opens stats menu and switches to analysis menu', async () => {
  renderNavbar();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /stats/i }));
  });
  expect(screen.getByText('Team Batting')).toBeInTheDocument();
  expect(screen.getByText('Player Pitching')).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /analysis/i }));
  });
  expect(screen.queryByText('Team Batting')).not.toBeInTheDocument();
  expect(screen.getByText('Comparison Workbench')).toBeInTheDocument();
});

test('opens the mobile menu drawer', async () => {
  renderNavbar();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /menu/i }));
  });

  expect(screen.getAllByText('Predictions')).toHaveLength(2);
  expect(screen.getAllByText('Transactions')).toHaveLength(2);
});
