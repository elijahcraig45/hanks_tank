import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

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
      const response = await axios.get(`${API_BASE_URL}/api/transactions/recent`);
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
      const response = await axios.get(`${API_BASE_URL}/api/v2/teams`);
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

      const response = await axios.get(`${API_BASE_URL}/api/transactions`, { params });
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
      <div className="container">
        <div className="loading">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>MLB Transactions</h1>

      {/* Filter Section */}
      <div className="transactions-filters">
        <div className="filter-group">
          <label>Team:</label>
          <select 
            value={filter.teamId} 
            onChange={(e) => handleFilterChange('teamId', e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={filter.typeDesc} 
            onChange={(e) => handleFilterChange('typeDesc', e.target.value)}
          >
            <option value="">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input 
            type="date" 
            value={filter.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input 
            type="date" 
            value={filter.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button onClick={handleApplyFilter} className="btn-primary">
            Apply Filters
          </button>
          <button onClick={handleResetFilter} className="btn-secondary">
            Reset
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="transactions-list">
        <div className="transactions-count">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>

        {transactions.map((transaction, index) => (
          <div key={transaction.id || index} className="transaction-card">
            <div className="transaction-header">
              <span 
                className="transaction-type" 
                style={{ backgroundColor: getTransactionTypeColor(transaction.typeDesc) }}
              >
                {transaction.typeDesc}
              </span>
              <span className="transaction-date">
                {formatDate(transaction.date)}
              </span>
            </div>

            <div className="transaction-body">
              <div className="transaction-player">
                <strong>{transaction.person.fullName}</strong>
              </div>
              
              <div className="transaction-teams">
                {transaction.fromTeam && (
                  <span className="team-badge from-team">
                    From: {transaction.fromTeam.name}
                  </span>
                )}
                {transaction.toTeam && (
                  <span className="team-badge to-team">
                    To: {transaction.toTeam.name}
                  </span>
                )}
              </div>

              <div className="transaction-description">
                {transaction.description}
              </div>

              {transaction.resolution && (
                <div className="transaction-resolution">
                  <em>Resolution: {transaction.resolution}</em>
                </div>
              )}

              {transaction.notes && (
                <div className="transaction-notes">
                  <small>{transaction.notes}</small>
                </div>
              )}
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="no-transactions">
            No transactions found for the selected filters.
          </div>
        )}
      </div>

      <style jsx>{`
        .transactions-filters {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-weight: 600;
          margin-bottom: 4px;
          font-size: 14px;
          color: #555;
        }

        .filter-group select,
        .filter-group input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .btn-primary, .btn-secondary {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .transactions-count {
          font-size: 14px;
          color: #666;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .transaction-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
          transition: box-shadow 0.2s;
        }

        .transaction-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .transaction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .transaction-type {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 16px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .transaction-date {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .transaction-body {
          padding: 16px;
        }

        .transaction-player {
          font-size: 16px;
          margin-bottom: 8px;
          color: #333;
        }

        .transaction-teams {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .team-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .from-team {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .to-team {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }

        .transaction-description {
          font-size: 14px;
          color: #555;
          line-height: 1.5;
        }

        .transaction-resolution {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e9ecef;
          font-size: 13px;
          color: #666;
        }

        .transaction-notes {
          margin-top: 8px;
          color: #888;
          font-size: 12px;
        }

        .no-transactions {
          text-align: center;
          padding: 40px;
          color: #999;
          font-size: 16px;
        }

        .loading, .error {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }

        .error {
          color: #dc3545;
        }
      `}</style>
    </div>
  );
};

export default Transactions;
