import React from 'react';
import { Card, Row, Col, Table, Badge } from 'react-bootstrap';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer 
} from 'recharts';
import { 
  calculateWOBA, calculateISO, calculateBABIP, calculateBBPercent, 
  calculateKPercent, formatStat, getOPSRating 
} from '../utils/statsCalculations';
import './styles/EnhancedComparison.css';

/**
 * Enhanced Comparison Widget
 * Quick comparison view for selected players (used within existing pages)
 */
const EnhancedComparison = ({ players = [] }) => {
  if (players.length < 2) {
    return null;
  }
  
  // Calculate advanced stats for all players
  const playersWithAdvancedStats = players.map(player => ({
    ...player,
    wOBA: calculateWOBA(player),
    ISO: calculateISO(player),
    BABIP: calculateBABIP(player),
    BBPercent: calculateBBPercent(player),
    KPercent: calculateKPercent(player),
    OPSRating: getOPSRating(player.OPS)
  }));
  
  // Prepare radar chart data
  const getRadarData = () => {
    const stats = ['AVG', 'OBP', 'SLG', 'wOBA', 'ISO'];
    
    return stats.map(stat => {
      const dataPoint = { stat };
      
      playersWithAdvancedStats.forEach((player, idx) => {
        let value = parseFloat(player[stat]) || 0;
        
        // Normalize to 0-1000 scale for better visualization
        if (stat === 'AVG' || stat === 'OBP' || stat === 'SLG' || stat === 'wOBA') {
          value = value * 1000;
        } else if (stat === 'ISO') {
          value = value * 1000;
        }
        
        dataPoint[player.Name] = Math.round(value);
      });
      
      return dataPoint;
    });
  };
  
  const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545'];
  
  return (
    <Card className="enhanced-comparison-widget">
      <Card.Header className="bg-primary text-white">
        <h6 className="mb-0">
          <i className="bi bi-bar-chart-line me-2"></i>
          Quick Comparison ({players.length} players)
        </h6>
      </Card.Header>
      <Card.Body>
        <Row>
          {/* Player Cards */}
          <Col lg={4}>
            <div className="comparison-players">
              {playersWithAdvancedStats.map((player, idx) => (
                <Card key={idx} className="mb-2 player-summary-card" style={{ borderLeft: `4px solid ${COLORS[idx]}` }}>
                  <Card.Body className="py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold small">{player.Name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {player.Team} • {player.Pos}
                        </div>
                      </div>
                      <Badge bg={player.OPSRating.color} className="ms-2">
                        {player.OPSRating.grade}
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </Col>
          
          {/* Radar Chart */}
          <Col lg={8}>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={getRadarData()}>
                <PolarGrid stroke="#dee2e6" />
                <PolarAngleAxis 
                  dataKey="stat" 
                  tick={{ fill: '#6c757d', fontSize: 11 }}
                />
                <PolarRadiusAxis angle={90} tick={{ fill: '#6c757d', fontSize: 9 }} />
                
                {playersWithAdvancedStats.map((player, idx) => (
                  <Radar
                    key={idx}
                    name={player.Name}
                    dataKey={player.Name}
                    stroke={COLORS[idx]}
                    fill={COLORS[idx]}
                    fillOpacity={0.25}
                  />
                ))}
                
                <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div className="text-center mt-1 small text-muted">
              Stats scaled for visualization (×1000)
            </div>
          </Col>
        </Row>
        
        {/* Quick Stats Table */}
        <div className="table-responsive mt-3">
          <Table striped size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Stat</th>
                {playersWithAdvancedStats.map((player, idx) => (
                  <th key={idx} className="text-center" style={{ color: COLORS[idx] }}>
                    {player.Name.split(' ').pop()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-semibold">AVG</td>
                {playersWithAdvancedStats.map((p, idx) => (
                  <td key={idx} className="text-center">{formatStat('AVG', p.AVG)}</td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold">HR</td>
                {playersWithAdvancedStats.map((p, idx) => (
                  <td key={idx} className="text-center">{p.HR || 0}</td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold">RBI</td>
                {playersWithAdvancedStats.map((p, idx) => (
                  <td key={idx} className="text-center">{p.RBI || 0}</td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold">OPS</td>
                {playersWithAdvancedStats.map((p, idx) => (
                  <td key={idx} className="text-center fw-bold">{formatStat('OPS', p.OPS)}</td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold">wOBA</td>
                {playersWithAdvancedStats.map((p, idx) => (
                  <td key={idx} className="text-center">{formatStat('wOBA', p.wOBA)}</td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold">ISO</td>
                {playersWithAdvancedStats.map((p, idx) => (
                  <td key={idx} className="text-center">{formatStat('ISO', p.ISO)}</td>
                ))}
              </tr>
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
};

export default EnhancedComparison;
