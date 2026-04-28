import { render, screen } from '@testing-library/react';
import App from './App';
import { STORAGE_KEY } from './utils/recentViews';

jest.mock('./components/HomePage', () => () => <div>HomePage</div>);
jest.mock('./components/TeamBatting', () => () => <div>TeamBatting</div>);
jest.mock('./components/PlayerBatting', () => () => <div>PlayerBatting</div>);
jest.mock('./components/PlayerPitching', () => () => <div>PlayerPitching</div>);
jest.mock('./components/AssistedAnalysis', () => () => <div>AssistedAnalysis</div>);
jest.mock('./components/Navbar', () => () => <div>Mock Navbar</div>);
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
jest.mock('./components/NotFoundPage', () => () => <div>NotFoundPage</div>);

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
    'MLB analytics app'
  );
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
  window.history.pushState({}, '', '/predictions');

  render(<App />);

  expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
  expect(screen.getByText('PredictionsPage')).toBeInTheDocument();

  const recentViews = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  expect(recentViews).toHaveLength(1);
  expect(recentViews[0]).toMatchObject({
    path: '/predictions',
    label: 'Predictions',
  });
});
