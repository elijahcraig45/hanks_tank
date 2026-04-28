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
import { AVAILABLE_SEASONS, SEASONS } from '../config/constants';
import { downloadCsv, formatPercent, mergeSearchParams } from '../utils/analytics';
import {
  buildContactQuality,
  buildEventBreakdown,
  buildPitchMix,
  buildRollingTrend,
  buildZoneHeatmap,
  filterStatcastData,
  summarizeStatcast,
} from '../utils/statcastLab';
import './styles/StatcastLabPage.css';

function formatMetric(value, digits = 1, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${Number(value).toFixed(digits)}${suffix}`;
}

function StatcastLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [playerOptions, setPlayerOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [statcastLoading, setStatcastLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  const [statcastError, setStatcastError] = useState(null);
  const [rows, setRows] = useState([]);

  const position = searchParams.get('position') || 'batter';
  const season = Number(searchParams.get('season') || SEASONS.CURRENT);
  const playerId = Number(searchParams.get('playerId') || 0);
  const query = searchParams.get('q') || '';
  const pitchThrows = searchParams.get('pitchThrows') || '';
  const batterStands = searchParams.get('batterStands') || '';
  const event = searchParams.get('event') || '';
  const pitchType = searchParams.get('pitchType') || '';
  const sampleLimit = Number(searchParams.get('limit') || 1500);

  const updateParams = (updates) => {
    setSearchParams(mergeSearchParams(searchParams, updates), { replace: true });
  };

  const loadPlayers = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);

    try {
      const data =
        position === 'pitcher'
          ? await apiService.getPlayerPitching(season, { limit: 1000 })
          : await apiService.getPlayerBatting(season, { limit: 1000 });

      const nextOptions = (data || [])
        .map((player) => ({
          id: Number(player.playerId),
          name: player.Name,
          subtitle: player.Team,
        }))
        .filter((player) => player.id && player.name);

      setPlayerOptions(nextOptions);
    } catch (error) {
      setOptionsError('Could not load Statcast Lab player options.');
      setPlayerOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  }, [position, season]);

  const loadStatcast = useCallback(async () => {
    if (!playerId) {
      setRows([]);
      return;
    }

    setStatcastLoading(true);
    setStatcastError(null);
    try {
      const data = await apiService.getStatcast(season, {
        playerId,
        position,
        limit: sampleLimit,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setRows([]);
      setStatcastError('Could not load Statcast data for the selected player.');
    } finally {
      setStatcastLoading(false);
    }
  }, [playerId, position, sampleLimit, season]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    loadStatcast();
  }, [loadStatcast]);

  const selectedPlayer = useMemo(
    () => playerOptions.find((player) => player.id === playerId) || null,
    [playerId, playerOptions]
  );

  const filteredPlayers = useMemo(() => {
    if (!query.trim()) {
      return playerOptions.slice(0, 12);
    }

    const normalized = query.trim().toLowerCase();
    return playerOptions
      .filter((player) => `${player.name} ${player.subtitle || ''}`.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [playerOptions, query]);

  const filteredRows = useMemo(
    () =>
      filterStatcastData(rows, {
        pitchThrows,
        batterStands,
        event,
        pitchType,
      }),
    [batterStands, event, pitchThrows, pitchType, rows]
  );

  const summary = useMemo(() => summarizeStatcast(filteredRows), [filteredRows]);
  const pitchMix = useMemo(() => buildPitchMix(filteredRows), [filteredRows]);
  const rollingTrend = useMemo(() => buildRollingTrend(filteredRows), [filteredRows]);
  const eventBreakdown = useMemo(() => buildEventBreakdown(filteredRows), [filteredRows]);
  const contactQuality = useMemo(() => buildContactQuality(filteredRows), [filteredRows]);
  const zoneHeatmap = useMemo(() => buildZoneHeatmap(filteredRows), [filteredRows]);

  const eventOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.events).filter(Boolean))).sort(),
    [rows]
  );
  const pitchTypeOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.pitch_name || row.pitch_type).filter(Boolean))).sort(),
    [rows]
  );

  const handleExport = () => {
    downloadCsv(
      `statcast-lab-${playerId}-${season}-${position}.csv`,
      [
        { label: 'Game Date', value: (row) => row.game_date },
        { label: 'Pitch Name', value: (row) => row.pitch_name || row.pitch_type || '' },
        { label: 'Event', value: (row) => row.events || '' },
        { label: 'Description', value: (row) => row.description || '' },
        { label: 'Release Speed', value: (row) => row.release_speed || '' },
        { label: 'Spin Rate', value: (row) => row.release_spin_rate || '' },
        { label: 'Launch Speed', value: (row) => row.launch_speed || '' },
        { label: 'Launch Angle', value: (row) => row.launch_angle || '' },
        { label: 'Plate X', value: (row) => row.plate_x || '' },
        { label: 'Plate Z', value: (row) => row.plate_z || '' },
      ],
      filteredRows
    );
  };

  return (
    <Container fluid="xl" className="statcast-lab-page py-4 px-3 px-md-4">
      <div className="statcast-lab-header mb-4">
        <div>
          <div className="statcast-lab-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Statcast Lab</h2>
          <p className="text-muted mb-0">
            Explore pitch mix, trend lines, contact quality, and zone behavior from player-level Statcast samples.
          </p>
        </div>
        <div className="statcast-lab-actions">
          <Button as={Link} to="/split-explorer" variant="outline-secondary" size="sm">
            Back to Split Explorer
          </Button>
          <SaveResearchViewButton
            label="Statcast Lab"
            hint="Player sample, pitch mix, and contact-quality filters"
          />
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!filteredRows.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <AnalyticsPanel
        title="Lab controls"
        subtitle="Pick a player sample, then layer context filters across the returned Statcast feed."
        className="mb-4"
      >
        <div className="statcast-lab-toolbar">
          <Form.Group>
            <Form.Label>Role</Form.Label>
            <Form.Select
              size="sm"
              value={position}
              onChange={(event) => updateParams({ position: event.target.value, playerId: null })}
            >
              <option value="batter">Batter</option>
              <option value="pitcher">Pitcher</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Season</Form.Label>
            <Form.Select
              size="sm"
              value={season}
              onChange={(event) => updateParams({ season: event.target.value, playerId: null })}
            >
              {AVAILABLE_SEASONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Sample cap</Form.Label>
            <Form.Select size="sm" value={sampleLimit} onChange={(event) => updateParams({ limit: event.target.value })}>
              <option value={500}>500 pitches</option>
              <option value={1000}>1,000 pitches</option>
              <option value={1500}>1,500 pitches</option>
              <option value={2500}>2,500 pitches</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="statcast-lab-player-search">
            <Form.Label>Player lookup</Form.Label>
            <Form.Control
              size="sm"
              type="search"
              value={query}
              placeholder={position === 'pitcher' ? 'Search pitcher' : 'Search batter'}
              onChange={(event) => updateParams({ q: event.target.value })}
            />
          </Form.Group>
        </div>

        <div className="statcast-lab-toolbar statcast-lab-toolbar--secondary mt-3">
          <Form.Group>
            <Form.Label>Pitcher throws</Form.Label>
            <Form.Select size="sm" value={pitchThrows} onChange={(event) => updateParams({ pitchThrows: event.target.value })}>
              <option value="">All</option>
              <option value="R">R</option>
              <option value="L">L</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Batter stands</Form.Label>
            <Form.Select size="sm" value={batterStands} onChange={(event) => updateParams({ batterStands: event.target.value })}>
              <option value="">All</option>
              <option value="R">R</option>
              <option value="L">L</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Event</Form.Label>
            <Form.Select size="sm" value={event} onChange={(event) => updateParams({ event: event.target.value })}>
              <option value="">All</option>
              {eventOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Pitch type</Form.Label>
            <Form.Select size="sm" value={pitchType} onChange={(event) => updateParams({ pitchType: event.target.value })}>
              <option value="">All</option>
              {pitchTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>

        {optionsError ? <Alert variant="warning" className="mt-3 mb-0">{optionsError}</Alert> : null}
        <div className="statcast-lab-search-results mt-3">
          {optionsLoading ? (
            <div className="text-muted small">Loading players…</div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-muted small">No matching players.</div>
          ) : (
            filteredPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                className={`statcast-lab-player-chip${player.id === playerId ? ' statcast-lab-player-chip--active' : ''}`}
                onClick={() => updateParams({ playerId: player.id, q: player.name })}
              >
                <span className="fw-semibold">{player.name}</span>
                {player.subtitle ? <span className="text-muted small"> · {player.subtitle}</span> : null}
              </button>
            ))
          )}
        </div>
      </AnalyticsPanel>

      {!playerId ? (
        <Alert variant="info">Choose a player to open the Statcast Lab.</Alert>
      ) : statcastLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-3">Loading Statcast sample…</p>
        </div>
      ) : statcastError ? (
        <Alert variant="warning">{statcastError}</Alert>
      ) : !filteredRows.length ? (
        <Alert variant="info">No Statcast rows match the current filters.</Alert>
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Sample size"
                value={summary.pitches.toLocaleString()}
                meta={`${selectedPlayer?.name || 'Selected player'} · ${season}`}
                accent="blue"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Avg release velo"
                value={formatMetric(summary.avgReleaseSpeed, 1, ' mph')}
                meta="Pitch speed across current sample"
                accent="green"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Whiff rate"
                value={formatPercent(summary.whiffRate)}
                meta={`Strike rate ${formatPercent(summary.strikeRate)}`}
                accent="gold"
              />
            </Col>
            <Col xs={12} md={6} xl={3}>
              <AnalyticsSummaryCard
                label="Contact quality"
                value={formatMetric(summary.avgExitVelo, 1, ' mph')}
                meta={`Hard-hit ${formatPercent(summary.hardHitRate)}`}
                accent="purple"
              />
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={7}>
              <AnalyticsPanel
                title="Rolling trend"
                subtitle="Recent game-level sample averages and whiff behavior."
              >
                <div className="statcast-lab-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={rollingTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="avgReleaseSpeed" name="Avg velo" stroke="#2563eb" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="avgExitVelo" name="Avg EV" stroke="#f97316" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="whiffRate" name="Whiff rate %" stroke="#16a34a" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={5}>
              <AnalyticsPanel
                title="Contact quality"
                subtitle="Exit velocity buckets in the current filter set."
              >
                <div className="statcast-lab-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={contactQuality}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d6efd" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col xl={7}>
              <AnalyticsPanel
                title="Pitch mix"
                subtitle="Usage, movement proxy, and whiff outcomes by pitch family."
              >
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Pitch</th>
                        <th>Usage</th>
                        <th>Avg velo</th>
                        <th>Avg spin</th>
                        <th>Whiff rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pitchMix.slice(0, 10).map((pitch) => (
                        <tr key={pitch.pitchName}>
                          <td className="fw-semibold">{pitch.pitchName}</td>
                          <td>{formatPercent(pitch.usage)}</td>
                          <td>{formatMetric(pitch.avgReleaseSpeed, 1, ' mph')}</td>
                          <td>{formatMetric(pitch.avgSpin, 0, ' rpm')}</td>
                          <td>{formatPercent(pitch.whiffRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </AnalyticsPanel>
            </Col>
            <Col xl={5}>
              <AnalyticsPanel
                title="Event breakdown"
                subtitle="Outcome distribution in the active sample."
              >
                <div className="statcast-lab-event-list">
                  {eventBreakdown.slice(0, 8).map((item) => (
                    <div key={item.event} className="statcast-lab-event-row">
                      <span>{item.event}</span>
                      <span>{item.count} · {formatPercent(item.share)}</span>
                    </div>
                  ))}
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>

          <Row className="g-4">
            <Col xl={6}>
              <AnalyticsPanel
                title="Zone heatmap"
                subtitle="3x3 pitch-location concentration with whiff overlay."
              >
                <div className="statcast-lab-zone-grid">
                  {zoneHeatmap.map((cell) => (
                    <div
                      key={cell.id}
                      className="statcast-lab-zone-cell"
                      style={{ backgroundColor: `rgba(37, 99, 235, ${0.12 + cell.intensity * 0.48})` }}
                    >
                      <div className="statcast-lab-zone-count">{cell.count}</div>
                      <div className="statcast-lab-zone-meta">{formatPercent(cell.whiffRate)}</div>
                    </div>
                  ))}
                </div>
                <div className="text-muted small mt-3">Cell label: pitch count with whiff rate below it.</div>
              </AnalyticsPanel>
            </Col>
            <Col xl={6}>
              <AnalyticsPanel
                title="Sample notes"
                subtitle="Quick context on the current query."
              >
                <div className="statcast-lab-notes">
                  <div><span className="statcast-lab-note-label">Player</span>{selectedPlayer?.name || playerId}</div>
                  <div><span className="statcast-lab-note-label">Role</span>{position === 'pitcher' ? 'Pitcher' : 'Batter'}</div>
                  <div><span className="statcast-lab-note-label">Season</span>{season}</div>
                  <div><span className="statcast-lab-note-label">Sample cap</span>{sampleLimit.toLocaleString()} rows</div>
                  <div><span className="statcast-lab-note-label">Source</span>Baseball Savant Statcast feed via backend proxy</div>
                </div>
              </AnalyticsPanel>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}

export default StatcastLabPage;

