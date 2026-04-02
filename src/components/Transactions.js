import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://hankstank.uc.r.appspot.com/api';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    teamId: '',
    startDate: '',
    endDate: '',
    typeDesc: ''
  });
  const [teams, setTeams] = useState([]);

  // Fetch recent transactions on component mount
  useEffect(() => {
    fetchRecentTransactions();
    fetchTeams();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/transactions/recent`);
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load recent transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/v2/teams`);
      if (response.data.success) {
        setTeams(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const fetchFilteredTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.teamId) params.teamId = filter.teamId;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;

      const response = await axios.get(`${API_BASE_URL}/transactions`, { params });
      if (response.data.success) {
        let data = response.data.data;
        
        // Client-side filter for transaction type if specified
        if (filter.typeDesc) {
          data = data.filter(t => t.typeDesc === filter.typeDesc);
        }
        
        setTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching filtered transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilter(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilter = () => {
    fetchFilteredTransactions();
  };

  const handleResetFilter = () => {
    setFilter({
      teamId: '',
      startDate: '',
      endDate: '',
      typeDesc: ''
    });
    fetchRecentTransactions();
  };

  const getTransactionTypeColor = (typeDesc) => {
    const colors = {
      'Trade': '#FF6B6B',
      'Signed': '#4ECDC4',
      'Released': '#95A5A6',
      'Selected off waivers': '#F39C12',
      'Returned': '#3498DB',
      'Recalled': '#9B59B6',
      'Optioned': '#E67E22',
      'Designated for assignment': '#E74C3C',
      'Placed on IL': '#C0392B',
      'Activated': '#27AE60'
    };
    return colors[typeDesc] || '#34495E';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get unique transaction types for filter dropdown
  const uniqueTypes = [...new Set(transactions.map(t => t.typeDesc))].sort();

  if (loading && transactions.length === 0) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" role="status" />
        <p className="mt-2 text-muted">Loading transactions...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <h4 className="mb-4">MLB Transactions</h4>

      {/* Filter Section */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col sm={3}>
              <Form.Label className="fw-semibold small">Team</Form.Label>
              <Form.Select
                size="sm"
                value={filter.teamId}
                onChange={(e) => handleFilterChange('teamId', e.target.value)}
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col sm={3}>
              <Form.Label className="fw-semibold small">Type</Form.Label>
              <Form.Select
                size="sm"
                value={filter.typeDesc}
                onChange={(e) => handleFilterChange('typeDesc', e.target.value)}
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Col>
            <Col sm={2}>
              <Form.Label className="fw-semibold small">Start Date</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                value={filter.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </Col>
            <Col sm={2}>
              <Form.Label className="fw-semibold small">End Date</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                value={filter.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </Col>
            <Col sm={2} className="d-flex gap-2">
              <Button size="sm" variant="primary" onClick={handleApplyFilter}>Apply</Button>
              <Button size="sm" variant="outline-secondary" onClick={handleResetFilter}>Reset</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Transactions List */}
      <p className="text-muted small mb-3">
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </p>

      {transactions.length === 0 ? (
        <Alert variant="secondary" className="text-center">
          No transactions found for the selected filters.
        </Alert>
      ) : (
        <div className="d-flex flex-column gap-2">
          {transactions.map((transaction, index) => (
            <Card key={transaction.id || index} className="shadow-sm">
              <Card.Body className="py-2 px-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <Badge
                      className="me-2"
                      style={{
                        backgroundColor: getTransactionTypeColor(transaction.typeDesc),
                        fontSize: '0.7rem'
                      }}
                    >
                      {transaction.typeDesc}
                    </Badge>
                    <strong className="me-2">{transaction.person?.fullName}</strong>
                    {transaction.fromTeam && (
                      <Badge bg="warning" text="dark" className="me-1" style={{ fontSize: '0.7rem' }}>
                        From: {transaction.fromTeam.name}
                      </Badge>
                    )}
                    {transaction.toTeam && (
                      <Badge bg="info" className="me-1" style={{ fontSize: '0.7rem' }}>
                        To: {transaction.toTeam.name}
                      </Badge>
                    )}
                  </div>
                  <small className="text-muted text-nowrap ms-2">{formatDate(transaction.date)}</small>
                </div>
                {transaction.description && (
                  <p className="mb-0 mt-1 text-muted small">{transaction.description}</p>
                )}
                {transaction.resolution && (
                  <p className="mb-0 mt-1 small fst-italic text-muted">
                    Resolution: {transaction.resolution}
                  </p>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
};

export default Transactions;
