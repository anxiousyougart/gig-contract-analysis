import React from 'react'

export default function MissingClauses({ missingClauses }) {
  if (!missingClauses || missingClauses.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '2rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1.25rem auto', color: 'var(--color-primary)' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
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
