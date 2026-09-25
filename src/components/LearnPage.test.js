import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LearnPage from './LearnPage';
import { LEARN_GROUPS, LEARN_PAGES } from '../config/learn';

function renderLearn(path = '/learn') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LearnPage />
    </MemoryRouter>
  );
}

// Other pages (the Models section) link to these files directly; the slugs are a contract.
const STABLE_SLUGS = [
  'football-models', 'football-model-compare', 'football-drive-sim', 'football-matchups',
  'power-rankings', 'mlb-v10-features', 'mlb-pa-simulator', 'ml-course', 'ml-lessons',
  'model-history', 'v10-vs-pa-sim',
];

test('lists every write-up once, at its stable slug', () => {
  expect(LEARN_PAGES.map((p) => p.slug).sort()).toEqual([...STABLE_SLUGS].sort());
  renderLearn();
  STABLE_SLUGS.forEach((slug) => {
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === `/learn/${slug}.html`);
    expect(links).toHaveLength(1);
  });
});

test('groups pages by topic in reading order, each with a description and reading time', () => {
  renderLearn();
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['Foundations', 'MLB', 'Football', 'Rankings']);

  LEARN_GROUPS.forEach((group) => {
    const section = screen.getByRole('region', { name: group.label });
    const cards = within(section).getAllByRole('link');
    const expected = LEARN_PAGES.filter((p) => p.group === group.key);
    expect(cards).toHaveLength(expected.length);
    expected.forEach((page) => {
      const card = within(section).getByRole('link', { name: new RegExp(page.title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      expect(card).toHaveTextContent(page.description);
      expect(card).toHaveTextContent(`${page.minutes} min read`);
    });
  });
});

test('offers a jump link to each topic', () => {
  renderLearn();
  const jump = within(screen.getByRole('navigation', { name: 'Topics' }));
  expect(jump.getByRole('link', { name: 'Football' })).toHaveAttribute('href', '#football');
  expect(document.getElementById('football')).not.toBeNull();
});
