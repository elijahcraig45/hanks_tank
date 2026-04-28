import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';
import { loadFavoriteTeams, toggleFavoriteTeam } from '../utils/favorites';
import {
  getTeamAbbreviationFromName,
  getTeamLogoUrl,
  getTeamMetaByAbbr,
  normalizeTeamAbbreviation,
} from '../utils/teamMetadata';
import './styles/TeamPage.css';

const STAT_YEARS = Array.from(
  { length: SEASONS.CURRENT - 2020 + 1 },
  (_, index) => SEASONS.CURRENT - index
);

function plusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function findTeamRecord(records, teamMeta) {
  if (!Array.isArray(records) || !teamMeta) {
    return null;
  }

  return (
    records.find((record) => Number(record.team_id) === Number(teamMeta.id)) ||
    records.find(
      (record) =>
        normalizeTeamAbbreviation(getTeamAbbreviationFromName(record.Team)) === teamMeta.abbreviation
    ) ||
    null
  );
}

function findStandingsRecord(records, teamMeta) {
  if (!Array.isArray(records) || !teamMeta) {
    return null;
  }

  for (const recordGroup of records) {
    const match = (recordGroup.teamRecords || []).find((teamRecord) => {
      const recordAbbreviation = normalizeTeamAbbreviation(
        getTeamAbbreviationFromName(teamRecord.team?.name)
      );

      return Number(teamRecord.team?.id) === Number(teamMeta.id) || recordAbbreviation === teamMeta.abbreviation;
    });

    if (match) {
      return match;
    }
  }

  return null;
}

function flattenSchedule(scheduleData, teamId) {
  const dates = scheduleData?.dates || [];
  return dates.flatMap((dateEntry) =>
    (dateEntry.games || []).map((game) => ({
      gamePk: game.gamePk,
      gameDate: game.gameDate,
      status: game.status?.detailedState || game.status?.abstractGameState || 'Scheduled',
      venue: game.venue?.name || '',
      awayTeam: game.teams?.away?.team?.name || '',
      homeTeam: game.teams?.home?.team?.name || '',
      awayScore: game.teams?.away?.score,
      homeScore: game.teams?.home?.score,
      isHome: Number(game.teams?.home?.team?.id) === Number(teamId),
    }))
  );
}

function TeamInfoItem({ label, value }) {
  return (
    <div className="team-info-item">
      <div className="team-info-label">{label}</div>
      <div className="team-info-value">{value || '—'}</div>
    </div>
  );
}

function TeamStatCard({ label, value, accent }) {
  return (
    <Card className="team-stat-card border-0 shadow-sm">
      <Card.Body>
        <div className="team-stat-label">{label}</div>
        <div className="team-stat-value" style={accent ? { color: accent } : undefined}>
          {value ?? '—'}
        </div>
      </Card.Body>
    </Card>
  );
}

