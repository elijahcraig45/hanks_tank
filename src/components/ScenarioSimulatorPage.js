import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AnalyticsPanel from './analytics/AnalyticsPanel';
import AnalyticsSummaryCard from './analytics/AnalyticsSummaryCard';
import SaveResearchViewButton from './analytics/SaveResearchViewButton';
import apiService from '../services/api';
import {
  downloadCsv,
  extractIsoDate,
  formatIsoDateLabel,
  formatPercent,
  mergeSearchParams,
} from '../utils/analytics';
import {
  applyScenarioAdjustments,
  buildPlayerMatchupProfile,
  buildProjectedLineup,
  evaluateLineup,
  formatSignedPoints,
  getScenarioContext,
  normalizeRosterCandidates,
  simulateMatchupDistribution,
  summarizeLineupAdjustment,
} from '../utils/scenarioSimulator';
import './styles/ScenarioSimulatorPage.css';

function formatDateLabel(value) {
  return formatIsoDateLabel(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function describePitcherHand(value) {
  return String(value || 'R').toUpperCase() === 'L' ? 'LHP' : 'RHP';
}

function getSeasonFromDate(value) {
  const parsed = Number.parseInt(String(value || '').slice(0, 4), 10);
  return Number.isNaN(parsed) ? new Date().getFullYear() : parsed;
}

function swapLineupPlayers(lineup, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= lineup.length) {
    return lineup;
  }

  const next = [...lineup];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

function selectPlayerForSlot(lineup, slotIndex, playerId) {
  const normalizedPlayerId = Number(playerId);
  if (!normalizedPlayerId) {
    return lineup;
  }

  const next = [...lineup];
  const existingIndex = next.findIndex((entry) => Number(entry) === normalizedPlayerId);
  if (existingIndex >= 0) {
    [next[slotIndex], next[existingIndex]] = [next[existingIndex], next[slotIndex]];
    return next;
  }

  next[slotIndex] = normalizedPlayerId;
  return next;
}

function buildProjectionRows(homeAnalysis, awayAnalysis) {
  return [...(homeAnalysis?.assignments || []), ...(awayAnalysis?.assignments || [])].sort((left, right) => {
    if (left.teamLabel !== right.teamLabel) {
      return String(left.teamLabel).localeCompare(String(right.teamLabel));
    }

    return Number(left.slot) - Number(right.slot);
  });
}

function ScenarioSimulatorPage() {
  const today = new Date().toISOString().split('T')[0];
  const [searchParams, setSearchParams] = useSearchParams();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lineupWorkbench, setLineupWorkbench] = useState(null);
  const [lineupLoading, setLineupLoading] = useState(false);
  const [lineupError, setLineupError] = useState(null);

  const selectedDate = extractIsoDate(searchParams.get('date')) || today;
  const searchTerm = searchParams.get('q') || '';
  const gamePk = Number(searchParams.get('gamePk') || 0);
  const simulationCount = Number(searchParams.get('sims') || 5000);
  const starter = Number(searchParams.get('starter') || 0);
  const lineup = Number(searchParams.get('lineup') || 0);
  const bullpen = Number(searchParams.get('bullpen') || 0);
  const form = Number(searchParams.get('form') || 0);
  const context = Number(searchParams.get('context') || 0);
  const selectedSeason = getSeasonFromDate(selectedDate);

  const updateParams = (updates) => {
    setSearchParams(mergeSearchParams(searchParams, updates), { replace: true });
  };

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getPredictions(selectedDate);
      setPredictions(response?.predictions || []);
    } catch (nextError) {
      setPredictions([]);
      setError('Could not load predictions for the simulator date.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const filteredPredictions = useMemo(() => {
    if (!searchTerm.trim()) {
      return predictions;
    }

    const normalized = searchTerm.trim().toLowerCase();
    return predictions.filter((prediction) =>
      [
        prediction.away_team_name,
        prediction.home_team_name,
        prediction.away_starter_name,
        prediction.home_starter_name,
        prediction.predicted_winner,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [predictions, searchTerm]);

  const selectedPrediction = useMemo(
    () => predictions.find((prediction) => Number(prediction.game_pk) === gamePk) || filteredPredictions[0] || null,
    [filteredPredictions, gamePk, predictions]
  );

  const loadLineupWorkbench = useCallback(async () => {
    if (!selectedPrediction?.home_team_id || !selectedPrediction?.away_team_id) {
      setLineupWorkbench(null);
      return;
    }

    setLineupLoading(true);
    setLineupError(null);

    try {
      const [homeRosterResponse, awayRosterResponse] = await Promise.all([
        apiService.getTeamRoster(selectedPrediction.home_team_id, selectedSeason),
        apiService.getTeamRoster(selectedPrediction.away_team_id, selectedSeason),
      ]);

      const homeRoster = normalizeRosterCandidates(homeRosterResponse).slice(0, 18);
      const awayRoster = normalizeRosterCandidates(awayRosterResponse).slice(0, 18);

      if (homeRoster.length < 9 || awayRoster.length < 9) {
        throw new Error('Not enough active hitters to build a what-if lineup.');
      }

      const buildProfiles = async (candidates, pitcherHand, teamLabel) => {
        const responses = await Promise.allSettled(
          candidates.map((candidate) =>
            apiService.getSplits({
              entityType: 'player',
              entityId: candidate.playerId,
              season: selectedSeason,
              group: 'hitting',
              family: 'handedness',
            })
          )
        );

        return candidates
          .map((candidate, index) =>
            buildPlayerMatchupProfile(
              {
                ...candidate,
                teamLabel,
              },
              responses[index]?.status === 'fulfilled' ? responses[index].value : null,
              pitcherHand
            )
          )
          .sort((left, right) => right.matchupScore - left.matchupScore);
      };

      const [homeCandidates, awayCandidates] = await Promise.all([
        buildProfiles(homeRoster, selectedPrediction.away_starter_hand, selectedPrediction.home_team_name),
        buildProfiles(awayRoster, selectedPrediction.home_starter_hand, selectedPrediction.away_team_name),
      ]);

      const baselineHomeSlots = buildProjectedLineup(homeCandidates).map((entry) => entry.playerId);
      const baselineAwaySlots = buildProjectedLineup(awayCandidates).map((entry) => entry.playerId);

      setLineupWorkbench({
        homeCandidates,
        awayCandidates,
        baselineHomeSlots,
        baselineAwaySlots,
        homeSlots: baselineHomeSlots,
        awaySlots: baselineAwaySlots,
      });
    } catch (nextError) {
      setLineupWorkbench(null);
      setLineupError('Could not load roster and player split data for the lineup lab.');
    } finally {
      setLineupLoading(false);
    }
  }, [selectedPrediction, selectedSeason]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedPrediction) {
      setLineupWorkbench(null);
      setLineupError(null);
      return undefined;
    }

    const run = async () => {
      await loadLineupWorkbench();
      if (cancelled) {
        setLineupWorkbench(null);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loadLineupWorkbench, selectedPrediction]);

  const homeCandidates = useMemo(
    () => lineupWorkbench?.homeCandidates || [],
    [lineupWorkbench]
  );
  const awayCandidates = useMemo(
    () => lineupWorkbench?.awayCandidates || [],
    [lineupWorkbench]
  );

  const baselineHomeAnalysis = useMemo(
    () => evaluateLineup(lineupWorkbench?.baselineHomeSlots || [], homeCandidates),
    [homeCandidates, lineupWorkbench]
  );
  const baselineAwayAnalysis = useMemo(
    () => evaluateLineup(lineupWorkbench?.baselineAwaySlots || [], awayCandidates),
    [awayCandidates, lineupWorkbench]
  );
  const homeLineupAnalysis = useMemo(
    () => evaluateLineup(lineupWorkbench?.homeSlots || [], homeCandidates),
    [homeCandidates, lineupWorkbench]
  );
  const awayLineupAnalysis = useMemo(
    () => evaluateLineup(lineupWorkbench?.awaySlots || [], awayCandidates),
    [awayCandidates, lineupWorkbench]
  );
  const lineupModelAdjustment = useMemo(
    () => summarizeLineupAdjustment(homeLineupAnalysis, baselineHomeAnalysis, awayLineupAnalysis, baselineAwayAnalysis),
    [awayLineupAnalysis, baselineAwayAnalysis, baselineHomeAnalysis, homeLineupAnalysis]
  );

  const adjustments = useMemo(
    () => ({
      starter,
      lineup: lineup + (lineupModelAdjustment?.winProbabilityPoints || 0),
      bullpen,
      form,
      context,
    }),
    [bullpen, context, form, lineup, lineupModelAdjustment, starter]
  );

  const manualLineupAdjustment = lineup;
  const scenarioControls = useMemo(
    () => getScenarioContext(selectedPrediction),
    [selectedPrediction]
  );

  const adjustedHomeProbability = useMemo(
    () => applyScenarioAdjustments(selectedPrediction?.home_win_probability || 0.5, adjustments),
    [adjustments, selectedPrediction]
  );

  const simulation = useMemo(
    () =>
      simulateMatchupDistribution(
        adjustedHomeProbability,
        simulationCount,
        Number(selectedPrediction?.game_pk || 0) +
          Math.round((starter + manualLineupAdjustment + bullpen + form + context + (lineupModelAdjustment?.winProbabilityPoints || 0)) * 10)
      ),
    [
      adjustedHomeProbability,
      bullpen,
      context,
      form,
      lineupModelAdjustment,
      manualLineupAdjustment,
      selectedPrediction,
      simulationCount,
      starter,
    ]
  );

  const projectionRows = useMemo(
    () => buildProjectionRows(homeLineupAnalysis, awayLineupAnalysis),
    [awayLineupAnalysis, homeLineupAnalysis]
  );

  const updateTeamLineup = (teamKey, updater) => {
    setLineupWorkbench((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [teamKey]: updater(previous[teamKey]),
      };
    });
  };

  const handleMoveSlot = (teamKey, slotIndex, direction) => {
    updateTeamLineup(teamKey, (lineupState) => swapLineupPlayers(lineupState, slotIndex, slotIndex + direction));
  };

  const handleSelectPlayer = (teamKey, slotIndex, playerId) => {
    updateTeamLineup(teamKey, (lineupState) => selectPlayerForSlot(lineupState, slotIndex, playerId));
  };

  const handleResetLineups = () => {
    setLineupWorkbench((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        homeSlots: [...previous.baselineHomeSlots],
        awaySlots: [...previous.baselineAwaySlots],
      };
    });
  };

  const handleExport = () => {
    downloadCsv(
      `scenario-simulator-${selectedPrediction?.game_pk || 'matchup'}-${selectedDate}.csv`,
      [
        { label: 'Team', value: (row) => row.teamLabel },
        { label: 'Slot', value: (row) => row.slot },
        { label: 'Player', value: (row) => row.playerName },
        { label: 'Split Label', value: (row) => row.splitLabel },
        { label: 'OPS', value: (row) => row.ops },
        { label: 'Hit Probability', value: (row) => row.hitProbability },
        { label: 'Expected Hits', value: (row) => row.expectedHits },
        { label: 'Expected Total Bases', value: (row) => row.expectedTotalBases },
        { label: 'HR Probability', value: (row) => row.homeRunProbability },
        { label: 'K Probability', value: (row) => row.strikeoutProbability },
        { label: 'BB Probability', value: (row) => row.walkProbability },
        { label: 'Slot Value', value: (row) => row.slotValue },
      ],
      projectionRows
    );
  };

  const renderLineupEditor = (teamKey, teamLabel, lineupSlots, candidates, analysis, pitcherHandLabel) => (
    <div className="scenario-simulator-lineup-card">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div className="fw-semibold">{teamLabel}</div>
          <div className="text-muted small">Projected against {pitcherHandLabel}</div>
        </div>
        <div className="text-end">
          <div className="scenario-simulator-lineup-metric">{analysis.totalSlotValue.toFixed(2)} slot value</div>
          <div className="text-muted small">{analysis.totalExpectedHits.toFixed(1)} expected hits</div>
        </div>
      </div>

      <div className="table-responsive">
        <Table hover size="sm" className="mb-0 align-middle scenario-simulator-lineup-table">
          <thead className="table-light">
            <tr>
              <th>Slot</th>
              <th>Player</th>
              <th>Slot value</th>
              <th>Hit</th>
              <th>TB</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {lineupSlots.map((playerId, index) => {
              const assignment = analysis.assignments[index];

              return (
                <tr key={`${teamKey}-${index + 1}`}>
                  <td className="fw-semibold">{index + 1}</td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={playerId}
                      onChange={(event) => handleSelectPlayer(teamKey, index, event.target.value)}
                    >
                      {candidates.map((candidate) => (
                        <option key={candidate.playerId} value={candidate.playerId}>
                          {candidate.playerName} {candidate.position ? `(${candidate.position})` : ''}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>{assignment ? assignment.slotValue.toFixed(2) : '—'}</td>
                  <td>{assignment ? formatPercent(assignment.hitProbability) : '—'}</td>
                  <td>{assignment ? assignment.expectedTotalBases.toFixed(2) : '—'}</td>
                  <td className="text-nowrap">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="scenario-simulator-order-btn"
                      onClick={() => handleMoveSlot(teamKey, index, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="scenario-simulator-order-btn"
                      onClick={() => handleMoveSlot(teamKey, index, 1)}
                      disabled={index === lineupSlots.length - 1}
                    >
                      Down
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );

  return (
    <Container fluid="xl" className="scenario-simulator-page py-4 px-3 px-md-4">
      <div className="scenario-simulator-header mb-4">
        <div>
          <div className="scenario-simulator-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Scenario Simulator</h2>
          <p className="text-muted mb-0">
            Stress-test matchup assumptions, reorder lineups, and turn a single forecast into a player-aware outcome distribution.
          </p>
        </div>
        <div className="scenario-simulator-actions">
          <Button as={Link} to="/comparison-workbench" variant="outline-secondary" size="sm">
            Back to Workbench
          </Button>
          <SaveResearchViewButton
            label="Scenario Simulator"
            hint="What-if matchup adjustments, lineup editing, and player-level projections"
          />
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => updateParams({ starter: null, lineup: null, bullpen: null, form: null, context: null })}
          >
            Reset adjustments
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleResetLineups}
            disabled={!lineupWorkbench}
          >
            Reset lineups
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!projectionRows.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <AnalyticsPanel
        title="Simulation controls"
        subtitle="Choose a game, sample size, and scenario assumptions. Positive adjustments help the home team."
        className="mb-4"
      >
        <div className="scenario-simulator-toolbar">
          <Form.Group>
            <Form.Label>Date</Form.Label>
            <Form.Control
              size="sm"
              type="date"
              max={today}
              value={selectedDate}
              onChange={(event) => updateParams({ date: event.target.value, gamePk: null })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Simulation count</Form.Label>
            <Form.Select size="sm" value={simulationCount} onChange={(event) => updateParams({ sims: event.target.value })}>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={25000}>25,000</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="scenario-simulator-search">
            <Form.Label>Game lookup</Form.Label>
            <Form.Control
              size="sm"
              type="search"
              placeholder="Team or starter"
              value={searchTerm}
              onChange={(event) => updateParams({ q: event.target.value })}
            />
          </Form.Group>
        </div>

        <div className="scenario-simulator-game-list mt-3">
          {filteredPredictions.map((prediction) => (
            <button
              key={prediction.game_pk}
              type="button"
              className={`scenario-simulator-game-chip${Number(prediction.game_pk) === Number(selectedPrediction?.game_pk) ? ' scenario-simulator-game-chip--active' : ''}`}
              onClick={() => updateParams({ gamePk: prediction.game_pk })}
            >
              <span className="fw-semibold">
                {prediction.away_team_name} @ {prediction.home_team_name}
              </span>
              <span className="text-muted small">
                {' '}
                · {prediction.predicted_winner} · {prediction.confidence_tier || 'LOW'}
              </span>
            </button>
          ))}
        </div>
      </AnalyticsPanel>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-3">Loading scenario inputs…</p>
        </div>
      ) : error ? (
        <Alert variant="warning">{error}</Alert>
      ) : !selectedPrediction ? (
        <Alert variant="info">Choose a predicted game to start simulating.</Alert>
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Baseline home win"
                value={formatPercent(selectedPrediction.home_win_probability)}
                meta={`${selectedPrediction.home_team_name} vs ${selectedPrediction.away_team_name}`}
                accent="blue"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Scenario home win"
                value={formatPercent(adjustedHomeProbability)}
                meta={`Away win ${formatPercent(1 - adjustedHomeProbability)}`}
                accent="green"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Lineup model delta"
                value={formatSignedPoints(lineupModelAdjustment.winProbabilityPoints)}
                meta={`${selectedPrediction.home_team_name} ${lineupModelAdjustment.homeDelta >= 0 ? '+' : ''}${lineupModelAdjustment.homeDelta.toFixed(2)} slot value / ${selectedPrediction.away_team_name} ${lineupModelAdjustment.awayDelta >= 0 ? '+' : ''}${lineupModelAdjustment.awayDelta.toFixed(2)} slot value`}
                accent="gold"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="One-run rate"
                value={formatPercent(simulation.closeGameRate)}
                meta={`${simulation.simulations.toLocaleString()} simulated games`}
                accent="purple"
              />
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={7}>
              <AnalyticsPanel
                title="Scenario adjustments"
                subtitle="Manual sliders still work, but the custom lineup editor now feeds a separate slot-value model automatically."
              >
                <div className="scenario-simulator-sliders">
                  {scenarioControls.map((control) => (
                    <div key={control.key} className="scenario-simulator-slider">
                      <div className="d-flex justify-content-between gap-2 align-items-start">
                        <div>
                          <div className="fw-semibold">{control.label}</div>
                          <div className="text-muted small">{control.hint}</div>
                        </div>
                        <div className="scenario-simulator-slider-value">
                          {formatSignedPoints(control.key === 'lineup' ? manualLineupAdjustment : adjustments[control.key])}
                        </div>
                      </div>
                      <Form.Range
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={control.key === 'lineup' ? manualLineupAdjustment : adjustments[control.key]}
                        onChange={(event) => updateParams({ [control.key]: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={5}>
              <AnalyticsPanel
                title="Scenario ledger"
                subtitle="Baseline inputs, lineup timing, and current matchup framing."
              >
                <div className="scenario-simulator-ledger">
                  <div><span className="scenario-simulator-ledger-label">Matchup</span>{selectedPrediction.away_team_name} @ {selectedPrediction.home_team_name}</div>
                  <div><span className="scenario-simulator-ledger-label">Predicted winner</span>{selectedPrediction.predicted_winner}</div>
                  <div><span className="scenario-simulator-ledger-label">Confidence</span>{selectedPrediction.confidence_tier || 'LOW'}</div>
                  <div><span className="scenario-simulator-ledger-label">Lineups</span>{selectedPrediction.lineup_confirmed ? 'Confirmed from pregame pipeline' : 'Projected from roster + handedness splits'}</div>
                  <div><span className="scenario-simulator-ledger-label">Starters</span>{selectedPrediction.away_starter_name || 'TBD'} ({describePitcherHand(selectedPrediction.away_starter_hand)}) vs {selectedPrediction.home_starter_name || 'TBD'} ({describePitcherHand(selectedPrediction.home_starter_hand)})</div>
                  <div><span className="scenario-simulator-ledger-label">Game date</span>{formatDateLabel(selectedDate)}</div>
                  <div><span className="scenario-simulator-ledger-label">Custom lineup model</span>{formatSignedPoints(lineupModelAdjustment.winProbabilityPoints)} before manual lineup slider overrides</div>
                  <div className="text-muted small pt-2">
                    Heuristic Monte Carlo seeded from the adjusted win probability. Slot values and player props are matchup heuristics, not retrained model outputs yet.
                  </div>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <AnalyticsPanel
            title="Lineup lab"
            subtitle={`Move hitters around or swap in different bats from the active roster. ${selectedPrediction.home_team_name} hitters are scored vs ${describePitcherHand(selectedPrediction.away_starter_hand)}, and ${selectedPrediction.away_team_name} hitters vs ${describePitcherHand(selectedPrediction.home_starter_hand)}.`}
            className="mb-4"
          >
            {lineupLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted mt-3 mb-0">Building slot-value projections from roster and split data…</p>
              </div>
            ) : lineupError ? (
              <Alert variant="warning" className="mb-0">{lineupError}</Alert>
            ) : !lineupWorkbench ? (
              <Alert variant="info" className="mb-0">Select a game with team context to unlock lineup editing.</Alert>
            ) : (
              <>
                <Row className="g-4">
                  <Col xl={6}>
                    {renderLineupEditor(
                      'homeSlots',
                      selectedPrediction.home_team_name,
                      lineupWorkbench.homeSlots,
                      homeCandidates,
                      homeLineupAnalysis,
                      describePitcherHand(selectedPrediction.away_starter_hand)
                    )}
                  </Col>
                  <Col xl={6}>
                    {renderLineupEditor(
                      'awaySlots',
                      selectedPrediction.away_team_name,
                      lineupWorkbench.awaySlots,
                      awayCandidates,
                      awayLineupAnalysis,
                      describePitcherHand(selectedPrediction.home_starter_hand)
                    )}
                  </Col>
                </Row>

                <div className="scenario-simulator-lineup-summary">
                  <div className="scenario-simulator-summary-pill">
                    Home top 3 {homeLineupAnalysis.top3Value.toFixed(2)} / middle 3 {homeLineupAnalysis.middle3Value.toFixed(2)} / bottom 3 {homeLineupAnalysis.bottom3Value.toFixed(2)}
                  </div>
                  <div className="scenario-simulator-summary-pill">
                    Away top 3 {awayLineupAnalysis.top3Value.toFixed(2)} / middle 3 {awayLineupAnalysis.middle3Value.toFixed(2)} / bottom 3 {awayLineupAnalysis.bottom3Value.toFixed(2)}
                  </div>
                  <div className="scenario-simulator-summary-pill scenario-simulator-summary-pill--emphasis">
                    Custom lineup shift {formatSignedPoints(lineupModelAdjustment.winProbabilityPoints)}
                  </div>
                </div>
              </>
            )}
          </AnalyticsPanel>

          <Row className="g-4 mb-4">
            <Col xl={6}>
              <AnalyticsPanel
                title="Win distribution"
                subtitle="Scenario-adjusted home/away result share after lineup edits and manual sliders."
              >
                <div className="scenario-simulator-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={[
                        { side: selectedPrediction.home_team_name, share: Number((simulation.homeWinRate * 100).toFixed(1)) },
                        { side: selectedPrediction.away_team_name, share: Number((simulation.awayWinRate * 100).toFixed(1)) },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                      <XAxis dataKey="side" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="share" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={6}>
              <AnalyticsPanel
                title="Margin distribution"
                subtitle="Heuristic margin buckets from the scenario simulation."
              >
                <div className="scenario-simulator-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={simulation.bins}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <AnalyticsPanel
            title="Player matchup projections"
            subtitle="Per-player expected output from the edited lineups, built from season handedness splits and slot plate-appearance expectations."
            className="mb-4"
          >
            {projectionRows.length === 0 ? (
              <Alert variant="info" className="mb-0">Player-level projections appear once roster and split data are available.</Alert>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle scenario-simulator-player-table">
                  <thead className="table-light">
                    <tr>
                      <th>Team</th>
                      <th>Slot</th>
                      <th>Player</th>
                      <th>Split</th>
                      <th>OPS</th>
                      <th>Hit</th>
                      <th>TB</th>
                      <th>HR</th>
                      <th>K</th>
                      <th>BB</th>
                      <th>Slot value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectionRows.map((row) => (
                      <tr key={`${row.teamLabel}-${row.slot}-${row.playerId}`}>
                        <td className="fw-semibold">{row.teamLabel}</td>
                        <td>{row.slot}</td>
                        <td>{row.playerName}</td>
                        <td>{row.splitLabel}</td>
                        <td>{row.ops.toFixed(3).replace(/^0/, '')}</td>
                        <td>{formatPercent(row.hitProbability)}</td>
                        <td>{row.expectedTotalBases.toFixed(2)}</td>
                        <td>{formatPercent(row.homeRunProbability)}</td>
                        <td>{formatPercent(row.strikeoutProbability)}</td>
                        <td>{formatPercent(row.walkProbability)}</td>
                        <td>{row.slotValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Adjustment summary"
            subtitle="Manual sliders plus the lineup model's slot-value delta."
          >
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Adjustment</th>
                    <th>Applied</th>
                    <th>Model context</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fw-semibold">Custom lineup model</td>
                    <td>{formatSignedPoints(lineupModelAdjustment.winProbabilityPoints)}</td>
                    <td>
                      Home slot value {homeLineupAnalysis.totalSlotValue.toFixed(2)} vs away {awayLineupAnalysis.totalSlotValue.toFixed(2)}
                    </td>
                  </tr>
                  {scenarioControls.map((control) => (
                    <tr key={control.key}>
                      <td className="fw-semibold">{control.label}</td>
                      <td>{formatSignedPoints(control.key === 'lineup' ? manualLineupAdjustment : adjustments[control.key])}</td>
                      <td>{control.hint}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </AnalyticsPanel>
        </>
      )}
    </Container>
  );
}

export default ScenarioSimulatorPage;
