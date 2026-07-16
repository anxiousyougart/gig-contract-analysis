import React, { useState, useEffect } from 'react'
import { getHistory, deleteHistoryItem } from '../services/api'

export default function History({ userId, onSelectContract, onReset }) {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!userId) return

    const fetchHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getHistory(userId)
        setHistoryList(data || [])
      } catch (err) {
        setError(err.message || 'Failed to load analysis history.')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [userId])

  const handleDelete = async (e, contractId) => {
    e.stopPropagation() // prevent triggering selection/viewing
    if (!window.confirm('Are you sure you want to delete this contract from your history?')) {
      return
    }

    try {
      await deleteHistoryItem(contractId, userId)
      setHistoryList(prev => prev.filter(item => item.id !== contractId))
    } catch (err) {
      alert(err.message || 'Failed to delete history item.')
    }
  }

  const handleSelect = (item) => {
    // Combine db values to match dashboard payload expectations
    const payload = {
      ...item.analysis,
      raw_text: item.raw_text,
      filename: item.filename,
      id: item.id,
      created_at: item.created_at,
      db_saved: true
    }
    onSelectContract(payload, item.filename)
  }

  // Determine score color
  const getScoreColor = (scoreValue) => {
    if (scoreValue >= 70) return 'var(--color-success)';
    if (scoreValue >= 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const filteredHistory = historyList.filter(item => 
    item.filename?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Analysis History</h2>
          <p className="text-secondary">Manage and view previously audited agreements for your user ID.</p>
        </div>
        <button className="btn-ghost-nav" onClick={onReset} style={{ border: '1px solid var(--border-color)' }}>
          + New Audit
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {/* Search bar */}
        {historyList.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by contract filename..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0' }}>
            <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', marginBottom: '1rem' }}></div>
            <p className="text-secondary">Loading your history...</p>
          </div>
        ) : error ? (
          <div className="assessment-box danger" style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="assessment-title">Connection Error</div>
            <p style={{ marginBottom: '1.5rem' }}>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()} style={{ display: 'inline-flex', width: 'auto' }}>
              Retry Connection
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1rem auto', color: 'var(--text-muted)' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <h3>No past analyses found</h3>
            <p className="text-muted" style={{ marginTop: '0.5rem', maxWidth: '400px', margin: '0.5rem auto' }}>
              {searchTerm 
                ? `No results match your search "${searchTerm}".`
                : `Upload a contract under Supabase ID "${userId}" to populate your history.`
              }
            </p>
            {!searchTerm && (
              <button className="btn-primary" onClick={onReset} style={{ marginTop: '1.5rem', display: 'inline-flex', width: 'auto' }}>
                Analyze First Contract
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Contract Filename</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Score</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Date Audited</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const score = item.analysis?.fairness_score || 0;
                  const dateStr = item.created_at 
                    ? new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                    : 'N/A';

                  return (
                    <tr 
                      key={item.id} 
                      className="history-row" 
                      onClick={() => handleSelect(item)}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.03)', 
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)'
                      }}
                    >
                      <td style={{ padding: '1.2rem 0.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', marginRight: '0.4rem', verticalAlign: 'middle', display: 'inline-block' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {item.filename || 'Unnamed Contract'}
                      </td>
                      <td style={{ padding: '1.2rem 0.5rem' }}>
                        <span 
                          className="badge" 
                          style={{ 
                            background: `${getScoreColor(score)}15`,
                            color: getScoreColor(score),
                            borderColor: `${getScoreColor(score)}30` 
                          }}
                        >
                          {score} / 100
                        </span>
                      </td>
                      <td style={{ padding: '1.2rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '1.2rem 0.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button 
                          className="btn-ghost-nav" 
                          onClick={() => handleSelect(item)}
                          style={{ marginRight: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                          View
                        </button>
                        <button 
                          className="btn-ghost-nav" 
                          onClick={(e) => handleDelete(e, item.id)}
                          style={{ 
                            color: 'var(--color-danger)', 
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.85rem'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
