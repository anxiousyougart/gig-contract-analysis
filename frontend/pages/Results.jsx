import React, { useState } from 'react'
import FairnessCard from '../components/FairnessCard'
import RiskCard from '../components/RiskCard'
import MissingClauses from '../components/MissingClauses'
import EvidenceCard from '../components/EvidenceCard'
import ContractViewer from '../components/ContractViewer'
import { improveContract } from '../services/api'

export default function Results({ result, filename, onReset }) {
  const [activeTab, setActiveTab] = useState('clauses')
  const [expandedClause, setExpandedClause] = useState(null)

  const [improvingFull, setImprovingFull] = useState(false);
  const [improverStep, setImproverStep] = useState('idle');
  const [improvedData, setImprovedData] = useState(null);

  if (!result) return null;

  const handleImproveFullContract = async () => {
    setImprovingFull(true);
    setImproverStep('planning');
    try {
      const stepTimer1 = setTimeout(() => setImproverStep('rewriting'), 1800);
      const stepTimer2 = setTimeout(() => setImproverStep('composing'), 4500);
      const stepTimer3 = setTimeout(() => setImproverStep('validating'), 7500);
      
      const data = await improveContract(result.id, rawText, clauses, risks, missingClauses);
      
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      
      setImproverStep('done');
      setImprovedData(data);
    } catch (err) {
      alert(err.message || "Failed to run contract improver. Please try again.");
    } finally {
      setImprovingFull(false);
    }
  };

  const handleDownload = () => {
    const downloadId = (improvedData && improvedData.improved_analysis && improvedData.improved_analysis.id) || result.id;
    if (!downloadId) {
      alert("No contract ID found. Please make sure the contract analysis has been saved.");
      return;
    }
    // Triggers download from GET /api/download/{contract_id}
    window.location.href = `/api/download/${downloadId}`;
  };

  const score = result.fairness_score || 0;
  const assessment = result.overall_assessment || 'No assessment generated.';
  const reasoning = result.fairness_reasoning || '';
  const clauses = result.clauses || {};
  const risks = result.risks || [];
  const missingClauses = result.missing_clauses || [];
  const evidence = result.evidence || [];
  const breakdown = result.score_breakdown || {};
  const rawText = result.raw_text || '';

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

  if (improvingFull) {
    return (
      <div className="card loading-panel" style={{ maxWidth: '680px', margin: '2rem auto' }}>
        <div className="spinner"></div>
        <h3 style={{ marginBottom: '1rem', fontFamily: 'Outfit' }}>LexFlow AI Contract Improver</h3>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>Running the multi-stage optimization pipeline.</p>
        
        <div className="progress-steps" style={{ width: '100%' }}>
          <div className={`progress-step ${improverStep === 'planning' ? 'active' : ''} ${['rewriting', 'composing', 'validating', 'done'].includes(improverStep) ? 'completed' : ''}`}>
            <span className="step-bullet">1</span>
            <span>Stage 2: Revision Planning</span>
          </div>
          <div className={`progress-step ${improverStep === 'rewriting' ? 'active' : ''} ${['composing', 'validating', 'done'].includes(improverStep) ? 'completed' : ''}`}>
            <span className="step-bullet">2</span>
            <span>Stage 3: Interactive Clause Rewriter</span>
          </div>
          <div className={`progress-step ${improverStep === 'composing' ? 'active' : ''} ${['validating', 'done'].includes(improverStep) ? 'completed' : ''}`}>
            <span className="step-bullet">3</span>
            <span>Stage 4: Document Composer</span>
          </div>
          <div className={`progress-step ${improverStep === 'validating' ? 'active' : ''} ${['done'].includes(improverStep) ? 'completed' : ''}`}>
            <span className="step-bullet">4</span>
            <span>Stage 5: Pipeline Validator & Re-Analysis</span>
          </div>
        </div>
      </div>
    );
  }

  if (improvedData) {
    const oldScore = score;
    const newScore = improvedData.improved_analysis.fairness_score || 0;
    
    return (
      <div className="results-screen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Improver Comparison Dashboard</h2>
            <p className="text-secondary">Contract: <strong>{filename || result.filename}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={handleDownload} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: 'auto' }}>
              Download Improved Contract (.docx)
            </button>
            <button className="btn-ghost-nav" onClick={() => setImprovedData(null)} style={{ border: '1px solid var(--border-color)' }}>
              ← Back to Audit
            </button>
          </div>
        </div>

        {/* Score comparison card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: '#c7d2fe', fontFamily: 'Outfit' }}>Fairness Optimization Impact</h3>
          
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Old Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Original</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: getScoreColor(oldScore) }}>{oldScore}</div>
            </div>
            
            {/* Arrow */}
            <div style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>➔</div>
            
            {/* New Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' }}>Optimized</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: getScoreColor(newScore) }}>{newScore}</div>
            </div>

            {/* Impact Text */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ fontWeight: '700', color: 'var(--color-success)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                +{newScore - oldScore} Points Increase!
              </div>
              <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
                All identified unilateral termination vulnerabilities, dispute resolution imbalances, and liability exposures have been addressed. The contract is now substantially fairer.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison grid: Side-by-side contract view */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left panel: Original text */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>Original Contract</h4>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.25)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '1.25rem', 
              maxHeight: '50vh', 
              overflowY: 'auto', 
              fontFamily: 'Georgia, serif', 
              fontSize: '0.85rem', 
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-secondary)'
            }}>
              {rawText}
            </div>
          </div>

          {/* Right panel: Improved text */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-success)' }}>LexFlow AI Improved Contract</h4>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.25)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '1.25rem', 
              maxHeight: '50vh', 
              overflowY: 'auto', 
              fontFamily: 'Georgia, serif', 
              fontSize: '0.85rem', 
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)'
            }}>
              {improvedData.improved_raw_text}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Analysis Dashboard</h2>
          <p className="text-secondary">Contract: <strong>{filename || result.filename}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={handleImproveFullContract} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: 'auto' }}>
            ⚡ Auto-Improve Contract
          </button>
          <button className="btn-ghost-nav" onClick={onReset} style={{ border: '1px solid var(--border-color)' }}>
            ← Upload Another
          </button>
        </div>
      </div>

      {/* Rookie Guide Banner for Beginners */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
        <div style={{ fontSize: '1.5rem', lineHeight: '1' }}>💡</div>
        <div>
          <h4 style={{ color: '#c7d2fe', fontSize: '0.95rem', marginBottom: '0.25rem', fontFamily: 'Outfit' }}>
            New to Freelance Contracts? Start Here
          </h4>
          <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
            Read your document in <strong>Contract View</strong> (the last tab) to see highlighted concerns in-place. You can hover highlights to read popovers, and click <strong>Auto-Improve Contract</strong> in the top-right to let AI optimize the contract to a safer, more balanced version.
          </p>
        </div>
      </div>

      <div className="results-grid">
        {/* Sidebar Cards */}
        <div className="sidebar-card">
          <div className="card gauge-box" style={{ gap: '0.5rem' }}>
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
            <div className="score-label" style={{ marginBottom: '0.25rem' }}>Fairness Rating</div>
            <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', lineHeight: '1.3', padding: '0 0.5rem', margin: 0 }}>
              Based on obligations balance, liability caps, and mutual terms. 70+ is safe.
            </p>
          </div>

          <div className={`assessment-box ${getAssessmentClass(score)}`}>
            <div className="assessment-title">
              Overall Assessment
            </div>
            <p>{assessment}</p>
            {reasoning && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', opacity: 0.85 }}>
                {reasoning}
              </p>
            )}
          </div>

          <details style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <summary style={{ outline: 'none', color: 'var(--text-secondary)', fontWeight: '600', padding: '0.5rem 0.25rem' }}>
              🛠️ Technical Metadata
            </summary>
            <div className="card db-metadata-box" style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
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
          </details>
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
            <button 
              className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
              onClick={() => setActiveTab('contract')}
            >
              Contract View
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
                            <span 
                              className={`badge ${exists ? 'low' : 'critical'}`} 
                              style={{ fontSize: '0.7rem', textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: '70px', textAlign: 'center' }}
                            >
                              {exists ? 'Present' : 'Not Found'}
                            </span>
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

            {activeTab === 'contract' && (
              <ContractViewer
                contractId={result.id}
                rawText={rawText}
                risks={risks}
                clauses={clauses}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
