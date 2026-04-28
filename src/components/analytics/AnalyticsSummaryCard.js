import React from 'react';
import '../styles/Analytics.css';

function AnalyticsSummaryCard({ label, value, meta, accent = 'blue' }) {
  return (
    <div className={`analytics-summary-card analytics-summary-card--${accent}`}>
      <div className="analytics-summary-label">{label}</div>
      <div className="analytics-summary-value">{value}</div>
      {meta ? <div className="analytics-summary-meta">{meta}</div> : null}
    </div>
  );
}

export default AnalyticsSummaryCard;

