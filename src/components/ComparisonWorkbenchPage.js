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
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AnalyticsPanel from './analytics/AnalyticsPanel';
import AnalyticsSummaryCard from './analytics/AnalyticsSummaryCard';
import SaveResearchViewButton from './analytics/SaveResearchViewButton';
import apiService from '../services/api';
import { AVAILABLE_SEASONS, SEASONS } from '../config/constants';
import { downloadCsv, mergeSearchParams } from '../utils/analytics';
import {
  buildPercentileChartData,
  buildWorkbenchEntities,
  findClosestMatches,
} from '../utils/comparisonWorkbench';
import './styles/ComparisonWorkbenchPage.css';

const MAX_SELECTIONS = 5;

function ComparisonWorkbenchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentRows, setCurrentRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const entityType = searchParams.get('entityType') || 'player';
  const group = searchParams.get('group') || 'hitting';
  const season = Number(searchParams.get('season') || SEASONS.CURRENT);
  const searchTerm = searchParams.get('q') || '';
  const focusIdParam = searchParams.get('focus') || '';
  const selectedIds = useMemo(
    () => (searchParams.get('ids') || '').split(',').map((value) => value.trim()).filter(Boolean),
    [searchParams]
  );

  const updateParams = (updates) => {
    setSearchParams(mergeSearchParams(searchParams, updates), { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const currentYear = Number(season);
    const previousYear = currentYear - 1;

    const getCurrentRequest = () => {
      if (entityType === 'team') {
        return group === 'pitching'
          ? apiService.getTeamPitching(currentYear)
          : apiService.getTeamBatting(currentYear);
      }

      return group === 'pitching'
        ? apiService.getPlayerPitching(currentYear, { limit: 1000 })
        : apiService.getPlayerBatting(currentYear, { limit: 1000 });
    };

    const getPreviousRequest = () => {
      if (previousYear < SEASONS.MIN) {
        return Promise.resolve([]);
      }

      if (entityType === 'team') {
        return group === 'pitching'
          ? apiService.getTeamPitching(previousYear)
          : apiService.getTeamBatting(previousYear);
      }

      return group === 'pitching'
        ? apiService.getPlayerPitching(previousYear, { limit: 1000 })
        : apiService.getPlayerBatting(previousYear, { limit: 1000 });
    };

    try {
      const [currentData, previousData] = await Promise.all([
        getCurrentRequest(),
        getPreviousRequest().catch(() => []),
      ]);

      setCurrentRows(Array.isArray(currentData) ? currentData : []);
      setPreviousRows(Array.isArray(previousData) ? previousData : []);
    } catch (nextError) {
      setCurrentRows([]);
      setPreviousRows([]);
      setError('Could not load comparison workbench data.');
    } finally {
      setLoading(false);
    }
  }, [entityType, group, season]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allEntities = useMemo(
    () => buildWorkbenchEntities(currentRows, previousRows, entityType, group),
    [currentRows, entityType, group, previousRows]
  );

  const entityMap = useMemo(
    () => new Map(allEntities.map((entity) => [entity.id, entity])),
    [allEntities]
  );

  const selectedEntities = useMemo(
    () => selectedIds.map((id) => entityMap.get(id)).filter(Boolean),
    [entityMap, selectedIds]
  );

  const visibleEntities = useMemo(() => {
    if (!searchTerm.trim()) {
      return allEntities.slice(0, 12);
    }

    const normalized = searchTerm.trim().toLowerCase();
    return allEntities
      .filter((entity) =>
        `${entity.label} ${entity.shortLabel} ${entity.subtitle}`.toLowerCase().includes(normalized)
      )
      .slice(0, 12);
  }, [allEntities, searchTerm]);

  const focusEntity = useMemo(
    () => selectedEntities.find((entity) => entity.id === focusIdParam) || selectedEntities[0] || null,
    [focusIdParam, selectedEntities]
  );

  const percentileChartData = useMemo(
    () => buildPercentileChartData(selectedEntities, entityType, group),
    [entityType, group, selectedEntities]
  );

  const closestMatches = useMemo(
    () => findClosestMatches(allEntities, focusEntity),
    [allEntities, focusEntity]
  );

  const leaderboardChartData = useMemo(
    () =>
      [...selectedEntities]
        .sort((left, right) => (right.compositePercentile || 0) - (left.compositePercentile || 0))
        .map((entity) => ({
          name: entity.shortLabel,
          compositePercentile: entity.compositePercentile,
        })),
    [selectedEntities]
  );

  const toggleEntity = (entityId) => {
    const nextIds = selectedIds.includes(entityId)
      ? selectedIds.filter((id) => id !== entityId)
      : [...selectedIds, entityId].slice(0, MAX_SELECTIONS);
    const nextFocus = nextIds.includes(focusEntity?.id) ? focusEntity?.id : nextIds[0] || null;
    updateParams({
      ids: nextIds.join(','),
      focus: nextFocus,
    });
  };

  const handleExport = () => {
    const rows = selectedEntities.flatMap((entity) =>
      entity.metrics.map((metric) => ({
        entity: entity.label,
        entityId: entity.id,
        metric: metric.label,
        value: metric.formattedValue,
        percentile: metric.percentile,
        zScore: metric.zScore,
        previousValue: metric.formattedPreviousValue,
        delta: metric.formattedDelta,
      }))
    );

    downloadCsv(
      `comparison-workbench-${entityType}-${group}-${season}.csv`,
      [
        { label: 'Entity', value: (row) => row.entity },
        { label: 'Entity ID', value: (row) => row.entityId },
        { label: 'Metric', value: (row) => row.metric },
        { label: 'Value', value: (row) => row.value },
        { label: 'Percentile', value: (row) => row.percentile ?? '' },
        { label: 'Z-Score', value: (row) => row.zScore ?? '' },
        { label: 'Previous Season', value: (row) => row.previousValue },
        { label: 'Delta', value: (row) => row.delta },
      ],
      rows
    );
  };

  return (
    <Container fluid="xl" className="comparison-workbench-page py-4 px-3 px-md-4">
      <div className="comparison-workbench-header mb-4">
        <div>
          <div className="comparison-workbench-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Comparison Workbench</h2>
          <p className="text-muted mb-0">
            Compare teams or players with league-relative percentiles, z-scores, season deltas, and similarity comps.
          </p>
        </div>
        <div className="comparison-workbench-actions">
          <Button as={Link} to="/statcast-lab" variant="outline-secondary" size="sm">
            Back to Statcast Lab
          </Button>
          <SaveResearchViewButton
            label="Comparison Workbench"
            hint="League-relative percentiles, deltas, and comps"
          />
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!selectedEntities.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <AnalyticsPanel
        title="Workbench controls"
        subtitle="Select a comparison pool, season, and entity set. Focus drives the delta and comps panels."
        className="mb-4"
      >
        <div className="comparison-workbench-toolbar">
          <Form.Group>
            <Form.Label>Entity</Form.Label>
            <Form.Select
              size="sm"
              value={entityType}
              onChange={(event) =>
                updateParams({
                  entityType: event.target.value,
                  ids: null,
                  focus: null,
                  q: null,
                })
              }
            >
              <option value="player">Player</option>
              <option value="team">Team</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Group</Form.Label>
            <Form.Select
              size="sm"
              value={group}
              onChange={(event) =>
                updateParams({
                  group: event.target.value,
                  ids: null,
                  focus: null,
                })
              }
            >
              <option value="hitting">Hitting</option>
              <option value="pitching">Pitching</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Season</Form.Label>
            <Form.Select
              size="sm"
              value={season}
              onChange={(event) =>
                updateParams({
                  season: event.target.value,
                  ids: null,
                  focus: null,
                })
              }
            >
              {AVAILABLE_SEASONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="comparison-workbench-search">
            <Form.Label>{entityType === 'team' ? 'Team lookup' : 'Player lookup'}</Form.Label>
            <Form.Control
              size="sm"
              type="search"
              value={searchTerm}
              placeholder={entityType === 'team' ? 'Search team' : 'Search player or club'}
              onChange={(event) => updateParams({ q: event.target.value })}
            />
          </Form.Group>
        </div>

        <div className="comparison-workbench-search-results mt-3">
          {visibleEntities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              className={`comparison-workbench-chip${selectedIds.includes(entity.id) ? ' comparison-workbench-chip--active' : ''}`}
              onClick={() => toggleEntity(entity.id)}
            >
              {entity.logoUrl ? (
                <img src={entity.logoUrl} alt="" className="comparison-workbench-chip-logo" />
              ) : null}
              <span className="fw-semibold">{entity.label}</span>
              {entity.subtitle ? <span className="text-muted small"> · {entity.subtitle}</span> : null}
            </button>
          ))}
        </div>

        {selectedEntities.length ? (
          <div className="comparison-workbench-selected mt-3">
            <span className="text-muted small">
              {selectedEntities.length} of {MAX_SELECTIONS} selected
            </span>
            <div className="comparison-workbench-selected-list">
              {selectedEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={`comparison-workbench-selected-item${focusEntity?.id === entity.id ? ' comparison-workbench-selected-item--focus' : ''}`}
                  onClick={() => updateParams({ focus: entity.id })}
                >
                  <span>{entity.shortLabel}</span>
                  <span className="comparison-workbench-selected-remove" onClick={(event) => {
                    event.stopPropagation();
                    toggleEntity(entity.id);
                  }}>
                    x
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </AnalyticsPanel>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-3">Loading comparison workbench…</p>
        </div>
      ) : error ? (
        <Alert variant="warning">{error}</Alert>
      ) : !currentRows.length ? (
        <Alert variant="info">No leaderboard rows are available for this workbench view.</Alert>
      ) : !selectedEntities.length ? (
        <Alert variant="info">Select at least one {entityType} to start comparing.</Alert>
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Focus entity"
                value={focusEntity?.shortLabel || '—'}
                meta={focusEntity?.subtitle || focusEntity?.label || ''}
                accent="blue"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Composite percentile"
                value={focusEntity?.compositePercentile != null ? `${focusEntity.compositePercentile}th` : '—'}
                meta="Average across the current metric set"
                accent="green"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Average z-score"
                value={focusEntity?.averageZScore != null ? focusEntity.averageZScore.toFixed(2) : '—'}
                meta={focusEntity?.topMetric ? `Top metric ${focusEntity.topMetric.label}` : 'League-relative score'}
                accent="gold"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Closest comp"
                value={closestMatches[0]?.shortLabel || '—'}
                meta={closestMatches[0] ? `Distance ${closestMatches[0].similarityDistance}` : 'No comp available'}
                accent="purple"
              />
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={7}>
              <AnalyticsPanel
                title="Percentile profile"
                subtitle="League-relative percentile shape for the selected entity set."
              >
                <div className="comparison-workbench-chart">
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart data={percentileChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      {selectedEntities.map((entity, index) => (
                        <Radar
                          key={entity.id}
                          name={entity.shortLabel}
                          dataKey={`entity_${entity.id}`}
                          stroke={RADAR_COLORS[index % RADAR_COLORS.length]}
                          fill={RADAR_COLORS[index % RADAR_COLORS.length]}
                          fillOpacity={0.14}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={5}>
              <AnalyticsPanel
                title="Composite leaderboard"
                subtitle="Quick ranking of the selected entities within the chosen comparison pool."
              >
                <div className="comparison-workbench-chart">
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={leaderboardChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip />
                      <Bar dataKey="compositePercentile" name="Composite percentile" fill="#2563eb" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={7}>
              <AnalyticsPanel
                title="Selected scorecard"
                subtitle="Top-line league-relative scoring, deltas, and best metric for each selected entity."
              >
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle comparison-workbench-table">
                    <thead className="table-light">
                      <tr>
                        <th>Entity</th>
                        <th>Composite pct</th>
                        <th>Avg z-score</th>
                        <th>Avg delta</th>
                        <th>Top metric</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntities.map((entity) => (
                        <tr key={entity.id} className={focusEntity?.id === entity.id ? 'comparison-workbench-row--focus' : ''}>
                          <td>
                            <button
                              type="button"
                              className="comparison-workbench-focus-button"
                              onClick={() => updateParams({ focus: entity.id })}
                            >
                              {entity.label}
                            </button>
                          </td>
                          <td>{entity.compositePercentile != null ? `${entity.compositePercentile}th` : '—'}</td>
                          <td>{entity.averageZScore != null ? entity.averageZScore.toFixed(2) : '—'}</td>
                          <td>{entity.averageDeltaScore != null ? entity.averageDeltaScore.toFixed(2) : '—'}</td>
                          <td>{entity.topMetric ? `${entity.topMetric.label} (${entity.topMetric.percentile}th)` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={5}>
              <AnalyticsPanel
                title="Closest comps"
                subtitle="Nearest league neighbors to the focus entity based on metric z-score distance."
              >
                <div className="comparison-workbench-comp-list">
                  {closestMatches.length ? (
                    closestMatches.map((entity) => (
                      <div key={entity.id} className="comparison-workbench-comp-item">
                        <div>
                          <div className="fw-semibold">{entity.label}</div>
                          <div className="text-muted small">
                            {entity.subtitle || entity.shortLabel} · {entity.compositePercentile ?? '—'}th percentile
                          </div>
                        </div>
                        <div className="comparison-workbench-comp-distance">
                          {entity.similarityDistance}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">No similarity comps available.</div>
                  )}
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <AnalyticsPanel
            title="League-relative detail"
            subtitle={`Metric-by-metric breakdown for ${focusEntity?.label || 'the focus entity'} against the current season pool.`}
          >
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle comparison-workbench-table">
                <thead className="table-light">
                  <tr>
                    <th>Metric</th>
                    <th>Current</th>
                    <th>Percentile</th>
                    <th>Z-score</th>
                    <th>{season - 1}</th>
                    <th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {focusEntity?.metrics.map((metric) => {
                    const deltaPositive = metric.delta != null &&
                      (metric.lowerIsBetter ? metric.delta < 0 : metric.delta > 0);
                    const deltaNegative = metric.delta != null &&
                      (metric.lowerIsBetter ? metric.delta > 0 : metric.delta < 0);

                    return (
                      <tr key={metric.key}>
                        <td className="fw-semibold">{metric.label}</td>
                        <td>{metric.formattedValue}</td>
                        <td>{metric.percentile != null ? `${metric.percentile}th` : '—'}</td>
                        <td>{metric.zScore != null ? metric.zScore.toFixed(2) : '—'}</td>
                        <td>{metric.formattedPreviousValue}</td>
                        <td className={deltaPositive ? 'text-success fw-semibold' : deltaNegative ? 'text-danger fw-semibold' : ''}>
                          {metric.formattedDelta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </AnalyticsPanel>
        </>
      )}
    </Container>
  );
}

const RADAR_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626'];

export default ComparisonWorkbenchPage;
