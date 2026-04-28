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
import { downloadCsv, formatPercent, mergeSearchParams } from '../utils/analytics';
import {
  applyScenarioAdjustments,
  formatSignedPoints,
  getScenarioContext,
  simulateMatchupDistribution,
} from '../utils/scenarioSimulator';
import './styles/ScenarioSimulatorPage.css';

function formatDateLabel(value) {
  if (!value) {
    return '';
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ScenarioSimulatorPage() {
  const today = new Date().toISOString().split('T')[0];
  const [searchParams, setSearchParams] = useSearchParams();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedDate = searchParams.get('date') || today;
  const searchTerm = searchParams.get('q') || '';
  const gamePk = Number(searchParams.get('gamePk') || 0);
  const simulationCount = Number(searchParams.get('sims') || 5000);
  const starter = Number(searchParams.get('starter') || 0);
  const lineup = Number(searchParams.get('lineup') || 0);
  const bullpen = Number(searchParams.get('bullpen') || 0);
  const form = Number(searchParams.get('form') || 0);
  const context = Number(searchParams.get('context') || 0);

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

  const adjustments = useMemo(
    () => ({ starter, lineup, bullpen, form, context }),
    [bullpen, context, form, lineup, starter]
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
          Math.round((starter + lineup + bullpen + form + context) * 10)
      ),
    [adjustedHomeProbability, bullpen, context, form, lineup, selectedPrediction, simulationCount, starter]
  );

  const scenarioControls = useMemo(
    () => getScenarioContext(selectedPrediction),
    [selectedPrediction]
  );

  const handleExport = () => {
    downloadCsv(
      `scenario-simulator-${selectedPrediction?.game_pk || 'matchup'}-${selectedDate}.csv`,
      [
        { label: 'Bin', value: (row) => row.label },
        { label: 'Count', value: (row) => row.count },
        { label: 'Share', value: (row) => row.share },
      ],
      simulation.bins
    );
  };

  return (
    <Container fluid="xl" className="scenario-simulator-page py-4 px-3 px-md-4">
      <div className="scenario-simulator-header mb-4">
        <div>
          <div className="scenario-simulator-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Scenario Simulator</h2>
          <p className="text-muted mb-0">
            Stress-test matchup assumptions and turn a single forecast into a heuristic outcome distribution.
          </p>
        </div>
        <div className="scenario-simulator-actions">
          <Button as={Link} to="/comparison-workbench" variant="outline-secondary" size="sm">
            Back to Workbench
          </Button>
          <SaveResearchViewButton
            label="Scenario Simulator"
            hint="What-if matchup adjustments and Monte Carlo distribution"
          />
          <Button variant="outline-secondary" size="sm" onClick={() => updateParams({ starter: null, lineup: null, bullpen: null, form: null, context: null })}>
            Reset adjustments
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!selectedPrediction}>
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
                label="Average margin"
                value={`${simulation.averageMargin > 0 ? '+' : ''}${simulation.averageMargin.toFixed(1)}`}
                meta={`Positive favors ${selectedPrediction.home_team_name}`}
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
                subtitle="Each slider is a home-team edge in win-probability points."
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
                          {formatSignedPoints(adjustments[control.key])}
                        </div>
                      </div>
                      <Form.Range
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={adjustments[control.key]}
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
                subtitle="Baseline inputs and current matchup framing."
              >
                <div className="scenario-simulator-ledger">
                  <div><span className="scenario-simulator-ledger-label">Matchup</span>{selectedPrediction.away_team_name} @ {selectedPrediction.home_team_name}</div>
                  <div><span className="scenario-simulator-ledger-label">Predicted winner</span>{selectedPrediction.predicted_winner}</div>
                  <div><span className="scenario-simulator-ledger-label">Confidence</span>{selectedPrediction.confidence_tier || 'LOW'}</div>
                  <div><span className="scenario-simulator-ledger-label">Lineups</span>{selectedPrediction.lineup_confirmed ? 'Confirmed' : 'Probable'}</div>
                  <div><span className="scenario-simulator-ledger-label">Starters</span>{selectedPrediction.away_starter_name || 'TBD'} vs {selectedPrediction.home_starter_name || 'TBD'}</div>
                  <div><span className="scenario-simulator-ledger-label">Game date</span>{formatDateLabel(selectedDate)}</div>
                  <div className="text-muted small pt-2">
                    Heuristic Monte Carlo seeded from the adjusted win probability, not a full run-expectancy model.
                  </div>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={6}>
              <AnalyticsPanel
                title="Win distribution"
                subtitle="Scenario-adjusted home/away result share."
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
            title="Adjustment summary"
            subtitle="Current scenario assumptions translated into home-team win-probability points."
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
                  {scenarioControls.map((control) => (
                    <tr key={control.key}>
                      <td className="fw-semibold">{control.label}</td>
                      <td>{formatSignedPoints(adjustments[control.key])}</td>
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
