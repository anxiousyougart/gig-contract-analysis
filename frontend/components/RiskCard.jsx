import React from 'react'

export default function RiskCard({ risks }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '2rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1.25rem auto', color: 'var(--color-success)' }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <h3>No Risks Found</h3>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>This agreement doesn't contain any flagged risks!</p>
      </div>
    );
  }

  return (
    <div className="list-container">
      {risks.map((risk, idx) => {
        const severityClass = (risk.severity || 'low').toLowerCase();
        
        return (
          <div className="risk-item" key={idx}>
            <div className="risk-header">
              <span className="risk-title">{risk.risk_name}</span>
              <span className={`badge ${severityClass}`}>{risk.severity}</span>
            </div>
            
            <p className="risk-desc">{risk.explanation}</p>
            
            {risk.affected_clause && (
              <div className="risk-ref">
                Affected Clause: <strong>{risk.affected_clause.replace(/_/g, ' ')}</strong>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
