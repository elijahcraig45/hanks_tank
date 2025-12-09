import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/TeamBatting" element={<TeamBatting />} />
        <Route path="/TeamPitching" element={<TeamPitching />} />
        <Route path="/PlayerBatting" element={<PlayerBatting />} />
        <Route path="/PlayerPitching" element={<PlayerPitching />} />
        <Route path="/AssistedAnalysis" element={<AssistedAnalysis />} />
        <Route path="/season-comparison" element={<SeasonComparison />} />
        <Route path="/player-comparison" element={<PlayerComparison />} />
        <Route path="/team-comparison" element={<TeamComparison />} />
        <Route path="/team/:teamAbbr" element={<TeamPage />} />
        <Route path="/player/:playerId" element={<PlayerPage />} />
        <Route path="/games" element={<TodaysGames />} />
        <Route path="/game/:gamePk" element={<GameDetailsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
