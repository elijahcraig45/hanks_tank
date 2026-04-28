import React from 'react';
import { Card } from 'react-bootstrap';
import '../styles/Analytics.css';

function AnalyticsPanel({ title, subtitle, actions, children, className = '' }) {
  return (
    <Card className={`analytics-panel border-0 shadow-sm ${className}`.trim()}>
      <Card.Header className="analytics-panel-header bg-white">
        <div>
          <div className="analytics-panel-title">{title}</div>
          {subtitle ? <div className="analytics-panel-subtitle">{subtitle}</div> : null}
        </div>
        {actions ? <div className="analytics-panel-actions">{actions}</div> : null}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}

export default AnalyticsPanel;

