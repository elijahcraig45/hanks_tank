import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Table, ProgressBar, Alert } from 'react-bootstrap';
import { 
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { formatStat } from '../utils/statsCalculations';
import './styles/EnhancedTeamDashboard.css';

/**
 * Enhanced Team Dashboard
 * Comprehensive team analytics with visualizations and comparisons
 */
const EnhancedTeamDashboard = ({ 
  teamBattingData, 
  teamPitchingData, 
  allTeamsBatting = [], 
  allTeamsPitching = [],
  teamInfo 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [leagueRankings, setLeagueRankings] = useState({});
  
  useEffect(() => {
    if (teamBattingData && allTeamsBatting.length > 0) {
      calculateLeagueRankings();
    }
  }, [teamBattingData, allTeamsBatting, allTeamsPitching]);
  
  const calculateLeagueRankings = () => {
    if (!teamBattingData || !allTeamsBatting.length) return;
    
    const rankings = {};
    const stats = ['AVG', 'HR', 'RBI', 'OPS', 'R', 'SB'];
    
    stats.forEach(stat => {
      const sorted = [...allTeamsBatting]
        .map((team, idx) => ({ team: team.Team, value: parseFloat(team[stat]) || 0, idx }))
        .sort((a, b) => b.value - a.value);
      
      const rank = sorted.findIndex(t => t.team === teamBattingData.Team) + 1;
      rankings[stat] = { rank, total: sorted.length };
    });
    
    // Add pitching rankings
    if (teamPitchingData && allTeamsPitching.length > 0) {
      const pitchingStats = ['ERA', 'WHIP', 'SO'];
      
      pitchingStats.forEach(stat => {
        const sorted = [...allTeamsPitching]
          .map((team, idx) => ({ team: team.Team, value: parseFloat(team[stat]) || 99, idx }))
          .sort((a, b) => {
            // ERA and WHIP: lower is better
            if (stat === 'ERA' || stat === 'WHIP') return a.value - b.value;
            // SO: higher is better
            return b.value - a.value;
          });
        
        const rank = sorted.findIndex(t => t.team === teamPitchingData.Team) + 1;
        rankings[stat] = { rank, total: sorted.length };
      });
    }
    
    setLeagueRankings(rankings);
  };
  
  const getRankBadge = (stat) => {
    const ranking = leagueRankings[stat];
    if (!ranking) return null;
    
    const { rank, total } = ranking;
    let variant = 'secondary';
    
    if (rank <= 5) variant = 'success';
    else if (rank <= 10) variant = 'primary';
    else if (rank <= 20) variant = 'info';
    else if (rank >= total - 5) variant = 'danger';
    
    return <Badge bg={variant} className="ms-2">{rank}/{total}</Badge>;
  };
  
  // Prepare radar chart data
  const getRadarData = () => {
    if (!teamBattingData || !allTeamsBatting.length) return [];
    
    const calculatePercentile = (value, stat) => {
      const values = allTeamsBatting
        .map(t => parseFloat(t[stat]) || 0)
        .sort((a, b) => a - b);
      
      const index = values.findIndex(v => v >= value);
      return index === -1 ? 100 : Math.round((index / values.length) * 100);
    };
    
    return [
      {
        stat: 'Power',
        value: calculatePercentile(teamBattingData.HR, 'HR'),
        fullMark: 100
      },
      {
        stat: 'Average',
        value: calculatePercentile(parseFloat(teamBattingData.AVG), 'AVG'),
        fullMark: 100
      },
      {
        stat: 'Discipline',
        value: calculatePercentile(teamBattingData.BB, 'BB'),
        fullMark: 100
      },
      {
        stat: 'Production',
        value: calculatePercentile(teamBattingData.R, 'R'),
        fullMark: 100
      },
      {
        stat: 'Contact',
        value: 100 - calculatePercentile(teamBattingData.SO, 'SO'),
        fullMark: 100
      }
    ];
  };
  
  // Team strength comparison
  const getStrengthComparison = () => {
    if (!teamBattingData || !teamPitchingData) return null;
    
    const offenseRank = leagueRankings['OPS']?.rank || 15;
    const pitchingRank = leagueRankings['ERA']?.rank || 15;
    
    const offenseScore = ((30 - offenseRank) / 30) * 100;
    const pitchingScore = ((30 - pitchingRank) / 30) * 100;
    
    return [
      { category: 'Offense', score: offenseScore },
      { category: 'Pitching', score: pitchingScore }
    ];
  };
  
  if (!teamBattingData) {
    return (
      <Alert variant="info">
        <Alert.Heading>No Team Data Available</Alert.Heading>
        <p>Team statistics will be displayed here once data is loaded.</p>
      </Alert>
    );
  }
  
  return (
    <div className="enhanced-team-dashboard">
      {/* Header Stats Cards */}
      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <Card className="stat-card border-start border-primary border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-label">Team Batting Avg</div>
                  <div className="stat-value">{formatStat('AVG', teamBattingData.AVG)}</div>
                  {getRankBadge('AVG')}
                </div>
                <div className="stat-icon bg-primary">
                  <i className="bi bi-graph-up"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3}>
          <Card className="stat-card border-start border-success border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-label">Home Runs</div>
                  <div className="stat-value">{teamBattingData.HR || 0}</div>
                  {getRankBadge('HR')}
                </div>
                <div className="stat-icon bg-success">
                  <i className="bi bi-trophy"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3}>
          <Card className="stat-card border-start border-info border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-label">Team OPS</div>
                  <div className="stat-value">{formatStat('OPS', teamBattingData.OPS)}</div>
                  {getRankBadge('OPS')}
                </div>
                <div className="stat-icon bg-info">
                  <i className="bi bi-speedometer2"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3}>
          <Card className="stat-card border-start border-warning border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-label">Runs Scored</div>
                  <div className="stat-value">{teamBattingData.R || 0}</div>
                  {getRankBadge('R')}
                </div>
                <div className="stat-icon bg-warning">
                  <i className="bi bi-lightning"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Visualizations */}
      <Row className="g-4 mb-4">
        {/* Radar Chart - Team Profile */}
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Team Profile (Percentile Rankings)</h6>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={getRadarData()}>
                  <PolarGrid stroke="#dee2e6" />
                  <PolarAngleAxis 
                    dataKey="stat" 
                    tick={{ fill: '#6c757d', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: '#6c757d', fontSize: 10 }}
                  />
                  <Radar 
                    name="Team" 
                    dataKey="value" 
                    stroke="#0d6efd" 
                    fill="#0d6efd" 
                    fillOpacity={0.6} 
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Bar Chart - Offense vs Pitching */}
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Team Strength Analysis</h6>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getStrengthComparison()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#0d6efd" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-center mt-2 small text-muted">
                Score based on league rankings (0-100)
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Detailed Stats Tables */}
      <Row className="g-4">
        {/* Batting Stats */}
        <Col lg={6}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-bar-chart-fill me-2"></i>
                Offensive Statistics
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped hover className="mb-0">
                <tbody>
                  <tr>
                    <td>Games Played</td>
                    <td className="text-end fw-bold">{teamBattingData.G}</td>
                  </tr>
                  <tr>
                    <td>At Bats</td>
                    <td className="text-end fw-bold">{teamBattingData.AB}</td>
                  </tr>
                  <tr>
                    <td>Hits</td>
                    <td className="text-end fw-bold">{teamBattingData.H}</td>
                  </tr>
                  <tr>
                    <td>Doubles</td>
                    <td className="text-end fw-bold">{teamBattingData['2B'] || 0}</td>
                  </tr>
                  <tr>
                    <td>Triples</td>
                    <td className="text-end fw-bold">{teamBattingData['3B'] || 0}</td>
                  </tr>
                  <tr>
                    <td>RBIs</td>
                    <td className="text-end fw-bold">{teamBattingData.RBI || 0}</td>
                  </tr>
                  <tr>
                    <td>Walks</td>
                    <td className="text-end fw-bold">{teamBattingData.BB || 0}</td>
                  </tr>
                  <tr>
                    <td>Strikeouts</td>
                    <td className="text-end fw-bold">{teamBattingData.SO || 0}</td>
                  </tr>
                  <tr>
                    <td>Stolen Bases</td>
                    <td className="text-end fw-bold">{teamBattingData.SB || 0}</td>
                  </tr>
                  <tr className="table-primary">
                    <td><strong>On-Base %</strong></td>
                    <td className="text-end fw-bold">{formatStat('OBP', teamBattingData.OBP)}</td>
                  </tr>
                  <tr className="table-primary">
                    <td><strong>Slugging %</strong></td>
                    <td className="text-end fw-bold">{formatStat('SLG', teamBattingData.SLG)}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Pitching Stats */}
        {teamPitchingData && (
          <Col lg={6}>
            <Card>
              <Card.Header className="bg-success text-white">
                <h6 className="mb-0">
                  <i className="bi bi-bullseye me-2"></i>
                  Pitching Statistics
                </h6>
              </Card.Header>
              <Card.Body className="p-0">
                <Table striped hover className="mb-0">
                  <tbody>
                    <tr>
                      <td>Wins</td>
                      <td className="text-end fw-bold">{teamPitchingData.W || 0}</td>
                    </tr>
                    <tr>
                      <td>Losses</td>
                      <td className="text-end fw-bold">{teamPitchingData.L || 0}</td>
                    </tr>
                    <tr>
                      <td>Saves</td>
                      <td className="text-end fw-bold">{teamPitchingData.SV || 0}</td>
                    </tr>
                    <tr>
                      <td>Innings Pitched</td>
                      <td className="text-end fw-bold">{formatStat('IP', teamPitchingData.IP)}</td>
                    </tr>
                    <tr>
                      <td>Hits Allowed</td>
                      <td className="text-end fw-bold">{teamPitchingData.H || 0}</td>
                    </tr>
                    <tr>
                      <td>Runs Allowed</td>
                      <td className="text-end fw-bold">{teamPitchingData.R || 0}</td>
                    </tr>
                    <tr>
                      <td>Home Runs Allowed</td>
                      <td className="text-end fw-bold">{teamPitchingData.HR || 0}</td>
                    </tr>
                    <tr>
                      <td>Walks Allowed</td>
                      <td className="text-end fw-bold">{teamPitchingData.BB || 0}</td>
                    </tr>
                    <tr>
                      <td>Strikeouts</td>
                      <td className="text-end fw-bold">{teamPitchingData.SO || 0} {getRankBadge('SO')}</td>
                    </tr>
                    <tr className="table-success">
                      <td><strong>ERA</strong></td>
                      <td className="text-end fw-bold">{formatStat('ERA', teamPitchingData.ERA)} {getRankBadge('ERA')}</td>
                    </tr>
                    <tr className="table-success">
                      <td><strong>WHIP</strong></td>
                      <td className="text-end fw-bold">{formatStat('WHIP', teamPitchingData.WHIP)} {getRankBadge('WHIP')}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default EnhancedTeamDashboard;
