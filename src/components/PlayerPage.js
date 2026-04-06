import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Alert, Spinner,
  Button, Tab, Tabs, Form, Badge,
} from 'react-bootstrap';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';
import StrikeZone from './StrikeZone';
import './styles/PlayerPage.css';

const STAT_YEARS = Array.from(
  { length: SEASONS.CURRENT - 2020 + 1 },
  (_, i) => SEASONS.CURRENT - i
);

const PlayerPage = () => {
  const { playerId } = useParams();
  const [selectedYear, setSelectedYear] = useState(SEASONS.CURRENT);
  const [battingData, setBattingData] = useState(null);
  const [pitchingData, setPitchingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendsLoaded, setTrendsLoaded] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const fetchSeasonStats = useCallback(async (year) => {
    if (!playerId || playerId === 'undefined') {
      setError('No player ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [allBatting, allPitching] = await Promise.all([
        apiService.getPlayerBatting(year, { limit: 500 }),
        apiService.getPlayerPitching(year, { limit: 500 }),
      ]);
      const b = allBatting.find(p => p.playerId?.toString() === playerId);
      const p = allPitching.find(p => p.playerId?.toString() === playerId);
      setBattingData(b || null);
      setPitchingData(p || null);
      if (!b && !p) setError(`No stats found for this player in ${year}.`);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError(`Failed to load player data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchSeasonStats(selectedYear);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, playerId]);

  // Set default active tab once initial data loads
  useEffect(() => {
    if (!loading && activeTab === null) {
      if (battingData) setActiveTab('batting');
      else if (pitchingData) setActiveTab('pitching');
      else setActiveTab('statcast');
    }
  }, [loading, battingData, pitchingData, activeTab]);

  const loadTrends = useCallback(async () => {
    if (trendsLoaded || trendsLoading) return;
    setTrendsLoading(true);
    try {
      const results = await Promise.all(
        STAT_YEARS.map(async (year) => {
          try {
            const [batting, pitching] = await Promise.all([
              apiService.getPlayerBatting(year, { limit: 500 }),
              apiService.getPlayerPitching(year, { limit: 500 }),
            ]);
            const b = batting.find(p => p.playerId?.toString() === playerId);
            const p = pitching.find(p => p.playerId?.toString() === playerId);
            if (!b && !p) return null;
            return { year, batting: b || null, pitching: p || null };
          } catch { return null; }
        })
      );
      setTrendData(results.filter(Boolean).sort((a, b) => a.year - b.year));
      setTrendsLoaded(true);
    } finally {
      setTrendsLoading(false);
    }
  }, [playerId, trendsLoaded, trendsLoading]);

  const handleTabSelect = (key) => {
    setActiveTab(key);
    if (key === 'trends') loadTrends();
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading player data…</p>
      </Container>
    );
  }

  if (error && !battingData && !pitchingData) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <Alert.Heading>No Data Found</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex gap-2">
            <Button as={Link} to="/PlayerBatting" variant="primary">Browse Players</Button>
            <Button as={Link} to="/" variant="outline-secondary">Home</Button>
          </div>
        </Alert>
      </Container>
    );
  }

  const playerName = battingData?.Name || pitchingData?.Name || 'Unknown Player';
  const team = battingData?.Team || pitchingData?.Team || '';
  const isBatter = !!battingData;
  const isPitcher = !!pitchingData;
  const strikezonePosition = isPitcher && !isBatter ? 'pitcher' : 'batter';
  const photoUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
  const initials = playerName.split(' ').map(n => n[0]).join('').slice(0, 2);
  const hasTrendBatting = trendData.some(d => d.batting !== null);
  const hasTrendPitching = trendData.some(d => d.pitching !== null);

  const battingAccent = [
    { label: 'AVG', value: battingData?.AVG },
    { label: 'OBP', value: battingData?.OBP },
    { label: 'SLG', value: battingData?.SLG },
    { label: 'OPS', value: battingData?.OPS },
  ];
  const battingGrid = [
    { label: 'G', value: battingData?.G },
    { label: 'PA', value: battingData?.PA },
    { label: 'AB', value: battingData?.AB },
    { label: 'R', value: battingData?.R },
    { label: 'H', value: battingData?.H },
    { label: '2B', value: battingData?.['2B'] },
    { label: '3B', value: battingData?.['3B'] },
    { label: 'HR', value: battingData?.HR },
    { label: 'RBI', value: battingData?.RBI },
    { label: 'SB', value: battingData?.SB },
    { label: 'CS', value: battingData?.CS },
    { label: 'BB', value: battingData?.BB },
    { label: 'SO', value: battingData?.SO },
    { label: 'BABIP', value: battingData?.BABIP },
    { label: 'TB', value: battingData?.TB },
    { label: 'HBP', value: battingData?.HBP },
  ];
  const pitchingAccent = [
    { label: 'ERA', value: pitchingData?.ERA },
    { label: 'WHIP', value: pitchingData?.WHIP },
    { label: 'IP', value: pitchingData?.IP },
    {
      label: 'K/9',
      value: pitchingData?.SO && pitchingData?.IP
        ? (pitchingData.SO / parseFloat(pitchingData.IP) * 9).toFixed(2)
        : null,
    },
  ];
  const pitchingGrid = [
    { label: 'G', value: pitchingData?.G },
    { label: 'GS', value: pitchingData?.GS },
    { label: 'W', value: pitchingData?.W },
    { label: 'L', value: pitchingData?.L },
    { label: 'SV', value: pitchingData?.SV },
    { label: 'SO', value: pitchingData?.SO },
    { label: 'BB', value: pitchingData?.BB },
    { label: 'H', value: pitchingData?.H },
    { label: 'R', value: pitchingData?.R },
    { label: 'ER', value: pitchingData?.ER },
    { label: 'HR', value: pitchingData?.HR },
    { label: 'HBP', value: pitchingData?.HBP },
    { label: 'WP', value: pitchingData?.WP },
    { label: 'BK', value: pitchingData?.BK },
    { label: 'BF', value: pitchingData?.BF },
  ];

  return (
    <div className="player-page">
      <Container fluid="lg" className="py-4">

        {/* Header */}
        <Card className="player-header-card mb-4 border-0 shadow-sm">
          <Card.Body className="p-4">
            <Row className="align-items-center g-3">
              <Col xs="auto">
                <div className="player-photo-wrap">
                  <img
                    src={photoUrl}
                    alt={playerName}
                    className="player-headshot"
                    onError={e => {
                      e.target.style.display = 'none';
                      const fallback = e.target.nextSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div
                    className="player-initials-avatar"
                    style={{ background: isBatter ? '#0d6efd' : '#dc3545', display: 'none' }}
                  >
                    {initials}
                  </div>
                </div>
              </Col>
              <Col>
                <h1 className="player-name mb-2">{playerName}</h1>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  {team && <Badge bg="secondary" className="fs-6">{team}</Badge>}
                  {isBatter && <Badge bg="primary">Batter</Badge>}
                  {isPitcher && <Badge bg="danger">Pitcher</Badge>}
                </div>
              </Col>
              <Col xs={12} sm="auto">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small fw-semibold">Season</span>
                  <Form.Select
                    size="sm"
                    value={selectedYear}
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    style={{ width: 110 }}
                  >
                    {STAT_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Year message if data missing for selected year */}
        {!battingData && !pitchingData && !error && (
          <Alert variant="info" className="mb-3">No stats found for {selectedYear}.</Alert>
        )}
        {error && !battingData && !pitchingData && (
          <Alert variant="warning" className="mb-3">{error}</Alert>
        )}

        {/* Tabs */}
        <Tabs
          activeKey={activeTab || (isBatter ? 'batting' : isPitcher ? 'pitching' : 'statcast')}
          onSelect={handleTabSelect}
          className="mb-3 player-tabs"
        >
          {/* Batting */}
          {isBatter && (
            <Tab eventKey="batting" title="🏏 Batting">
              <Row className="g-3 mb-3 mt-1">
                {battingAccent.map(s => (
                  <Col xs={6} md={3} key={s.label}>
                    <Card className="text-center border-0 shadow-sm">
                      <Card.Body className="py-3">
                        <div className="fs-3 fw-bold text-primary">{s.value ?? '—'}</div>
                        <div className="text-muted small">{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Row className="g-2">
                {battingGrid.map(s => (
                  <Col xs={6} sm={4} md={3} lg={2} key={s.label}>
                    <Card className="text-center border-0 bg-light h-100">
                      <Card.Body className="py-2 px-1">
                        <div className="fw-semibold">{s.value ?? '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Tab>
          )}

          {/* Pitching */}
          {isPitcher && (
            <Tab eventKey="pitching" title="⚾ Pitching">
              <Row className="g-3 mb-3 mt-1">
                {pitchingAccent.map(s => (
                  <Col xs={6} md={3} key={s.label}>
                    <Card className="text-center border-0 shadow-sm">
                      <Card.Body className="py-3">
                        <div className="fs-3 fw-bold text-danger">{s.value ?? '—'}</div>
                        <div className="text-muted small">{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Row className="g-2">
                {pitchingGrid.map(s => (
                  <Col xs={6} sm={4} md={3} lg={2} key={s.label}>
                    <Card className="text-center border-0 bg-light h-100">
                      <Card.Body className="py-2 px-1">
                        <div className="fw-semibold">{s.value ?? '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Tab>
          )}

          {/* Trends */}
          <Tab eventKey="trends" title="📈 Trends">
            {trendsLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading career history…</p>
              </div>
            ) : !trendsLoaded ? (
              <div className="text-center py-5">
                <Button variant="outline-primary" onClick={loadTrends}>
                  Load Season History
                </Button>
              </div>
            ) : trendData.length === 0 ? (
              <Alert variant="info" className="mt-3">
                No multi-year data available for this player.
              </Alert>
            ) : (
              <div className="pt-2">
                {hasTrendBatting && (
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white fw-semibold">Batting by Season</Card.Header>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover mb-0 trends-table">
                        <thead className="table-light">
                          <tr>
                            <th>Season</th><th>Team</th><th>G</th><th>PA</th><th>AB</th>
                            <th>R</th><th>H</th><th>2B</th><th>3B</th><th>HR</th>
                            <th>RBI</th><th>SB</th><th>CS</th><th>BB</th><th>SO</th>
                            <th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>BABIP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trendData.filter(d => d.batting).map(d => {
                            const b = d.batting;
                            const fmt3 = v => v != null ? parseFloat(v).toFixed(3) : '—';
                            const fmtN = v => v != null ? v : '—';
                            return (
                              <tr key={d.year} className={d.year === selectedYear ? 'table-primary' : ''}>
                                <td className="fw-semibold">{d.year}</td>
                                <td>{b.Team || '—'}</td>
                                <td>{fmtN(b.G)}</td><td>{fmtN(b.PA)}</td><td>{fmtN(b.AB)}</td>
                                <td>{fmtN(b.R)}</td><td>{fmtN(b.H)}</td><td>{fmtN(b['2B'])}</td>
                                <td>{fmtN(b['3B'])}</td><td>{fmtN(b.HR)}</td>
                                <td>{fmtN(b.RBI)}</td><td>{fmtN(b.SB)}</td><td>{fmtN(b.CS)}</td>
                                <td>{fmtN(b.BB)}</td><td>{fmtN(b.SO)}</td>
                                <td>{fmt3(b.AVG)}</td><td>{fmt3(b.OBP)}</td>
                                <td>{fmt3(b.SLG)}</td><td>{fmt3(b.OPS)}</td><td>{fmt3(b.BABIP)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
                {hasTrendPitching && (
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white fw-semibold">Pitching by Season</Card.Header>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover mb-0 trends-table">
                        <thead className="table-light">
                          <tr>
                            <th>Season</th><th>Team</th><th>G</th><th>GS</th><th>W</th><th>L</th>
                            <th>SV</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>HR</th>
                            <th>BB</th><th>SO</th><th>ERA</th><th>WHIP</th><th>K/9</th><th>BB/9</th><th>HR/9</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trendData.filter(d => d.pitching).map(d => {
                            const p = d.pitching;
                            const fmt2 = v => v != null ? parseFloat(v).toFixed(2) : '—';
                            const fmtN = v => v != null ? v : '—';
                            return (
                              <tr key={d.year} className={d.year === selectedYear ? 'table-primary' : ''}>
                                <td className="fw-semibold">{d.year}</td>
                                <td>{p.Team || '—'}</td>
                                <td>{fmtN(p.G)}</td><td>{fmtN(p.GS)}</td>
                                <td>{fmtN(p.W)}</td><td>{fmtN(p.L)}</td><td>{fmtN(p.SV)}</td>
                                <td>{fmtN(p.IP)}</td><td>{fmtN(p.H)}</td><td>{fmtN(p.R)}</td>
                                <td>{fmtN(p.ER)}</td><td>{fmtN(p.HR)}</td>
                                <td>{fmtN(p.BB)}</td><td>{fmtN(p.SO)}</td>
                                <td>{fmt2(p.ERA)}</td><td>{fmt2(p.WHIP)}</td>
                                <td>{fmt2(p['K/9'])}</td><td>{fmt2(p['BB/9'])}</td><td>{fmt2(p['HR/9'])}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Tab>

          {/* Statcast */}
          <Tab eventKey="statcast" title="🎯 Statcast">
            <div className="pt-2">
              <StrikeZone MLBAMId={playerId} position={strikezonePosition} />
            </div>
          </Tab>
        </Tabs>

        <div className="d-flex gap-2 flex-wrap mt-4 pb-4">
          <Button as={Link} to="/PlayerBatting" variant="outline-primary" size="sm">All Batting Leaders</Button>
          <Button as={Link} to="/PlayerPitching" variant="outline-secondary" size="sm">All Pitching Leaders</Button>
          <Button as={Link} to="/" variant="outline-secondary" size="sm">Home</Button>
        </div>

      </Container>
    </div>
  );
};

export default PlayerPage;
