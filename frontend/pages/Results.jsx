import React, { useState } from 'react'
import FairnessCard from '../components/FairnessCard'
import RiskCard from '../components/RiskCard'
import MissingClauses from '../components/MissingClauses'
import EvidenceCard from '../components/EvidenceCard'

export default function Results({ result, filename, onReset }) {
  const [activeTab, setActiveTab] = useState('clauses')
  const [expandedClause, setExpandedClause] = useState(null)

  if (!result) return null;

  const score = result.fairness_score || 0;
  const assessment = result.overall_assessment || 'No assessment generated.';
  const reasoning = result.fairness_reasoning || '';
  const clauses = result.clauses || {};
  const risks = result.risks || [];
  const missingClauses = result.missing_clauses || [];
  const evidence = result.evidence || [];
  const breakdown = result.score_breakdown || {};

  // Custom gauge configurations
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine score color
  const getScoreColor = (scoreValue) => {
    if (scoreValue >= 70) return '#10b981'; // Green
    if (scoreValue >= 50) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getAssessmentClass = (scoreValue) => {
    if (scoreValue >= 70) return 'excellent';
    if (scoreValue >= 50) return 'warning';
    return 'danger';
  };

  const toggleClause = (clauseKey) => {
    if (expandedClause === clauseKey) {
      setExpandedClause(null);
    } else {
      setExpandedClause(clauseKey);
    }
  };

  return (
    <div className="results-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Analysis Dashboard</h2>
          <p className="text-secondary">Contract: <strong>{filename || result.filename}</strong></p>
        </div>
        <button className="btn-ghost-nav" onClick={onReset} style={{ border: '1px solid var(--border-color)' }}>
          ← Upload Another
        </button>
      </div>

      <div className="results-grid">
        {/* Sidebar Cards */}
        <div className="sidebar-card">
          <div className="card gauge-box">
            <svg className="gauge-svg">
              <circle className="gauge-bg" cx="70" cy="70" r={radius} />
              <circle 
                className="gauge-fill" 
                cx="70" 
                cy="70" 
                r={radius} 
                stroke={getScoreColor(score)}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="score-text-val" style={{ color: getScoreColor(score) }}>{score}</div>
            <div className="score-label">Fairness Rating</div>
          </div>

          <div className={`assessment-box ${getAssessmentClass(score)}`}>
            <div className="assessment-title">
              <span>🛡️</span> Overall Assessment
            </div>
            <p>{assessment}</p>
            {reasoning && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', opacity: 0.85 }}>
                {reasoning}
              </p>
            )}
          </div>

          <div className="card db-metadata-box">
            <div>Supabase Sync Status: <span style={{ color: result.db_saved ? 'var(--color-success)' : 'var(--color-danger)' }}>{result.db_saved ? 'Connected & Synced' : 'Failed to Sync'}</span></div>
            {result.id && (
              <div style={{ wordBreak: 'break-all' }}>
                Contract UUID: <br /><strong>{result.id}</strong>
              </div>
            )}
            {result.created_at && (
              <div>
                Analyzed At: <br /><strong>{new Date(result.created_at).toLocaleString()}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Tabbed main details */}
        <div className="card" style={{ padding: '2rem' }}>
          <div className="tabs-header">
            <button 
              className={`tab-btn ${activeTab === 'clauses' ? 'active' : ''}`}
              onClick={() => setActiveTab('clauses')}
            >
              Extracted Clauses ({Object.keys(clauses).length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
              onClick={() => setActiveTab('risks')}
            >
              Risks & Evidence ({risks.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'missing' ? 'active' : ''}`}
              onClick={() => setActiveTab('missing')}
            >
              Missing Protections ({missingClauses.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
              onClick={() => setActiveTab('breakdown')}
            >
              Category Scores
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'clauses' && (
              <div className="list-container">
                {Object.keys(clauses).length === 0 ? (
                  <div className="text-muted">No clauses were extracted.</div>
                ) : (
                  Object.entries(clauses).map(([key, value]) => {
                    const exists = value.exists;
                    const content = value.content;
                    const isExpanded = expandedClause === key;
                    
                    return (
                      <div className="clause-accordion" key={key}>
                        <button className="clause-trigger" onClick={() => toggleClause(key)}>
                          <div className="clause-trigger-left">
                            <span style={{ fontSize: '1.25rem' }}>{exists ? '✔️' : '❌'}</span>
                            <span className="clause-trigger-title">{key.replace(/_/g, ' ')}</span>
                          </div>
                          <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'var(--transition-fast)' }}>
                            ▼
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="clause-content">
                            {exists ? (
                              <p style={{ whiteSpace: 'pre-line' }}>{content}</p>
                            ) : (
                              <p className="clause-missing-notice">This clause was not found in the contract.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === 'risks' && (
              <div>
                <RiskCard risks={risks} />
                {evidence && evidence.length > 0 && (
                  <div style={{ marginTop: '2.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Evidence Mappings</h3>
                    <EvidenceCard evidence={evidence} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'missing' && (
              <MissingClauses missingClauses={missingClauses} />
            )}

            {activeTab === 'breakdown' && (
              <FairnessCard breakdown={breakdown} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