function TeamPage() {
  const { teamAbbr } = useParams();
  const navigate = useNavigate();
  const normalizedTeamAbbr = normalizeTeamAbbreviation(teamAbbr);
  const teamMeta = getTeamMetaByAbbr(normalizedTeamAbbr);
  const [selectedYear, setSelectedYear] = useState(SEASONS.CURRENT);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamProfile, setTeamProfile] = useState(null);
  const [teamBattingData, setTeamBattingData] = useState(null);
  const [teamPitchingData, setTeamPitchingData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [favorite, setFavorite] = useState(false);
  const [standingsRecord, setStandingsRecord] = useState(null);

  useEffect(() => {
    if (
      teamAbbr &&
      normalizedTeamAbbr &&
      teamAbbr.toUpperCase() !== normalizedTeamAbbr
    ) {
      navigate(`/team/${normalizedTeamAbbr}`, { replace: true });
    }
  }, [navigate, normalizedTeamAbbr, teamAbbr]);

  useEffect(() => {
    setFavorite(loadFavoriteTeams().some((team) => team.abbreviation === normalizedTeamAbbr));
  }, [normalizedTeamAbbr]);

  const loadTeamData = useCallback(async () => {
    if (!teamMeta) {
      setError(`Unknown team: ${teamAbbr}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shouldLoadCurrentTeamSurfaces = selectedYear === SEASONS.CURRENT;
      const [profileData, battingRecords, pitchingRecords, rosterData, scheduleData, standingsData] = await Promise.all([
        apiService.getTeamDetails(teamMeta.id, selectedYear).catch(() => null),
        apiService.getTeamBatting(selectedYear, { limit: 60 }),
        apiService.getTeamPitching(selectedYear, { limit: 60 }),
        shouldLoadCurrentTeamSurfaces
          ? apiService.getTeamRoster(teamMeta.id, selectedYear).catch(() => null)
          : Promise.resolve(null),
        shouldLoadCurrentTeamSurfaces
          ? apiService
              .getTeamSchedule(teamMeta.id, {
                startDate: plusDays(0),
                endDate: plusDays(14),
              })
              .catch(() => null)
          : Promise.resolve(null),
        apiService.getStandings(selectedYear).catch(() => null),
      ]);

      setTeamProfile(profileData || null);
      setTeamBattingData(findTeamRecord(battingRecords, teamMeta));
      setTeamPitchingData(findTeamRecord(pitchingRecords, teamMeta));
      setRoster(rosterData || []);
      setSchedule(flattenSchedule(scheduleData, teamMeta.id));
      setStandingsRecord(
        findStandingsRecord(standingsData?.data?.standings?.records || standingsData?.standings?.records, teamMeta)
      );
    } catch (loadError) {
      console.error('Error fetching team page data:', loadError);
      setError(`Failed to load team data: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, teamAbbr, teamMeta]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const loadHistory = useCallback(async () => {
    if (!teamMeta || historyLoaded || historyLoading) {
      return;
    }

    setHistoryLoading(true);
    try {
      const results = await Promise.all(
        STAT_YEARS.map(async (year) => {
          try {
            const [battingRecords, pitchingRecords] = await Promise.all([
              apiService.getTeamBatting(year, { limit: 60 }),
              apiService.getTeamPitching(year, { limit: 60 }),
            ]);

            const batting = findTeamRecord(battingRecords, teamMeta);
            const pitching = findTeamRecord(pitchingRecords, teamMeta);

            if (!batting && !pitching) {
              return null;
            }

            return { year, batting, pitching };
          } catch {
            return null;
          }
        })
      );

      setHistoryData(results.filter(Boolean).sort((a, b) => a.year - b.year));
      setHistoryLoaded(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoaded, historyLoading, teamMeta]);

  const toggleFavorite = () => {
    const next = toggleFavoriteTeam({
      abbreviation: normalizedTeamAbbr,
      name: teamMeta?.name || teamProfile?.name || normalizedTeamAbbr,
      teamId: teamMeta?.id,
    });
    setFavorite(next.some((team) => team.abbreviation === normalizedTeamAbbr));
  };

  const accentColor = teamMeta?.primaryColor || '#0d6efd';
  const secondaryColor = teamMeta?.secondaryColor || '#0f172a';
  const logoUrl = teamMeta ? getTeamLogoUrl(teamMeta.id) : '';
  const displayName = teamProfile?.name || teamMeta?.name || `${normalizedTeamAbbr} Team`;
  const seasonLabel = selectedYear === SEASONS.CURRENT ? 'Current season' : `${selectedYear} season`;
  const rosterPitchers = useMemo(
    () => roster.filter((player) => player.position?.type === 'Pitcher'),
    [roster]
  );
  const rosterPositionPlayers = useMemo(
    () => roster.filter((player) => player.position?.type !== 'Pitcher'),
    [roster]
  );
  const rosterGroups = useMemo(() => ({
    catchers: rosterPositionPlayers.filter((player) => player.position?.abbreviation === 'C'),
    infielders: rosterPositionPlayers.filter((player) =>
      ['1B', '2B', '3B', 'SS', 'IF'].includes(player.position?.abbreviation)
    ),
    outfielders: rosterPositionPlayers.filter((player) =>
      ['LF', 'CF', 'RF', 'OF'].includes(player.position?.abbreviation)
    ),
    utility: rosterPositionPlayers.filter((player) =>
      !['C', '1B', '2B', '3B', 'SS', 'IF', 'LF', 'CF', 'RF', 'OF'].includes(player.position?.abbreviation)
    ),
  }), [rosterPositionPlayers]);
  const historyHighlights = useMemo(() => {
    if (!historyData.length) {
      return [];
    }

    const bestOps = [...historyData]
      .filter((entry) => entry.batting?.OPS != null)
      .sort((left, right) => parseFloat(right.batting.OPS) - parseFloat(left.batting.OPS))[0];
    const bestEra = [...historyData]
      .filter((entry) => entry.pitching?.ERA != null)
      .sort((left, right) => parseFloat(left.pitching.ERA) - parseFloat(right.pitching.ERA))[0];
    const powerPeak = [...historyData]
      .filter((entry) => entry.batting?.HR != null)
      .sort((left, right) => Number(right.batting.HR) - Number(left.batting.HR))[0];
    const strikeoutPeak = [...historyData]
      .filter((entry) => entry.pitching?.SO != null)
      .sort((left, right) => Number(right.pitching.SO) - Number(left.pitching.SO))[0];

    return [
      bestOps ? { label: 'Best OPS', value: `${bestOps.year} · ${bestOps.batting.OPS}` } : null,
      bestEra ? { label: 'Best ERA', value: `${bestEra.year} · ${bestEra.pitching.ERA}` } : null,
      powerPeak ? { label: 'Peak power', value: `${powerPeak.year} · ${powerPeak.batting.HR} HR` } : null,
      strikeoutPeak ? { label: 'Most Ks', value: `${strikeoutPeak.year} · ${strikeoutPeak.pitching.SO}` } : null,
    ].filter(Boolean);
  }, [historyData]);
  const recordLabel = standingsRecord?.leagueRecord
    ? `${standingsRecord.leagueRecord.wins}-${standingsRecord.leagueRecord.losses}`
    : null;
  const runsScored = Number(teamBattingData?.R);
  const runsAllowed = Number(teamPitchingData?.R);
  const runDifferentialLabel =
    Number.isFinite(runsScored) && Number.isFinite(runsAllowed)
      ? `${runsScored - runsAllowed > 0 ? '+' : ''}${runsScored - runsAllowed}`
      : null;

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
        <p className="mt-3 text-muted">Loading team hub…</p>
      </Container>
    );
  }

  if (error && !teamProfile && !teamBattingData && !teamPitchingData) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Team Data</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex gap-2 flex-wrap">
            <Button as={Link} to="/" variant="primary">
              Home
            </Button>
            <Button as={Link} to="/TeamBatting" variant="outline-secondary">
              Team Leaderboards
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="team-page">
      <Container fluid="lg" className="py-4">
        <Card
          className="team-hero-card border-0 shadow-sm mb-4"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          <Card.Body className="p-4 p-lg-5">
            <Row className="g-4 align-items-center">
              <Col xs="auto">
                <div className="team-hero-logo-wrap">
                  {logoUrl && <img src={logoUrl} alt={displayName} className="team-hero-logo" />}
                </div>
              </Col>
              <Col>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <Badge bg="light" text="dark" pill>
                    {normalizedTeamAbbr}
                  </Badge>
                  {teamProfile?.division?.name && (
                    <Badge bg="dark" pill className="team-hero-badge">
                      {teamProfile.division.name}
                    </Badge>
                  )}
                  {teamProfile?.league?.name && (
                    <Badge bg="dark" pill className="team-hero-badge">
                      {teamProfile.league.name}
                    </Badge>
                  )}
                </div>
                <h1 className="team-hero-title mb-1">{displayName}</h1>
                <p className="team-hero-subtitle mb-0">
                  {teamProfile?.locationName || teamMeta?.city || '—'} · Est.{' '}
                  {teamProfile?.firstYearOfPlay || teamMeta?.founded || '—'} · {seasonLabel}
                  {recordLabel ? ` · ${recordLabel}` : ''}
                </p>
              </Col>
              <Col xs={12} md="auto">
                <div className="team-hero-actions">
                  <Button
                    variant={favorite ? 'warning' : 'outline-light'}
                    onClick={toggleFavorite}
                  >
                    {favorite ? '★ Favorite team' : '☆ Add favorite'}
                  </Button>
                  <Form.Select
                    size="sm"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(parseInt(event.target.value, 10))}
                    className="team-year-select"
                  >
                    {STAT_YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {error && (
          <Alert variant="warning" className="mb-4">
            {error}
          </Alert>
        )}

        <Tabs
          activeKey={activeTab}
          onSelect={(key) => {
            setActiveTab(key || 'overview');
            if (key === 'history') {
              loadHistory();
            }
          }}
          className="team-tabs mb-4"
        >
          <Tab eventKey="overview" title="Overview">
            <div className="pt-3">
              <Row className="g-3 mb-4">
                {[
                  { label: 'Team AVG', value: teamBattingData?.AVG },
                  { label: 'Team OPS', value: teamBattingData?.OPS },
                  { label: 'Team ERA', value: teamPitchingData?.ERA },
                  { label: 'Team WHIP', value: teamPitchingData?.WHIP },
                  { label: 'Run Diff', value: runDifferentialLabel },
                  { label: 'Wild Card', value: standingsRecord?.wildCardRank },
                ].map((stat) => (
                  <Col xs={6} md={4} xl={2} key={stat.label}>
                    <TeamStatCard
                      label={stat.label}
                      value={stat.value}
                      accent={accentColor}
                    />
                  </Col>
                ))}
              </Row>

              <Row className="g-4">
                <Col lg={5}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header className="bg-white fw-semibold">Team Snapshot</Card.Header>
                    <Card.Body className="team-info-grid">
                      <TeamInfoItem label="Venue" value={teamProfile?.venue?.name} />
                      <TeamInfoItem
                        label="Venue city"
                        value={[teamProfile?.venue?.location?.city, teamProfile?.venue?.location?.stateAbbrev].filter(Boolean).join(', ')}
                      />
                      <TeamInfoItem label="League" value={teamProfile?.league?.name} />
                      <TeamInfoItem label="Division" value={teamProfile?.division?.name} />
                      <TeamInfoItem label="Franchise" value={teamProfile?.franchiseName || teamProfile?.franchise?.teamName} />
                      <TeamInfoItem label="Club name" value={teamProfile?.clubName} />
                      <TeamInfoItem label="Short name" value={teamProfile?.shortName} />
                      <TeamInfoItem label="First year" value={teamProfile?.firstYearOfPlay} />
                      <TeamInfoItem label="Spring venue" value={teamProfile?.springVenue?.name} />
                      <TeamInfoItem
                        label="Spring context"
                        value={[teamProfile?.springLeague?.name, teamProfile?.springVenue?.location?.city].filter(Boolean).join(' · ')}
                      />
                      <TeamInfoItem label="Record" value={recordLabel} />
                      <TeamInfoItem label="Win %" value={standingsRecord?.winningPercentage} />
                      <TeamInfoItem label="Division rank" value={standingsRecord?.divisionRank} />
                      <TeamInfoItem label="Wild card rank" value={standingsRecord?.wildCardRank} />
                      <TeamInfoItem label="Games back" value={standingsRecord?.gamesBack} />
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={7}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header className="bg-white fw-semibold">Next Games</Card.Header>
                    <Card.Body>
                      {selectedYear !== SEASONS.CURRENT ? (
                        <Alert variant="info" className="mb-0">
                          Upcoming schedule is only shown for the current season.
                        </Alert>
                      ) : schedule.length === 0 ? (
                        <div className="text-muted">No upcoming games found.</div>
                      ) : (
                        <div className="team-schedule-list">
                          {schedule.slice(0, 5).map((game) => (
                            <Link
                              key={game.gamePk}
                              to={`/game/${game.gamePk}`}
                              className="team-schedule-link text-decoration-none"
                            >
                              <div>
                                <div className="team-schedule-matchup">
                                  {game.awayTeam} @ {game.homeTeam}
                                </div>
                                <div className="team-schedule-meta">
                                  {formatDateTime(game.gameDate)} · {game.venue}
                                </div>
                              </div>
                              <Badge bg="light" text="dark">
                                {game.status}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </Tab>

          <Tab eventKey="batting" title="Batting">
            <div className="pt-3">
              {!teamBattingData ? (
                <Alert variant="warning">No batting data available for this season.</Alert>
              ) : (
                <>
                  <Row className="g-3 mb-3">
                    {[
                      { label: 'AVG', value: teamBattingData.AVG },
                      { label: 'OBP', value: teamBattingData.OBP },
                      { label: 'SLG', value: teamBattingData.SLG },
                      { label: 'OPS', value: teamBattingData.OPS },
                    ].map((stat) => (
                      <Col xs={6} md={3} key={stat.label}>
                        <TeamStatCard
                          label={stat.label}
                          value={stat.value}
                          accent={accentColor}
                        />
                      </Col>
                    ))}
                  </Row>
                  <Row className="g-3">
                    {[
                      ['Games', teamBattingData.G],
                      ['Runs', teamBattingData.R],
                      ['Hits', teamBattingData.H],
                      ['2B', teamBattingData['2B']],
                      ['3B', teamBattingData['3B']],
                      ['HR', teamBattingData.HR],
                      ['RBI', teamBattingData.RBI],
                      ['SB', teamBattingData.SB],
                      ['BB', teamBattingData.BB],
                      ['SO', teamBattingData.SO],
                      ['TB', teamBattingData.TB],
                      ['LOB', teamBattingData.LOB],
                    ].map(([label, value]) => (
                      <Col xs={6} sm={4} md={3} lg={2} key={label}>
                        <TeamStatCard label={label} value={value} />
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </div>
          </Tab>

          <Tab eventKey="pitching" title="Pitching">
            <div className="pt-3">
              {!teamPitchingData ? (
                <Alert variant="warning">No pitching data available for this season.</Alert>
              ) : (
                <>
                  <Row className="g-3 mb-3">
                    {[
                      { label: 'ERA', value: teamPitchingData.ERA },
                      { label: 'WHIP', value: teamPitchingData.WHIP },
                      { label: 'W-L%', value: teamPitchingData['W-L%'] },
                      { label: 'IP', value: teamPitchingData.IP },
                    ].map((stat) => (
                      <Col xs={6} md={3} key={stat.label}>
                        <TeamStatCard
                          label={stat.label}
                          value={stat.value}
                          accent={accentColor}
                        />
                      </Col>
                    ))}
                  </Row>
                  <Row className="g-3">
                    {[
                      ['Games', teamPitchingData.G],
                      ['GS', teamPitchingData.GS],
                      ['Wins', teamPitchingData.W],
                      ['Losses', teamPitchingData.L],
                      ['Saves', teamPitchingData.SV],
                      ['SO', teamPitchingData.SO],
                      ['BB', teamPitchingData.BB],
                      ['Hits allowed', teamPitchingData.H],
                      ['HR allowed', teamPitchingData.HR],
                      ['Earned runs', teamPitchingData.ER],
                      ['Complete games', teamPitchingData.CG],
                      ['Shutouts', teamPitchingData.SHO],
                    ].map(([label, value]) => (
                      <Col xs={6} sm={4} md={3} lg={2} key={label}>
                        <TeamStatCard label={label} value={value} />
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </div>
          </Tab>

          <Tab eventKey="roster" title="Roster">
            <div className="pt-3">
              {selectedYear !== SEASONS.CURRENT ? (
                <Alert variant="info">Roster data is only shown for the current season.</Alert>
              ) : roster.length === 0 ? (
                <Alert variant="warning">No active roster data available.</Alert>
              ) : (
                <Row className="g-4">
                  <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Header className="bg-white fw-semibold">
                        Position Players ({rosterPositionPlayers.length})
                      </Card.Header>
                      <Card.Body className="pt-3">
                        {[
                          ['Catchers', rosterGroups.catchers],
                          ['Infielders', rosterGroups.infielders],
                          ['Outfielders', rosterGroups.outfielders],
                          ['Utility / DH', rosterGroups.utility],
                        ].map(([label, players]) => (
                          players.length > 0 ? (
                            <div key={label} className="mb-3">
                              <div className="team-info-label mb-2">{label}</div>
                              <div className="table-responsive">
                                <Table hover className="mb-0 align-middle team-roster-table">
                                  <tbody>
                                    {players.map((player) => (
                                      <tr key={player.person.id}>
                                        <td className="fw-semibold">
                                          <Link to={`/player/${player.person.id}`}>{player.person.fullName}</Link>
                                        </td>
                                        <td>{player.position?.abbreviation || '—'}</td>
                                        <td>{player.jerseyNumber || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            </div>
                          ) : null
                        ))}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Header className="bg-white fw-semibold">
                        Pitchers ({rosterPitchers.length})
                      </Card.Header>
                      <div className="table-responsive">
                        <Table hover className="mb-0 align-middle team-roster-table">
                          <tbody>
                            {rosterPitchers.map((player) => (
                              <tr key={player.person.id}>
                                <td className="fw-semibold">
                                  <Link to={`/player/${player.person.id}`}>{player.person.fullName}</Link>
                                </td>
                                <td>{player.position?.abbreviation || '—'}</td>
                                <td>{player.jerseyNumber || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card>
                  </Col>
                </Row>
              )}
            </div>
          </Tab>

          <Tab eventKey="history" title="Season History">
            <div className="pt-3">
              {historyLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading season history…</p>
                </div>
              ) : !historyLoaded ? (
                <div className="text-center py-5">
                  <Button variant="outline-primary" onClick={loadHistory}>
                    Load Season History
                  </Button>
                </div>
              ) : historyData.length === 0 ? (
                <Alert variant="info">No multi-year team history was found.</Alert>
              ) : (
                <Row className="g-4">
                  <Col xs={12}>
                    <Row className="g-3">
                      {historyHighlights.map((highlight) => (
                        <Col xs={6} md={3} key={highlight.label}>
                          <TeamStatCard
                            label={highlight.label}
                            value={highlight.value}
                            accent={accentColor}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Col>
                  <Col xl={6}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-white fw-semibold">Batting by Season</Card.Header>
                      <div className="table-responsive">
                        <Table hover className="mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Season</th>
                              <th>AVG</th>
                              <th>OBP</th>
                              <th>SLG</th>
                              <th>OPS</th>
                              <th>HR</th>
                              <th>R</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.map((entry) => (
                              <tr key={`batting-${entry.year}`}>
                                <td className="fw-semibold">{entry.year}</td>
                                <td>{entry.batting?.AVG || '—'}</td>
                                <td>{entry.batting?.OBP || '—'}</td>
                                <td>{entry.batting?.SLG || '—'}</td>
                                <td>{entry.batting?.OPS || '—'}</td>
                                <td>{entry.batting?.HR || '—'}</td>
                                <td>{entry.batting?.R || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card>
                  </Col>
                  <Col xl={6}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-white fw-semibold">Pitching by Season</Card.Header>
                      <div className="table-responsive">
                        <Table hover className="mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Season</th>
                              <th>ERA</th>
                              <th>WHIP</th>
                              <th>W</th>
                              <th>L</th>
                              <th>SO</th>
                              <th>SV</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.map((entry) => (
                              <tr key={`pitching-${entry.year}`}>
                                <td className="fw-semibold">{entry.year}</td>
                                <td>{entry.pitching?.ERA || '—'}</td>
                                <td>{entry.pitching?.WHIP || '—'}</td>
                                <td>{entry.pitching?.W || '—'}</td>
                                <td>{entry.pitching?.L || '—'}</td>
                                <td>{entry.pitching?.SO || '—'}</td>
                                <td>{entry.pitching?.SV || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card>
                  </Col>
                </Row>
              )}
            </div>
          </Tab>
        </Tabs>

        <div className="d-flex gap-2 flex-wrap pb-4">
          <Button as={Link} to="/TeamBatting" variant="primary">
            Team Batting Leaders
          </Button>
          <Button as={Link} to="/TeamPitching" variant="outline-primary">
            Team Pitching Leaders
          </Button>
          <Button as={Link} to="/transactions" variant="outline-secondary">
            League Transactions
          </Button>
        </div>
      </Container>
    </div>
  );
}

export default TeamPage;
