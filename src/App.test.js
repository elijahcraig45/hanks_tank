import { render, screen } from '@testing-library/react';
import App from './App';
import { STORAGE_KEY } from './utils/recentViews';

jest.mock('./components/HomePage', () => () => <div>HomePage</div>);
jest.mock('./components/TeamBatting', () => () => <div>TeamBatting</div>);
jest.mock('./components/PlayerBatting', () => () => <div>PlayerBatting</div>);
jest.mock('./components/PlayerPitching', () => () => <div>PlayerPitching</div>);
jest.mock('./components/AssistedAnalysis', () => () => <div>AssistedAnalysis</div>);
jest.mock('./components/Navbar', () => () => <div>Mock Navbar</div>);
jest.mock('./components/SiteBanner', () => () => null);
jest.mock('./components/TeamPitching', () => () => <div>TeamPitching</div>);
jest.mock('./components/TeamPage', () => () => <div>TeamPage</div>);
jest.mock('./components/PlayerPage', () => () => <div>PlayerPage</div>);
jest.mock('./components/GamesToday', () => () => <div>GamesToday</div>);
jest.mock('./components/Game', () => () => <div>GameDetailsPage</div>);
jest.mock('./components/SeasonComparison', () => () => <div>SeasonComparison</div>);
jest.mock('./components/PlayerComparison', () => () => <div>PlayerComparison</div>);
jest.mock('./components/TeamComparison', () => () => <div>TeamComparison</div>);
jest.mock('./components/AdvancedPlayerAnalysis', () => () => <div>AdvancedPlayerAnalysis</div>);
jest.mock('./components/Transactions', () => () => <div>Transactions</div>);
jest.mock('./components/TeamTransactions', () => () => <div>TeamTransactions</div>);
jest.mock('./components/PredictionsPage', () => () => <div>PredictionsPage</div>);
jest.mock('./components/PredictionDiagnosticsPage', () => () => <div>PredictionDiagnosticsPage</div>);
jest.mock('./components/SplitExplorerPage', () => () => <div>SplitExplorerPage</div>);
jest.mock('./components/StatcastLabPage', () => () => <div>StatcastLabPage</div>);
jest.mock('./components/ComparisonWorkbenchPage', () => () => <div>ComparisonWorkbenchPage</div>);
jest.mock('./components/ScenarioSimulatorPage', () => () => <div>ScenarioSimulatorPage</div>);
jest.mock('./components/ResearchWorkflowPage', () => () => <div>ResearchWorkflowPage</div>);
jest.mock('./components/FootballPage', () => () => <div>FootballPage</div>);
jest.mock('./components/football/FootballGamePage', () => () => <div>FootballGamePage</div>);
jest.mock('./components/BaseballRankingsPage', () => () => <div>BaseballRankingsPage</div>);
jest.mock('./components/pickem/PickemPage', () => () => <div>PickemPage</div>);
jest.mock('./components/NotFoundPage', () => () => <div>NotFoundPage</div>);
jest.mock('./components/predictions/UnifiedSlatePage', () => ({ sport }) => <div>UnifiedSlatePage {sport}</div>);
jest.mock('./components/predictions/PlayerProjectionsPage', () => ({ sport }) => <div>PlayerProjectionsPage {sport}</div>);
jest.mock('./components/predictions/GameProjectionsPage', () => ({ sport }) => <div>GameProjectionsPage {sport}</div>);

beforeEach(() => {
  window.history.pushState({}, '', '/');
  window.localStorage.clear();
});

test('renders the app shell and default route', () => {
  render(<App />);

  expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
  expect(screen.getByText('HomePage')).toBeInTheDocument();
  expect(document.title).toBe("Hank's Tank");
  expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
    'MLB, NFL and college football'
  );
});

test('serves each football sport at every depth of its path', () => {
  [
    ['/nfl/rankings', "NFL | Hank's Tank"],
    ['/cfb/fcs/rankings', "College Football | Hank's Tank"],
  ].forEach(([path, title]) => {
    window.history.pushState({}, '', path);
    const { unmount } = render(<App />);
    expect(screen.getByText('FootballPage')).toBeInTheDocument();
    expect(document.title).toBe(title);
    unmount();
  });
});

