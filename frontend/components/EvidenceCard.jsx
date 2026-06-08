import React from 'react'

export default function EvidenceCard({ evidence }) {
  if (!evidence || evidence.length === 0) {
    return <div className="text-muted">No evidence mappings available.</div>;
  }

  return (
    <div className="list-container">
      {evidence.map((item, idx) => {
        return (
          <div className="risk-item" key={idx}>
            <div className="risk-header">
              <span className="risk-title" style={{ fontSize: '1.05rem', color: '#c7d2fe' }}>
                Evidence for: {item.risk_name}
              </span>
              {item.clause_reference && (
                <span className="badge low" style={{ textTransform: 'none' }}>
                  {item.clause_reference}
                </span>
              )}
            </div>
            
            <p className="risk-desc" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              {item.explanation}
            </p>
            
            {item.quote && (
              <div className="risk-quote">
                "{item.quote}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
