import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  formatDecimal,
  formatEdgePoints,
  formatPercent,
  mergeSearchParams,
  subtractDaysFromIso,
} from '../utils/analytics';
import {
  buildCalibrationBins,
  buildConfidenceBreakdown,
  buildDailyDiagnosticsTrend,
  filterPredictionDiagnostics,
  normalizeConfidenceTier,
  summarizePredictionDiagnostics,
} from '../utils/predictionDiagnostics';
import './styles/PredictionDiagnosticsPage.css';

const WINDOW_OPTIONS = [7, 14, 30, 60, 90];

function formatDiagnosticsDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function sortDiagnosticsRows(rows, sortMode) {
  const next = [...rows];

  if (sortMode === 'edge') {
    return next.sort((left, right) => Number(right.edge || 0) - Number(left.edge || 0));
  }

  if (sortMode === 'confidence') {
    const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return next.sort(
      (left, right) =>
        (rank[normalizeConfidenceTier(right.confidenceTier)] || 1) -
        (rank[normalizeConfidenceTier(left.confidenceTier)] || 1)
    );
  }

  return next.sort((left, right) => {
    const dateCompare = String(right.gameDate).localeCompare(String(left.gameDate));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return Number(right.gamePk) - Number(left.gamePk);
  });
}

function PredictionDiagnosticsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [shareState, setShareState] = useState('');

  const windowDays = Math.max(7, Number(searchParams.get('window') || 30));
  const endDate = searchParams.get('endDate') || today;
  const confidence = searchParams.get('confidence') || 'all';
  const lineups = searchParams.get('lineups') || 'all';
  const sortMode = searchParams.get('sort') || 'recent';
  const searchTerm = searchParams.get('search') || '';
  const startDate = subtractDaysFromIso(endDate, windowDays - 1);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getPredictionDiagnostics({ startDate, endDate });
      setDiagnostics(data?.diagnostics || []);
    } catch (loadError) {
      setDiagnostics([]);
      setError('Could not load prediction diagnostics for the selected range.');
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  useEffect(() => {
    if (!shareState) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setShareState(''), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [shareState]);

  const filteredDiagnostics = useMemo(
    () =>
      filterPredictionDiagnostics(diagnostics, {
        confidence,
        lineups,
        searchTerm,
      }),
    [confidence, diagnostics, lineups, searchTerm]
  );

  const summary = useMemo(
    () => summarizePredictionDiagnostics(filteredDiagnostics),
    [filteredDiagnostics]
  );
  const calibrationData = useMemo(
    () => buildCalibrationBins(filteredDiagnostics),
    [filteredDiagnostics]
  );
  const trendData = useMemo(
    () => buildDailyDiagnosticsTrend(filteredDiagnostics),
    [filteredDiagnostics]
  );
  const confidenceBreakdown = useMemo(
    () => buildConfidenceBreakdown(filteredDiagnostics),
    [filteredDiagnostics]
  );
  const sortedRows = useMemo(
    () => sortDiagnosticsRows(filteredDiagnostics, sortMode),
    [filteredDiagnostics, sortMode]
  );

  const handleParamUpdate = (updates) => {
    setSearchParams(mergeSearchParams(searchParams, updates), { replace: true });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState('Share link copied');
    } catch {
      setShareState('Could not copy share link');
    }
  };

  const handleExport = () => {
    downloadCsv(
      `prediction-diagnostics-${startDate}-through-${endDate}.csv`,
      [
        { label: 'Game Date', value: (row) => row.gameDate },
        { label: 'Matchup', value: (row) => `${row.awayTeamName} @ ${row.homeTeamName}` },
        { label: 'Predicted Winner', value: (row) => row.predictedWinner },
        { label: 'Actual Winner', value: (row) => row.actualWinner },
        { label: 'Correct', value: (row) => (row.correct ? 'Yes' : 'No') },
        { label: 'Confidence Tier', value: (row) => row.confidenceTier },
        { label: 'Predicted Win Probability', value: (row) => row.predictedWinProbability },
        { label: 'Edge', value: (row) => row.edge },
        { label: 'Brier Score', value: (row) => row.brierScore },
        { label: 'Log Loss', value: (row) => row.logLoss },
        { label: 'Lineup Confirmed', value: (row) => (row.lineupConfirmed ? 'Yes' : 'No') },
        { label: 'Model Version', value: (row) => row.modelVersion },
        { label: 'Score', value: (row) => `${row.awayScore}-${row.homeScore}` },
      ],
      sortedRows
    );
  };

  return (
    <Container fluid="xl" className="prediction-diagnostics-page py-4 px-3 px-md-4">
      <div className="prediction-diagnostics-header mb-4">
        <div>
          <div className="prediction-diagnostics-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Prediction Diagnostics</h2>
          <p className="text-muted mb-0">
            Audit model performance with calibration, rolling results, confidence-tier outcomes,
            and exportable postgame review.
          </p>
        </div>
        <div className="prediction-diagnostics-header-actions">
          <Button as={Link} to="/predictions" variant="outline-secondary" size="sm">
            Back to Predictions
          </Button>
          <SaveResearchViewButton
            label="Prediction Diagnostics"
            hint="Calibration, trend, and postgame review filters"
          />
          <Button variant="outline-primary" size="sm" onClick={handleShare}>
            Share view
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!sortedRows.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <AnalyticsPanel
        title="Diagnostics filters"
        subtitle={`Evaluating completed games from ${startDate} through ${endDate}.`}
        actions={
          shareState ? <Badge bg="light" text="dark">{shareState}</Badge> : null
        }
        className="mb-4"
      >
        <div className="prediction-diagnostics-toolbar">
          <Form.Group controlId="diagnostics-window">
            <Form.Label>Window</Form.Label>
            <Form.Select
              size="sm"
              value={windowDays}
              onChange={(event) => handleParamUpdate({ window: event.target.value })}
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Last {option} days
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="diagnostics-end-date">
            <Form.Label>End date</Form.Label>
            <Form.Control
              size="sm"
              type="date"
              max={today}
              value={endDate}
              onChange={(event) => handleParamUpdate({ endDate: event.target.value })}
            />
          </Form.Group>
          <Form.Group controlId="diagnostics-confidence">
            <Form.Label>Confidence</Form.Label>
            <Form.Select
              size="sm"
              value={confidence}
              onChange={(event) => handleParamUpdate({ confidence: event.target.value })}
            >
              <option value="all">All tiers</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="diagnostics-lineups">
            <Form.Label>Lineups</Form.Label>
            <Form.Select
              size="sm"
              value={lineups}
              onChange={(event) => handleParamUpdate({ lineups: event.target.value })}
            >
              <option value="all">All</option>
              <option value="confirmed">Confirmed only</option>
              <option value="probable">Probables only</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="diagnostics-sort">
            <Form.Label>Review sort</Form.Label>
            <Form.Select
              size="sm"
              value={sortMode}
              onChange={(event) => handleParamUpdate({ sort: event.target.value })}
            >
              <option value="recent">Most recent</option>
              <option value="edge">Strongest edge</option>
              <option value="confidence">Confidence tier</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="diagnostics-search" className="prediction-diagnostics-search">
            <Form.Label>Search</Form.Label>
            <Form.Control
              size="sm"
              type="search"
              placeholder="Team, starter, model"
              value={searchTerm}
              onChange={(event) => handleParamUpdate({ search: event.target.value })}
            />
          </Form.Group>
        </div>
      </AnalyticsPanel>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-3">Loading prediction diagnostics…</p>
        </div>
      ) : error ? (
        <Alert variant="warning">{error}</Alert>
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} md={4} xl={2}>
              <AnalyticsSummaryCard
                label="Games"
                value={summary.games}
                meta="Completed predictions in scope"
                accent="blue"
              />
            </Col>
            <Col xs={6} md={4} xl={2}>
              <AnalyticsSummaryCard
                label="Accuracy"
                value={formatPercent(summary.accuracy)}
                meta="Predicted winner vs actual winner"
                accent="green"
              />
            </Col>
            <Col xs={6} md={4} xl={2}>
              <AnalyticsSummaryCard
                label="Avg edge"
                value={formatEdgePoints(summary.avgEdge)}
                meta="Average win-probability spread"
                accent="gold"
              />
            </Col>
            <Col xs={6} md={4} xl={2}>
              <AnalyticsSummaryCard
                label="Brier"
                value={formatDecimal(summary.brierScore)}
                meta="Lower is better"
                accent="purple"
              />
            </Col>
            <Col xs={6} md={4} xl={2}>
              <AnalyticsSummaryCard
                label="Log loss"
                value={formatDecimal(summary.logLoss)}
                meta="Penalty on confidence misses"
                accent="slate"
              />
            </Col>
            <Col xs={6} md={4} xl={2}>
              <AnalyticsSummaryCard
                label="Confirmed lineups"
                value={formatPercent(summary.confirmedLineupRate)}
                meta="Share of completed games with posted lineups"
                accent="blue"
              />
            </Col>
          </Row>

          {filteredDiagnostics.length === 0 ? (
            <Alert variant="info">
              No completed prediction results match the active diagnostics filters.
            </Alert>
          ) : (
            <>
              <Row className="g-4 mb-4">
                <Col xl={7}>
                  <AnalyticsPanel
                    title="Rolling diagnostics trend"
                    subtitle="Daily accuracy and average edge over the selected window."
                  >
                    <div className="prediction-diagnostics-chart">
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                          <XAxis dataKey="shortDate" />
                          <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
                          <Tooltip
                            formatter={(value, name) => [
                              name === 'Avg edge' ? formatEdgePoints(value) : formatPercent(value),
                              name,
                            ]}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#0d6efd" strokeWidth={2.5} />
                          <Line type="monotone" dataKey="avgEdge" name="Avg edge" stroke="#f59e0b" strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </AnalyticsPanel>
                </Col>
                <Col xl={5}>
                  <AnalyticsPanel
                    title="Calibration"
                    subtitle="Predicted winner probability against observed win rate."
                  >
                    <div className="prediction-diagnostics-chart">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={calibrationData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                          <XAxis dataKey="label" />
                          <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
                          <Tooltip
                            formatter={(value, name) => [
                              formatPercent(value),
                              name === 'predictedRate' ? 'Predicted rate' : 'Observed rate',
                            ]}
                            labelFormatter={(value) => `Bucket ${value}`}
                          />
                          <Legend />
                          <Bar dataKey="predictedRate" name="Predicted rate" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="observedRate" name="Observed rate" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </AnalyticsPanel>
                </Col>
              </Row>

              <Row className="g-4 mb-4">
                <Col xl={5}>
                  <AnalyticsPanel
                    title="Confidence-tier outcomes"
                    subtitle="How the model performed by public confidence band."
                  >
                    <div className="table-responsive">
                      <Table hover className="mb-0 align-middle prediction-diagnostics-table">
                        <thead className="table-light">
                          <tr>
                            <th>Tier</th>
                            <th>Games</th>
                            <th>Accuracy</th>
                            <th>Avg edge</th>
                            <th>Brier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confidenceBreakdown.map((entry) => (
                            <tr key={entry.tier}>
                              <td className="fw-semibold">
                                <Badge bg={entry.tier === 'HIGH' ? 'success' : entry.tier === 'MEDIUM' ? 'warning' : 'secondary'}>
                                  {entry.tier}
                                </Badge>
                              </td>
                              <td>{entry.games}</td>
                              <td>{formatPercent(entry.accuracy)}</td>
                              <td>{formatEdgePoints(entry.avgEdge)}</td>
                              <td>{formatDecimal(entry.brierScore)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </AnalyticsPanel>
                </Col>
                <Col xl={7}>
                  <AnalyticsPanel
                    title="Postgame review"
                    subtitle="Searchable audit table for recent finalized predictions."
                    actions={
                      <div className="text-muted small">
                        {sortedRows.length} reviewed game{sortedRows.length === 1 ? '' : 's'}
                      </div>
                    }
                  >
                    <div className="table-responsive prediction-diagnostics-review-wrap">
                      <Table hover className="mb-0 align-middle prediction-diagnostics-table">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Matchup</th>
                            <th>Prediction</th>
                            <th>Actual</th>
                            <th>Edge</th>
                            <th>Tier</th>
                            <th>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRows.slice(0, 24).map((row) => (
                            <tr key={row.gamePk}>
                              <td className="text-nowrap">{formatDiagnosticsDate(row.gameDate)}</td>
                              <td>
                                <div className="fw-semibold">
                                  <Link to={`/game/${row.gamePk}`} className="prediction-diagnostics-link">
                                    {row.awayTeamName} @ {row.homeTeamName}
                                  </Link>
                                </div>
                                <div className="text-muted small">
                                  {row.awayStarterName || 'TBD'} vs {row.homeStarterName || 'TBD'} · {row.modelVersion}
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold">{row.predictedWinner}</div>
                                <div className="text-muted small">
                                  {formatPercent(row.predictedWinProbability)}
                                  {row.lineupConfirmed ? ' · lineups in' : ' · probable'}
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold">{row.actualWinner}</div>
                                <div className="text-muted small">
                                  {row.awayScore}-{row.homeScore}
                                </div>
                              </td>
                              <td>{formatEdgePoints(row.edge)}</td>
                              <td>
                                <Badge bg={row.confidenceTier === 'HIGH' ? 'success' : row.confidenceTier === 'MEDIUM' ? 'warning' : 'secondary'}>
                                  {row.confidenceTier}
                                </Badge>
                              </td>
                              <td>
                                <Badge bg={row.correct ? 'success' : 'danger'}>
                                  {row.correct ? 'Correct' : 'Miss'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </AnalyticsPanel>
                </Col>
              </Row>
            </>
          )}
        </>
      )}
    </Container>
  );
}

export default PredictionDiagnosticsPage;

