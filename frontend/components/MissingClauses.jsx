import React from 'react'

export default function MissingClauses({ missingClauses }) {
  if (!missingClauses || missingClauses.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
        <h3>No Missing Clauses</h3>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>All critical protection clauses exist in this contract!</p>
      </div>
    );
  }

  return (
    <div className="list-container">
      {missingClauses.map((clause, idx) => {
        const importanceClass = (clause.importance || 'medium').toLowerCase();
        
        return (
          <div className="risk-item missing-clause-item" key={idx}>
            <div className="risk-header">
              <span className="risk-title">{clause.clause_name}</span>
              <span className={`badge ${importanceClass}`}>{clause.importance} IMPORTANCE</span>
            </div>
            
            <p className="risk-desc">{clause.reason}</p>
          </div>
        );
      })}
    </div>
  );
}
