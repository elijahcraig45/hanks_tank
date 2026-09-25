import React from 'react';
import {
  BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams,
} from 'react-router-dom';
import {
  CFB_DIVISIONS, LEGACY_MLB_REDIRECTS, LEGACY_PARAM_REDIRECTS, MLB,
} from './config/sports';
import HomePage from './components/HomePage';
import TeamBatting from './components/TeamBatting';
import PlayerBatting from './components/PlayerBatting';
import PlayerPitching from './components/PlayerPitching';
import AssistedAnalysis from './components/AssistedAnalysis';
import Navbar from './components/Navbar';
import TeamPitching from './components/TeamPitching';
import TeamPage from './components/TeamPage';
import PlayerPage from './components/PlayerPage';
import TodaysGames from './components/GamesToday';
import GameDetailsPage from './components/Game';
import SeasonComparison from './components/SeasonComparison';
import PlayerComparison from './components/PlayerComparison';
import TeamComparison from './components/TeamComparison';
import AdvancedPlayerAnalysis from './components/AdvancedPlayerAnalysis';
import Transactions from './components/Transactions';
import TeamTransactions from './components/TeamTransactions';
import PredictionsPage from './components/PredictionsPage';
import FootballPage from './components/FootballPage';
import FootballGamePage from './components/football/FootballGamePage';
import PickemPage from './components/pickem/PickemPage';
import BaseballRankingsPage from './components/BaseballRankingsPage';
import PredictionDiagnosticsPage from './components/PredictionDiagnosticsPage';
import SplitExplorerPage from './components/SplitExplorerPage';
import StatcastLabPage from './components/StatcastLabPage';
import ComparisonWorkbenchPage from './components/ComparisonWorkbenchPage';
import ScenarioSimulatorPage from './components/ScenarioSimulatorPage';
import ResearchWorkflowPage from './components/ResearchWorkflowPage';
import NotFoundPage from './components/NotFoundPage';
import RouteMetadata from './components/RouteMetadata';
import RecentViewTracker from './components/RecentViewTracker';

/**
 * Keeps an old URL working: renders a redirect to `build(params)`, carrying the query
 * string and hash so a shared link with filters lands on the same view.
 */
function LegacyRedirect({ build }) {
  const params = useParams();
  const location = useLocation();
  return <Navigate to={`${build(params)}${location.search}${location.hash}`} replace />;
}

/** `/cfb/<x>` where x is not a division is a section: `/cfb/rankings` means FBS rankings. */
function CfbRoute({ children }) {
  const { league, section } = useParams();
  const location = useLocation();
  if (!CFB_DIVISIONS.includes(league)) {
    const rest = [league, section].filter(Boolean).join('/');
    return <Navigate to={`/cfb/fbs/${rest}${location.search}`} replace />;
  }
  return children;
}

function AppShell() {
  return (
    <>
      <RouteMetadata />
      <RecentViewTracker />
      <Navbar />
      <main id="main" className="ht-main">
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* ── MLB ── */}
          <Route path="/mlb" element={<Navigate to={MLB.predictions} replace />} />
          <Route path={MLB.predictions} element={<PredictionsPage />} />
          <Route path={MLB.games} element={<TodaysGames />} />
          <Route path="/mlb/game/:gamePk" element={<GameDetailsPage />} />
          <Route path={MLB.rankings} element={<BaseballRankingsPage />} />
          <Route path="/mlb/stats" element={<Navigate to={MLB.teamBatting} replace />} />
          <Route path={MLB.teamBatting} element={<TeamBatting />} />
          <Route path={MLB.teamPitching} element={<TeamPitching />} />
          <Route path={MLB.playerBatting} element={<PlayerBatting />} />
          <Route path={MLB.playerPitching} element={<PlayerPitching />} />
          <Route path={MLB.transactions} element={<Transactions />} />
          <Route path="/mlb/transactions/:teamAbbr" element={<TeamTransactions />} />
          <Route path="/mlb/team/:teamAbbr" element={<TeamPage />} />
          <Route path="/mlb/player/:playerId" element={<PlayerPage />} />
          <Route path={MLB.diagnostics} element={<PredictionDiagnosticsPage />} />
          <Route path={MLB.scenarioSimulator} element={<ScenarioSimulatorPage />} />
          <Route path="/mlb/lab" element={<Navigate to={MLB.splitExplorer} replace />} />
          <Route path={MLB.splitExplorer} element={<SplitExplorerPage />} />
          <Route path={MLB.statcastLab} element={<StatcastLabPage />} />
          <Route path={MLB.comparisonWorkbench} element={<ComparisonWorkbenchPage />} />
          <Route path={MLB.teamComparison} element={<TeamComparison />} />
          <Route path={MLB.playerComparison} element={<PlayerComparison />} />
          <Route path={MLB.seasonComparison} element={<SeasonComparison />} />
          <Route path={MLB.advancedAnalysis} element={<AdvancedPlayerAnalysis />} />
          <Route path={MLB.researchWorkflow} element={<ResearchWorkflowPage />} />
          <Route path={MLB.assistedAnalysis} element={<AssistedAnalysis />} />

          {/* ── NFL ── FootballPage falls back to the NFL league when no :league. */}
          <Route path="/nfl" element={<FootballPage />} />
          <Route path="/nfl/game/:gameId" element={<FootballGamePage league="nfl" />} />
          <Route path="/nfl/:section" element={<FootballPage />} />

          {/* ── College ── */}
          <Route path="/cfb" element={<Navigate to="/cfb/fbs" replace />} />
          <Route path="/cfb/:league" element={<CfbRoute><FootballPage /></CfbRoute>} />
          <Route path="/cfb/:league/game/:gameId" element={<CfbRoute><FootballGamePage /></CfbRoute>} />
          <Route path="/cfb/:league/:section" element={<CfbRoute><FootballPage /></CfbRoute>} />

          {/* ── Pick'em ── kept at its own path: these links are shared off-site. */}
          <Route path="/pickem" element={<PickemPage />} />
          <Route path="/pickem/:sport" element={<PickemPage />} />
          <Route path="/pickem/:sport/:section" element={<PickemPage />} />

          {/* ── Pre-redesign URLs ── */}
          {LEGACY_MLB_REDIRECTS.map(([from, to]) => (
            <Route key={from} path={from} element={<LegacyRedirect build={() => to} />} />
          ))}
          {LEGACY_PARAM_REDIRECTS.map(([from, build]) => (
            <Route key={from} path={from} element={<LegacyRedirect build={build} />} />
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </Router>
  );
}

export default App;