test('serves the unified predictions pages for every sport', () => {
  [
    ['/mlb/predictions', 'UnifiedSlatePage mlb'],
    ['/mlb/predictions/players', 'PlayerProjectionsPage mlb'],
    ['/mlb/predictions/game/824776', 'GameProjectionsPage mlb'],
    ['/mlb/predictions/classic', 'PredictionsPage'],
    ['/nfl/predictions', 'UnifiedSlatePage nfl'],
    ['/nfl/predictions/players', 'PlayerProjectionsPage nfl'],
    ['/nfl/predictions/game/401', 'GameProjectionsPage nfl'],
    ['/nfl/picks', 'FootballPage'],
    ['/cfb/fcs/predictions', 'UnifiedSlatePage cfb'],
    ['/cfb/fbs/predictions/players', 'PlayerProjectionsPage cfb'],
    ['/cfb/fbs/predictions/game/401', 'GameProjectionsPage cfb'],
  ].forEach(([path, text]) => {
    window.history.pushState({}, '', path);
    const { unmount } = render(<App />);
    expect(screen.getByText(text)).toBeInTheDocument();
    unmount();
  });
});

test('sport homes open the unified predictions', () => {
  [['/nfl', '/nfl/predictions'], ['/cfb/fbs', '/cfb/fbs/predictions'], ['/cfb', '/cfb/fbs/predictions']]
    .forEach(([from, to]) => {
      window.history.pushState({}, '', from);
      const { unmount } = render(<App />);
      expect(window.location.pathname).toBe(to);
      unmount();
    });
});

test.each([
  ['/football', '/nfl/predictions'],
  ['/football/nfl/picks', '/nfl/picks'],
  ['/football/fbs/rankings', '/cfb/fbs/rankings'],
  ['/football/fcs/models', '/cfb/fcs/models'],
  ['/football/fbs/game/401', '/cfb/fbs/game/401'],
  ['/cfb', '/cfb/fbs/predictions'],
  ['/cfb/rankings', '/cfb/fbs/rankings'],
  ['/games', '/mlb/games'],
  ['/game/824776', '/mlb/game/824776'],
  ['/predictions', '/mlb/predictions'],
  ['/rankings', '/mlb/rankings'],
  ['/prediction-diagnostics', '/mlb/models/diagnostics'],
  ['/TeamBatting', '/mlb/stats/team-batting'],
  ['/PlayerPitching', '/mlb/stats/player-pitching'],
  ['/team/ATL', '/mlb/team/ATL'],
  ['/player/660670', '/mlb/player/660670'],
  ['/transactions/ATL', '/mlb/transactions/ATL'],
  ['/statcast-lab', '/mlb/lab/statcast-lab'],
  ['/scenario-simulator', '/mlb/models/scenario-simulator'],
  ['/mlb', '/mlb/predictions'],
])('redirects %s to %s', (from, to) => {
  window.history.pushState({}, '', from);
  render(<App />);
  expect(window.location.pathname).toBe(to);
});

test('a legacy redirect keeps the query string', () => {
  window.history.pushState({}, '', '/statcast-lab?playerId=660670&season=2026');
  render(<App />);
  expect(window.location.pathname).toBe('/mlb/lab/statcast-lab');
  expect(window.location.search).toBe('?playerId=660670&season=2026');
  expect(screen.getByText('StatcastLabPage')).toBeInTheDocument();
});

test('renders the not found page for unknown routes', () => {
  window.history.pushState({}, '', '/definitely-not-a-real-page');

  render(<App />);

  expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
  expect(screen.getByText('NotFoundPage')).toBeInTheDocument();
  expect(document.title).toBe("Page Not Found | Hank's Tank");
  expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://hankstank.com/definitely-not-a-real-page'
  );
});

test('tracks recently viewed routes for supported pages', () => {
  window.history.pushState({}, '', '/mlb/predictions');

  render(<App />);

  expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
  expect(screen.getByText('UnifiedSlatePage mlb')).toBeInTheDocument();

  const recentViews = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  expect(recentViews).toHaveLength(1);
  expect(recentViews[0]).toMatchObject({
    path: '/mlb/predictions',
    label: 'MLB Predictions',
  });
});
