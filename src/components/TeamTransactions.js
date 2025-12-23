import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import axios from 'axios';
import '../App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const TeamTransactions = ({ teamId, teamName }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breakdown, setBreakdown] = useState({});
  const [dateRange, setDateRange] = useState('30'); // Default to last 30 days

  useEffect(() => {
    if (teamId) {
      fetchTeamTransactions();
      fetchTransactionBreakdown();
    }
  }, [teamId, dateRange]);

  const getDateRange = () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    
    switch (dateRange) {
      case '7':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '365':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'season':
        startDate.setMonth(0, 1); // January 1st of current year
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate
    };
  };

  const fetchTeamTransactions = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      
      const response = await axios.get(
        `${API_BASE_URL}/api/transactions/team/${teamId}`,
        { params: { startDate, endDate } }
      );
      
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching team transactions:', err);
      setError('Failed to load team transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionBreakdown = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      const response = await axios.get(
        `${API_BASE_URL}/api/transactions/team/${teamId}/breakdown`,
        { params: { startDate, endDate } }
      );
      
      if (response.data.success) {
        setBreakdown(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching transaction breakdown:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getTransactionIcon = (typeDesc) => {
    const icons = {
      'Trade': '🔄',
      'Signed': '✍️',
      'Released': '🚪',
      'Selected off waivers': '📋',
      'Recalled': '⬆️',
      'Optioned': '⬇️',
      'Designated for assignment': '⚠️',
      'Placed on IL': '🏥',
      'Activated': '✅',
      'Returned': '↩️'
    };
    return icons[typeDesc] || '📝';
  };

  if (loading && transactions.length === 0) {
    return <div className="loading">Loading team transactions...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <Container className="team-transactions my-4">
      <div className="transactions-header">
        <h2>{teamName} Transactions</h2>
        
        <div className="date-range-selector">
          <label>Time Period:</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
            <option value="season">This Season</option>
          </select>
        </div>
      </div>

      {/* Transaction Type Breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div className="breakdown-section">
          <h3>Transaction Summary</h3>
          <div className="breakdown-grid">
            {Object.entries(breakdown).map(([type, count]) => (
              <div key={type} className="breakdown-item">
                <span className="breakdown-icon">{getTransactionIcon(type)}</span>
                <span className="breakdown-type">{type}</span>
                <span className="breakdown-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Timeline */}
      <div className="transactions-timeline">
        <h3>Recent Activity ({transactions.length} transactions)</h3>
        
        {transactions.length === 0 ? (
          <div className="no-transactions">
            No transactions in the selected time period.
          </div>
        ) : (
          <div className="timeline-items">
            {transactions.map((transaction, index) => (
              <div key={transaction.id || index} className="timeline-item">
                <div className="timeline-marker">
                  <span className="timeline-icon">
                    {getTransactionIcon(transaction.typeDesc)}
                  </span>
                </div>
                
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-type">{transaction.typeDesc}</span>
                    <span className="timeline-date">{formatDate(transaction.date)}</span>
                  </div>
                  
                  <div className="timeline-details">
                    <strong>{transaction.person.fullName}</strong>
                    <p>{transaction.description}</p>
                    
                    {transaction.resolution && (
                      <div className="timeline-resolution">
                        <em>{transaction.resolution}</em>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .team-transactions {
          padding: 20px;
        }

        .transactions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .transactions-header h2 {
          margin: 0;
          color: #333;
        }

        .date-range-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-range-selector label {
          font-weight: 600;
          font-size: 14px;
        }

        .date-range-selector select {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .breakdown-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }

        .breakdown-section h3 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 18px;
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #007bff;
        }

        .breakdown-icon {
          font-size: 20px;
        }

        .breakdown-type {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #555;
        }

        .breakdown-count {
          font-size: 18px;
          font-weight: 700;
          color: #007bff;
        }

        .transactions-timeline {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .transactions-timeline h3 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
        }

        .timeline-items {
          position: relative;
          padding-left: 40px;
        }

        .timeline-items::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e9ecef;
        }

        .timeline-item {
          position: relative;
          margin-bottom: 24px;
        }

        .timeline-marker {
          position: absolute;
          left: -40px;
          top: 0;
          width: 32px;
          height: 32px;
          background: white;
          border: 2px solid #007bff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timeline-icon {
          font-size: 14px;
        }

        .timeline-content {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 6px;
          border-left: 3px solid #007bff;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .timeline-type {
          font-weight: 600;
          color: #007bff;
          font-size: 14px;
        }

        .timeline-date {
          font-size: 12px;
          color: #666;
        }

        .timeline-details strong {
          color: #333;
          font-size: 15px;
        }

        .timeline-details p {
          margin: 8px 0 0 0;
          color: #555;
          font-size: 14px;
          line-height: 1.5;
        }

        .timeline-resolution {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #dee2e6;
          font-size: 13px;
          color: #666;
        }

        .no-transactions {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .loading, .error {
          text-align: center;
          padding: 40px;
        }

        .error {
          color: #dc3545;
        }
      `}</style>
    </Container>
  );
};

export default TeamTransactions;
