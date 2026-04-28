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
import { downloadCsv, formatDecimal, mergeSearchParams } from '../utils/analytics';
import { getAllTeamMetadata, getTeamLogoUrl } from '../utils/teamMetadata';
import './styles/SplitExplorerPage.css';

const SPLIT_FAMILIES = [
  { id: 'location', label: 'Home / Away' },
  { id: 'handedness', label: 'vs RHP / LHP' },
  { id: 'time', label: 'Day / Night' },
];

const HITTING_METRICS = [
  { key: 'avg', label: 'AVG', kind: 'rate' },
  { key: 'obp', label: 'OBP', kind: 'rate' },
  { key: 'slg', label: 'SLG', kind: 'rate' },
  { key: 'ops', label: 'OPS', kind: 'rate' },
  { key: 'homeRuns', label: 'HR', kind: 'count' },
  { key: 'runs', label: 'R', kind: 'count' },
  { key: 'rbi', label: 'RBI', kind: 'count' },
  { key: 'strikeOuts', label: 'SO', kind: 'count' },
  { key: 'baseOnBalls', label: 'BB', kind: 'count' },
  { key: 'stolenBases', label: 'SB', kind: 'count' },
];

const PITCHING_METRICS = [
  { key: 'era', label: 'ERA', kind: 'rate' },
  { key: 'whip', label: 'WHIP', kind: 'rate' },
  { key: 'inningsPitched', label: 'IP', kind: 'text' },
  { key: 'strikeOuts', label: 'SO', kind: 'count' },
  { key: 'baseOnBalls', label: 'BB', kind: 'count' },
  { key: 'hits', label: 'H', kind: 'count' },
  { key: 'runs', label: 'R', kind: 'count' },
  { key: 'earnedRuns', label: 'ER', kind: 'count' },
  { key: 'homeRuns', label: 'HR', kind: 'count' },
  { key: 'wins', label: 'W', kind: 'count' },
];

