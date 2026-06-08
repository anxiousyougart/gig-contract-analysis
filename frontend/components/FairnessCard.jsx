import React from 'react'

export default function FairnessCard({ breakdown }) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return <div className="text-muted">No breakdown data available.</div>;
  }

  // Helper to map score keys to human readable labels
  const formatKeyName = (key) => {
    return key.replace(/_/g, ' ');
  };

  // Helper to calculate score colors/percentages (assuming max is 15 or 10)
  const getPercentage = (val, key) => {
    // If the key is risk_exposure, max might be 15 or 20. Let's approximate based on values.
    const maxVal = key === 'risk_exposure' ? 20 : 15;
    return Math.min(100, Math.round((val / maxVal) * 100));
  };

  return (
    <div className="breakdown-grid">
      {Object.entries(breakdown).map(([key, val]) => {
        const pct = getPercentage(val, key);
        return (
          <div className="breakdown-card" key={key}>
            <div className="breakdown-header">
              <span className="breakdown-name">{formatKeyName(key)}</span>
              <span className="breakdown-score">{val} pts</span>
            </div>
            <div className="breakdown-bar-bg">
              <div 
                className="breakdown-bar-fill" 
                style={{ width: `${pct}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
