import React from 'react'

const METRIC_DESCRIPTIONS = {
  obligations_balance: "Evaluates how balanced the work requirements, IP transfers, and client cooperation obligations are. Mutuality prevents unfair demands.",
  risk_exposure: "Assesses liability caps, indemnification scopes, and warranty terms. Clear caps protect your personal assets from claims.",
  termination_fairness: "Checks notice periods (e.g. 30 days) and exit clauses. Mutual termination rights prevent sudden client drops.",
  dispute_resolution: "Ensures governing law and legal jurisdiction are local to you. Avoids expensive foreign arbitration or court travel.",
  payment_fairness: "Looks for late fee terms, invoicing timelines, and clear payment schedules (Net-30) to secure your cash flow."
};

export default function FairnessCard({ breakdown }) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return <div className="text-muted">No breakdown data available.</div>;
  }

  const formatKeyName = (key) => {
    return key.replace(/_/g, ' ');
  };

  const getPercentage = (val, key) => {
    const maxVal = key === 'risk_exposure' ? 20 : 15;
    return Math.min(100, Math.round((val / maxVal) * 100));
  };

  return (
    <div className="breakdown-grid">
      {Object.entries(breakdown).map(([key, val]) => {
        const pct = getPercentage(val, key);
        const desc = METRIC_DESCRIPTIONS[key.toLowerCase()] || "Evaluation of contract clause balance and potential operational impact.";
        return (
          <div className="breakdown-card" key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="breakdown-header">
              <span className="breakdown-name" style={{ textTransform: 'capitalize' }}>{formatKeyName(key)}</span>
              <span className="breakdown-score">{val} pts</span>
            </div>
            <div className="breakdown-bar-bg">
              <div 
                className="breakdown-bar-fill" 
                style={{ width: `${pct}%` }}
              ></div>
            </div>
            <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
              {desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