function parseNumericValue(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

function formatSplitValue(value, kind) {
  if (value == null || value === '') {
    return '—';
  }

  if (kind === 'count') {
    return String(value);
  }

  if (kind === 'text') {
    return String(value);
  }

  const parsed = parseNumericValue(value);
  if (parsed == null) {
    return String(value);
  }

  if (kind === 'rate') {
    return parsed < 1 ? `${parsed.toFixed(3).replace(/^0/, '')}` : parsed.toFixed(3);
  }

  return formatDecimal(parsed);
}

function buildChartData(metrics, baseline, splits) {
  return metrics
    .map((metric) => {
      const baselineValue = parseNumericValue(baseline?.stat?.[metric.key]);
      const firstSplitValue = parseNumericValue(splits[0]?.stat?.[metric.key]);
      const secondSplitValue = parseNumericValue(splits[1]?.stat?.[metric.key]);

      if (baselineValue == null && firstSplitValue == null && secondSplitValue == null) {
        return null;
      }

      return {
        metric: metric.label,
        baseline: baselineValue,
        splitA: firstSplitValue,
        splitB: secondSplitValue,
      };
    })
    .filter(Boolean);
}

function SplitExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  const [splitError, setSplitError] = useState(null);
  const [entityOptions, setEntityOptions] = useState([]);
  const [splitData, setSplitData] = useState(null);

  const entityType = searchParams.get('entityType') || 'player';
  const group = searchParams.get('group') || 'hitting';
  const season = Number(searchParams.get('season') || SEASONS.CURRENT);
  const family = searchParams.get('family') || 'location';
  const entityId = Number(searchParams.get('entityId') || 0);
  const searchTerm = searchParams.get('q') || '';

  const metrics = group === 'pitching' ? PITCHING_METRICS : HITTING_METRICS;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return entityOptions.slice(0, entityType === 'team' ? 30 : 12);
    }

    const normalized = searchTerm.trim().toLowerCase();
    return entityOptions
      .filter((option) => {
        const haystack = [option.name, option.subtitle].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 12);
  }, [entityOptions, entityType, searchTerm]);

  const selectedOption = useMemo(
    () => entityOptions.find((option) => Number(option.id) === entityId) || null,
    [entityId, entityOptions]
  );

  const chartData = useMemo(
    () => buildChartData(metrics.slice(0, 6), splitData?.baseline, splitData?.splits || []),
    [metrics, splitData]
  );

  const loadEntityOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);

    try {
      if (entityType === 'team') {
        const teamOptions = Object.values(getAllTeamMetadata())
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((team) => ({
            id: team.id,
            name: team.name,
            subtitle: team.abbreviation,
            logoUrl: getTeamLogoUrl(team.id),
          }));

        setEntityOptions(teamOptions);
        return;
      }

      const rows =
        group === 'pitching'
          ? await apiService.getPlayerPitching(season, { limit: 1000 })
          : await apiService.getPlayerBatting(season, { limit: 1000 });

      const uniquePlayers = new Map();
      (rows || []).forEach((player) => {
        const playerId = Number(player.playerId);
        if (!playerId || uniquePlayers.has(playerId)) {
          return;
        }

        uniquePlayers.set(playerId, {
          id: playerId,
          name: player.Name,
          subtitle: player.Team,
        });
      });

      setEntityOptions(
        Array.from(uniquePlayers.values()).sort((left, right) => left.name.localeCompare(right.name))
      );
    } catch (error) {
      setEntityOptions([]);
      setOptionsError('Could not load split explorer options.');
    } finally {
      setOptionsLoading(false);
    }
  }, [entityType, group, season]);

  const loadSplitData = useCallback(async () => {
    if (!entityId) {
      setSplitData(null);
      return;
    }

    setSplitLoading(true);
    setSplitError(null);
    try {
      const response = await apiService.getSplits({
        entityType,
        entityId,
        season,
        group,
        family,
      });
      setSplitData(response);
    } catch (error) {
      setSplitData(null);
      setSplitError('Could not load split data for the selected entity.');
    } finally {
      setSplitLoading(false);
    }
  }, [entityId, entityType, family, group, season]);

  useEffect(() => {
    loadEntityOptions();
  }, [loadEntityOptions]);

  useEffect(() => {
    loadSplitData();
  }, [loadSplitData]);

  const updateParams = (updates) => {
    setSearchParams(mergeSearchParams(searchParams, updates), { replace: true });
  };

  const handleSelectEntity = (option) => {
    updateParams({ entityId: option.id, q: option.name });
  };

  const handleExport = () => {
    if (!splitData?.baseline || !splitData?.splits?.length) {
      return;
    }

    const rows = metrics.map((metric) => ({
      metric: metric.label,
      baseline: formatSplitValue(splitData.baseline?.stat?.[metric.key], metric.kind),
      splitA: formatSplitValue(splitData.splits?.[0]?.stat?.[metric.key], metric.kind),
      splitB: formatSplitValue(splitData.splits?.[1]?.stat?.[metric.key], metric.kind),
    }));

    downloadCsv(
      `split-explorer-${entityType}-${entityId}-${group}-${family}-${season}.csv`,
      [
        { label: 'Metric', value: (row) => row.metric },
        { label: 'Baseline', value: (row) => row.baseline },
        { label: splitData.splits?.[0]?.split?.description || 'Split A', value: (row) => row.splitA },
        { label: splitData.splits?.[1]?.split?.description || 'Split B', value: (row) => row.splitB },
      ],
      rows
    );
  };

  return (
    <Container fluid="xl" className="split-explorer-page py-4 px-3 px-md-4">
      <div className="split-explorer-header mb-4">
        <div>
          <div className="split-explorer-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Split Explorer</h2>
          <p className="text-muted mb-0">
            Compare season baseline against reliable MLB split families for teams and players.
          </p>
        </div>
        <div className="split-explorer-actions">
          <Button as={Link} to="/prediction-diagnostics" variant="outline-secondary" size="sm">
            Back to Diagnostics
          </Button>
          <SaveResearchViewButton
            label="Split Explorer"
            hint="Entity, season, and split-family comparison"
          />
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!splitData?.splits?.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <AnalyticsPanel
        title="Split controls"
        subtitle="Select an entity, stat group, season, and split family to compare."
        className="mb-4"
      >
        <div className="split-explorer-toolbar">
          <Form.Group controlId="split-entity-type">
            <Form.Label>Entity</Form.Label>
            <Form.Select
              size="sm"
              value={entityType}
              onChange={(event) => updateParams({ entityType: event.target.value, entityId: null })}
            >
              <option value="player">Player</option>
              <option value="team">Team</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="split-group">
            <Form.Label>Group</Form.Label>
            <Form.Select
              size="sm"
              value={group}
              onChange={(event) => updateParams({ group: event.target.value, entityId: null })}
            >
              <option value="hitting">Hitting</option>
              <option value="pitching">Pitching</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="split-season">
            <Form.Label>Season</Form.Label>
            <Form.Select
              size="sm"
              value={season}
              onChange={(event) => updateParams({ season: event.target.value, entityId: null })}
            >
              {AVAILABLE_SEASONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="split-family">
            <Form.Label>Split family</Form.Label>
            <Form.Select
              size="sm"
              value={family}
              onChange={(event) => updateParams({ family: event.target.value })}
            >
              {SPLIT_FAMILIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="split-search" className="split-explorer-search">
            <Form.Label>{entityType === 'team' ? 'Team lookup' : 'Player lookup'}</Form.Label>
            <Form.Control
              size="sm"
              type="search"
              placeholder={entityType === 'team' ? 'Search team' : 'Search player or club'}
              value={searchTerm}
              onChange={(event) => updateParams({ q: event.target.value })}
            />
          </Form.Group>
        </div>

        {optionsError ? <Alert variant="warning" className="mt-3 mb-0">{optionsError}</Alert> : null}

        {searchTerm || entityType === 'team' ? (
          <div className="split-explorer-search-results mt-3">
            {optionsLoading ? (
              <div className="text-muted small">Loading options…</div>
            ) : filteredOptions.length === 0 ? (
              <div className="text-muted small">No matching entities.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`split-explorer-result${Number(option.id) === entityId ? ' split-explorer-result--active' : ''}`}
                  onClick={() => handleSelectEntity(option)}
                >
                  {option.logoUrl ? <img src={option.logoUrl} alt="" className="split-explorer-result-logo" /> : null}
                  <span className="fw-semibold">{option.name}</span>
                  {option.subtitle ? <span className="text-muted small"> · {option.subtitle}</span> : null}
                </button>
              ))
            )}
          </div>
        ) : null}
      </AnalyticsPanel>

      {!entityId ? (
        <Alert variant="info">Choose a {entityType} to start comparing splits.</Alert>
      ) : splitLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-3">Loading split explorer…</p>
        </div>
      ) : splitError ? (
        <Alert variant="warning">{splitError}</Alert>
      ) : !splitData?.baseline || !splitData?.splits?.length ? (
        <Alert variant="info">No split data is available for the selected combination.</Alert>
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={12} md={4}>
              <AnalyticsSummaryCard
                label="Baseline"
                value={splitData.entity?.fullName || splitData.entity?.name || selectedOption?.name || 'Selected entity'}
                meta={`${group === 'hitting' ? formatSplitValue(splitData.baseline?.stat?.ops, 'rate') : formatSplitValue(splitData.baseline?.stat?.era, 'rate')} ${group === 'hitting' ? 'OPS' : 'ERA'} · ${season}`}
                accent="blue"
              />
            </Col>
            {splitData.splits.slice(0, 2).map((split, index) => (
              <Col xs={12} md={4} key={split.split?.code || index}>
                <AnalyticsSummaryCard
                  label={split.split?.description || `Split ${index + 1}`}
                  value={group === 'hitting' ? formatSplitValue(split.stat?.ops, 'rate') : formatSplitValue(split.stat?.era, 'rate')}
                  meta={`${group === 'hitting' ? 'OPS' : 'ERA'} · ${formatSplitValue(group === 'hitting' ? split.stat?.avg : split.stat?.whip, 'rate')} ${group === 'hitting' ? 'AVG' : 'WHIP'}`}
                  accent={index === 0 ? 'green' : 'gold'}
                />
              </Col>
            ))}
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={7}>
              <AnalyticsPanel
                title="Metric comparison"
                subtitle={`${splitData.family?.label || 'Selected splits'} against season baseline.`}
              >
                <div className="split-explorer-chart">
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="baseline" name="Baseline" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                      <Bar
                        dataKey="splitA"
                        name={splitData.splits?.[0]?.split?.description || 'Split A'}
                        fill="#16a34a"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="splitB"
                        name={splitData.splits?.[1]?.split?.description || 'Split B'}
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={5}>
              <AnalyticsPanel
                title="Context"
                subtitle="Split metadata from MLB StatsAPI."
              >
                <div className="split-explorer-context">
                  <div><span className="split-explorer-context-label">Entity</span>{splitData.entity?.fullName || splitData.entity?.name || selectedOption?.name}</div>
                  {splitData.team?.name ? (
                    <div><span className="split-explorer-context-label">Club</span>{splitData.team.name}</div>
                  ) : null}
                  <div><span className="split-explorer-context-label">Family</span>{splitData.family?.label}</div>
                  <div><span className="split-explorer-context-label">Scope</span>{group === 'hitting' ? 'Hitting' : 'Pitching'} · {season}</div>
                  <div><span className="split-explorer-context-label">Source</span>MLB StatsAPI statSplits</div>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <AnalyticsPanel
            title="Split review table"
            subtitle="Season baseline beside the selected split pair."
          >
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle split-explorer-table">
                <thead className="table-light">
                  <tr>
                    <th>Metric</th>
                    <th>Baseline</th>
                    <th>{splitData.splits?.[0]?.split?.description || 'Split A'}</th>
                    <th>{splitData.splits?.[1]?.split?.description || 'Split B'}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.key}>
                      <td className="fw-semibold">{metric.label}</td>
                      <td>{formatSplitValue(splitData.baseline?.stat?.[metric.key], metric.kind)}</td>
                      <td>{formatSplitValue(splitData.splits?.[0]?.stat?.[metric.key], metric.kind)}</td>
                      <td>{formatSplitValue(splitData.splits?.[1]?.stat?.[metric.key], metric.kind)}</td>
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

export default SplitExplorerPage;

