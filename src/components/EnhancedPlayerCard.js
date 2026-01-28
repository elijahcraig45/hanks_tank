import React, { useState } from 'react';
import { Card, Row, Col, Badge, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  calculateWOBA, 
  calculateISO, 
  calculateBABIP, 
  calculateBBPercent,
  calculateKPercent,
  getOPSRating,
  calculatePA,
  formatStat 
} from '../utils/statsCalculations';
import './styles/EnhancedPlayerCard.css';

/**
 * Enhanced Player Stat Card
 * Displays comprehensive player statistics with advanced metrics and visualizations
 */
const EnhancedPlayerCard = ({ player, rank, showRank = true, showAdvanced = true }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!player) return null;
  
  // Calculate advanced metrics
  const wOBA = calculateWOBA(player);
  const iso = calculateISO(player);
  const babip = calculateBABIP(player);
  const bbPercent = calculateBBPercent(player);
  const kPercent = calculateKPercent(player);
  const pa = calculatePA(player);
  
  // Get OPS rating
  const opsRating = getOPSRating(player.OPS);
  
  // Calculate power metrics
  const extraBaseHits = (parseInt(player['2B']) || 0) + (parseInt(player['3B']) || 0) + (parseInt(player.HR) || 0);
  const xbhPercentage = player.H > 0 ? ((extraBaseHits / player.H) * 100).toFixed(1) : 0;
  
  // Calculate discipline metrics
  const contactRate = pa > 0 ? (((pa - parseInt(player.SO || 0)) / pa) * 100).toFixed(1) : 0;
  const walkRate = parseFloat(bbPercent);
  const strikeoutRate = parseFloat(kPercent);
  
  return (
    <Card className="enhanced-player-card mb-3 shadow-sm hover-lift">
      <Card.Body>
        <Row className="align-items-center">
          {/* Rank Badge */}
          {showRank && rank && (
            <Col xs="auto" className="pe-0">
              <div className="rank-badge">
                <div className={`rank-number ${rank <= 10 ? 'top-10' : ''}`}>
                  {rank}
                </div>
              </div>
            </Col>
          )}
          
          {/* Player Info */}
          <Col>
            <div className="d-flex align-items-center mb-2">
              <h5 className="mb-0 me-3">
                <a href={`/player/${player.playerId}`} className="player-link">
                  {player.Name}
                </a>
              </h5>
              <Badge bg="primary" className="me-2">{player.Team}</Badge>
              {player.Pos && <Badge bg="secondary">{player.Pos}</Badge>}
            </div>
            
            {/* Key Stats Row */}
            <Row className="g-2 mb-2">
              <Col xs={6} sm={3} md={2}>
                <div className="stat-item">
                  <div className="stat-label">AVG</div>
                  <div className="stat-value">{formatStat('AVG', player.AVG)}</div>
                </div>
              </Col>
              <Col xs={6} sm={3} md={2}>
                <div className="stat-item">
                  <div className="stat-label">HR</div>
                  <div className="stat-value">{player.HR || 0}</div>
                </div>
              </Col>
              <Col xs={6} sm={3} md={2}>
                <div className="stat-item">
                  <div className="stat-label">RBI</div>
                  <div className="stat-value">{player.RBI || 0}</div>
                </div>
              </Col>
              <Col xs={6} sm={3} md={2}>
                <div className="stat-item">
                  <div className="stat-label">OPS</div>
                  <div className="stat-value" style={{ color: opsRating.color }}>
                    {formatStat('OPS', player.OPS)}
                  </div>
                </div>
              </Col>
              <Col xs={6} sm={3} md={2}>
                <div className="stat-item">
                  <div className="stat-label">wOBA</div>
                  <div className="stat-value">{wOBA}</div>
                </div>
              </Col>
              <Col xs={6} sm={3} md={2}>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>{opsRating.label} ({opsRating.tier})</Tooltip>}
                >
                  <div className="stat-item">
                    <div className="stat-label">Rating</div>
                    <Badge 
                      bg="none" 
                      className="stat-value px-2"
                      style={{ backgroundColor: opsRating.color, color: 'white' }}
                    >
                      {opsRating.tier}
                    </Badge>
                  </div>
                </OverlayTrigger>
              </Col>
            </Row>
            
            {/* Advanced Stats Toggle */}
            {showAdvanced && (
              <>
                <div className="text-end mb-2">
                  <button 
                    className="btn btn-sm btn-link p-0 text-decoration-none"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {showDetails && (
                  <div className="advanced-stats mt-3 pt-3 border-top">
                    <Row className="g-3">
                      {/* Traditional Stats */}
                      <Col md={6}>
                        <h6 className="text-muted mb-3">
                          <i className="bi bi-bar-chart-fill me-2"></i>
                          Traditional Stats
                        </h6>
                        <Row className="g-2 small">
                          <Col xs={6}>
                            <strong>Games:</strong> {player.G || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>PA:</strong> {pa}
                          </Col>
                          <Col xs={6}>
                            <strong>At Bats:</strong> {player.AB || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Runs:</strong> {player.R || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Hits:</strong> {player.H || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Doubles:</strong> {player['2B'] || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Triples:</strong> {player['3B'] || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Walks:</strong> {player.BB || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Strikeouts:</strong> {player.SO || 0}
                          </Col>
                          <Col xs={6}>
                            <strong>Stolen Bases:</strong> {player.SB || 0}
                          </Col>
                        </Row>
                      </Col>
                      
                      {/* Advanced Metrics */}
                      <Col md={6}>
                        <h6 className="text-muted mb-3">
                          <i className="bi bi-graph-up me-2"></i>
                          Advanced Metrics
                        </h6>
                        <Row className="g-2 small">
                          <Col xs={6}>
                            <strong>ISO:</strong> {iso}
                          </Col>
                          <Col xs={6}>
                            <strong>BABIP:</strong> {babip}
                          </Col>
                          <Col xs={6}>
                            <strong>XBH%:</strong> {xbhPercentage}%
                          </Col>
                          <Col xs={6}>
                            <strong>Contact:</strong> {contactRate}%
                          </Col>
                        </Row>
                        
                        {/* Discipline Bars */}
                        <div className="mt-3">
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small">
                              <span>Walk Rate</span>
                              <span className="text-success">{bbPercent}%</span>
                            </div>
                            <ProgressBar 
                              now={Math.min(walkRate, 20)} 
                              max={20} 
                              variant="success" 
                              className="stat-progress"
                            />
                          </div>
                          <div>
                            <div className="d-flex justify-content-between small">
                              <span>Strikeout Rate</span>
                              <span className="text-danger">{kPercent}%</span>
                            </div>
                            <ProgressBar 
                              now={Math.min(strikeoutRate, 40)} 
                              max={40} 
                              variant="danger" 
                              className="stat-progress"
                            />
                          </div>
                        </div>
                      </Col>
                    </Row>
                    
                    {/* Slash Line */}
                    <div className="slash-line mt-3 pt-3 border-top text-center">
                      <div className="text-muted small mb-1">Slash Line</div>
                      <div className="h5 mb-0 font-monospace">
                        {formatStat('AVG', player.AVG)} / {formatStat('OBP', player.OBP)} / {formatStat('SLG', player.SLG)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default EnhancedPlayerCard;
