import { render, screen } from '@testing-library/react';
import App from './App';

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

test('renders the app shell and default route', () => {
  render(<App />);

  expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
  expect(screen.getByText('HomePage')).toBeInTheDocument();
});
