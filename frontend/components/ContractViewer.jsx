import React, { useState, useEffect, useMemo, useRef } from 'react'
import { improveClause } from '../services/api'

/**
 * Maps a severity string to the CSS highlight class.
 */
function getSeverityClass(severity = '') {
  const s = severity.toLowerCase()
  if (s === 'critical' || s === 'high') return 'hl-high'
  if (s === 'medium')                   return 'hl-medium'
  return 'hl-low'
}

/**
 * Returns a severity icon for use in the popover badge.
 */
function getSeverityIcon(severity = '') {
  const s = severity.toLowerCase()
  if (s === 'critical') return '🚨'
  if (s === 'high')     return '🔴'
  if (s === 'medium')   return '🟡'
  return '🔵'
}

/**
 * Normalises text for fuzzy matching — collapse whitespace, lowercase.
 */
function normalise(str = '') {
  return str.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Fuzzy matches any natural language clause title to our snake_case keys.
 */
function findClauseData(affectedClauseName, clauses) {
  if (!affectedClauseName || !clauses) return null
  
  const target = affectedClauseName.toLowerCase().trim()
  
  // 1. Direct match
  if (clauses[affectedClauseName]) {
    return clauses[affectedClauseName]
  }
  
  // 2. Normalized casing match (e.g. "Payment Terms" -> "payment_terms")
  const normalizedTarget = target.replace(/[\s_-]+/g, '_')
  if (clauses[normalizedTarget]) {
    return clauses[normalizedTarget]
  }
  
  // 3. Normalized alphanumeric substring overlap (e.g. "termination by client" -> "termination")
  const targetClean = target.replace(/[^a-z0-9]+/g, '')
  for (const key of Object.keys(clauses)) {
    const keyClean = key.toLowerCase().replace(/[^a-z0-9]+/g, '')
    if (targetClean.includes(keyClean) || keyClean.includes(targetClean)) {
      return clauses[key]
    }
  }
  
  return null
}

function isParagraphInClause(para, clauseContent) {
  const normPara = para.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const normContent = clauseContent.toLowerCase().replace(/[^a-z0-9]+/g, '')
  
  // Substring match: exclude very short heading fragments
  if (normPara.length > 35 && normContent.includes(normPara)) {
    return true
  }
  
  // Fallback: Word overlap check
  const paraWords = para.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length > 4)
  // Ensure we have enough significant words to prevent short titles/lists from matching
  if (paraWords.length < 4) return false
  
  const contentWords = new Set(clauseContent.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length > 4))
  const hits = paraWords.filter(w => contentWords.has(w)).length
  
  return hits / paraWords.length >= 0.65
}

/**
 * Builds an array of { text, paraRisks[] } objects from rawText and analysis data.
 */
function buildHighlightMap(paragraphs, risks, clauses) {
  const paraRisks = paragraphs.map(() => [])

  risks.forEach(risk => {
    const clauseKey = risk.affected_clause
    if (!clauseKey) return

    const clauseData = findClauseData(clauseKey, clauses)
    if (!clauseData || !clauseData.exists || !clauseData.content) return

    const hlClass = getSeverityClass(risk.severity)

    paragraphs.forEach((para, idx) => {
      if (!para.trim()) return
      
      if (isParagraphInClause(para, clauseData.content)) {
        paraRisks[idx].push({ risk, hlClass })
      }
    })
  })

  return paragraphs.map((text, idx) => ({ text, paraRisks: paraRisks[idx] }))
}

const SEVERITY_ORDER = { 'hl-high': 0, 'hl-medium': 1, 'hl-low': 2 }

/**
 * Client-side reflow text algorithm to consolidate fragmented line breaks.
 */
function reflowText(text) {
  if (!text) return ""
  const lines = text.split("\n")
  const reflowed = []
  let currentPara = []

  for (let line of lines) {
    const stripped = line.trim()
    if (!stripped) {
      if (currentPara.length > 0) {
        reflowed.push(currentPara.join(" "))
        currentPara = []
      }
      continue
    }

    const isHeadingOrList = 
      stripped.startsWith("#") ||
      stripped.startsWith("-") ||
      stripped.startsWith("*") ||
      stripped.startsWith("•") ||
      (/^\d+(\.\d+)*[\.\)]/.test(stripped)) || // e.g. 1. or 4.2.1. or 4.2)
      (stripped === stripped.toUpperCase() && stripped.length < 80)

    if (isHeadingOrList) {
      if (currentPara.length > 0) {
        reflowed.push(currentPara.join(" "))
      }
      currentPara = [stripped]
    } else {
      currentPara.push(stripped)
    }
  }

  if (currentPara.length > 0) {
    reflowed.push(currentPara.join(" "))
  }

  return reflowed.filter(b => b.trim() !== "").join("\n\n")
}

export default function ContractViewer({ contractId, rawText, risks, clauses }) {
  const docRef = useRef(null)

  const [contractTexts, setContractTexts] = useState([])
  const [localRisks, setLocalRisks] = useState(risks || [])
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [improving, setImproving] = useState(false)
  const [improvementResult, setImprovementResult] = useState(null)

  // Sync local risks when the parent's risk prop changes (e.g. new analysis)
  useEffect(() => {
    setLocalRisks(risks || [])
  }, [risks])

  useEffect(() => {
    const reflowed = reflowText(rawText)
    setContractTexts(reflowed ? reflowed.split(/\n\n/) : [])
    setSelectedRisk(null)
    setImprovementResult(null)
    setImproving(false)
  }, [rawText])

  const highlightedParas = useMemo(() => {
    if (contractTexts.length === 0) return []
    return buildHighlightMap(contractTexts, localRisks, clauses || {})
  }, [contractTexts, localRisks, clauses])

  const legendItems = useMemo(() => {
    const seen = new Set()
    const items = []
    highlightedParas.forEach((p, idx) => {
      if (!p.paraRisks.length) return
      p.paraRisks.forEach(({ risk, hlClass }) => {
        if (!seen.has(risk.risk_name)) {
          seen.add(risk.risk_name)
          items.push({ risk, hlClass, paraIdx: idx })
        }
      })
    })
    return items
  }, [highlightedParas])

  if (!rawText) {
    return (
      <div className="contract-viewer-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1rem auto' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>Contract text is not available for this analysis.</p>
      </div>
    )
  }

  const scrollToPara = (idx) => {
    const el = docRef.current?.querySelector(`[data-para-idx="${idx}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleSelectRisk = (risk, hlClass, paraIdx) => {
    setSelectedRisk({ risk, hlClass, paraIdx })
    setImprovementResult(null)
    setImproving(false)
    scrollToPara(paraIdx)
  }

  const handleImprove = async () => {
    if (!selectedRisk) return
    setImproving(true)
    try {
      const clauseData = findClauseData(selectedRisk.risk.affected_clause, clauses)
      const originalText = (clauseData && clauseData.exists && clauseData.content) 
        ? clauseData.content 
        : contractTexts[selectedRisk.paraIdx]
      const explanation = selectedRisk.risk.explanation
      const clauseName = selectedRisk.risk.affected_clause || "Contract Clause"

      const response = await improveClause(clauseName, originalText, explanation, "Indian Contract Act, 1872")
      setImprovementResult(response.improved_text)
    } catch (err) {
      alert(err.message || 'Failed to rewrite clause. Please try again.')
    } finally {
      setImproving(false)
    }
  }

  const handleApplyImprovement = () => {
    if (!selectedRisk || !improvementResult) return
    
    const resolvedRiskName = selectedRisk.risk.risk_name
    const resolvedAffectedClause = selectedRisk.risk.affected_clause
    
    // Find all paragraph indices that match this risk
    const indicesToReplace = []
    highlightedParas.forEach((p, idx) => {
      if (p.paraRisks.some(pr => pr.risk.risk_name === resolvedRiskName)) {
        indicesToReplace.push(idx)
      }
    })
    
    const updated = [...contractTexts]
    
    // Replace the exact clicked paragraph with the optimized revision
    updated[selectedRisk.paraIdx] = improvementResult
    
    // Clear all other matched indices (fragments) to prevent duplication
    indicesToReplace.forEach(idx => {
      if (idx !== selectedRisk.paraIdx) {
        updated[idx] = ""
      }
    })
    
    // Remove empty paragraphs to collapse the text
    const collapsed = updated.filter(text => text.trim() !== "")
    
    // Remove ALL risks that match this risk name or the same affected clause from local state
    const updatedRisks = localRisks.filter(r => {
      if (r.risk_name === resolvedRiskName) return false
      // Also remove other risks on the same clause if they share the affected_clause
      if (resolvedAffectedClause && r.affected_clause === resolvedAffectedClause) return false
      return true
    })
    
    setContractTexts(collapsed)
    setLocalRisks(updatedRisks)
    setSelectedRisk(null)
    setImprovementResult(null)
  }

  const handleDownloadContract = () => {
    if (contractId) {
      window.location.href = `/api/download/${contractId}`;
    } else {
      const fullText = contractTexts.join("\n\n")
      const blob = new Blob([fullText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'improved_contract.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="contract-viewer-wrap">
      <div className="contract-doc-panel" ref={docRef}>
        {legendItems.length === 0 ? (
          <div className="contract-clean-banner" style={{ display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: '#10b981', flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            No risks were detected. The contract looks clean!
          </div>
        ) : (
          <div className="contract-clean-banner" style={{
            background: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.2)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: '#ef4444', flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>{legendItems.length} concern{legendItems.length !== 1 ? 's' : ''}</strong> detected. 
              Click highlighted sections to audit & rewrite.
            </span>
          </div>
        )}

        {highlightedParas.map(({ text, paraRisks }, idx) => {
          if (!text.trim()) return <div key={idx} style={{ height: '0.55rem' }} />

          if (paraRisks.length === 0) {
            return <div key={idx} className="contract-para" data-para-idx={idx}>{text}</div>
          }

          const dominantClass = paraRisks.reduce(
            (best, { hlClass }) =>
              SEVERITY_ORDER[hlClass] < SEVERITY_ORDER[best] ? hlClass : best,
            paraRisks[0].hlClass
          )

          const isSelected = selectedRisk && selectedRisk.paraIdx === idx

          return (
            <div
              key={idx}
              className={`contract-para ${dominantClass}`}
              data-para-idx={idx}
              onClick={() => handleSelectRisk(paraRisks[0].risk, dominantClass, idx)}
              style={{
                cursor: 'pointer',
                borderLeftWidth: isSelected ? '5px' : '3px',
                boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none',
                borderColor: isSelected ? 'var(--color-primary)' : ''
              }}
            >
              {text}

              <div className="hl-popover">
                {paraRisks.map(({ risk }, ri) => (
                  <div key={ri} style={{ marginBottom: ri < paraRisks.length - 1 ? '0.8rem' : 0 }}>
                    <div className="hl-popover-title">
                      {risk.risk_name}
                      <span className={`badge ${(risk.severity || 'low').toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                        {getSeverityIcon(risk.severity)} {risk.severity}
                      </span>
                    </div>
                    <div className="hl-popover-body">{risk.explanation}</div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: '500' }}>
                      Click to audit & improve
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="contract-legend">
        {selectedRisk ? (
          <div>
            <button 
              className="btn-ghost-nav" 
              onClick={() => {
                setSelectedRisk(null)
                setImprovementResult(null)
                setImproving(false)
              }}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid var(--border-color)', width: 'auto', cursor: 'pointer' }}
            >
              ← Back to List
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`legend-dot ${selectedRisk.hlClass}`} />
              <h4 style={{ margin: 0, textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-primary)', fontSize: '1rem' }}>
                AI Insight
              </h4>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <span className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Detected Risk</span>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedRisk.risk.risk_name}</div>
              </div>

              <div>
                <span className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Severity</span>
                <div>
                  <span className={`badge ${(selectedRisk.risk.severity || 'low').toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                    {selectedRisk.risk.severity}
                  </span>
                </div>
              </div>

              <div>
                <span className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Issue Explanation</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {selectedRisk.risk.explanation}
                </p>
              </div>

              {selectedRisk.risk.affected_clause && (
                <div>
                  <span className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Affected Clause</span>
                  <div className="legend-clause" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    {selectedRisk.risk.affected_clause.replace(/_/g, ' ')}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '1rem' }}>
                {improvementResult ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1.05rem', height: '1.05rem' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      AI Suggestion Ready
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.25rem' }}>
                      <div>
                        <span className="form-label" style={{ fontSize: '0.68rem', color: 'var(--color-danger)' }}>Original Text</span>
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid #ef4444', padding: '0.6rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'line-through', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                          {findClauseData(selectedRisk.risk.affected_clause, clauses)?.content || contractTexts[selectedRisk.paraIdx]}
                        </div>
                      </div>
                      <div>
                        <span className="form-label" style={{ fontSize: '0.68rem', color: 'var(--color-success)' }}>Proposed Revision</span>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', padding: '0.6rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                          {improvementResult}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-primary" onClick={handleApplyImprovement} style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', width: 'auto', flex: 1, cursor: 'pointer' }}>Apply Changes</button>
                      <button className="btn-ghost-nav" onClick={() => setImprovementResult(null)} style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Discard</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button className="btn-primary" onClick={handleImprove} disabled={improving} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.75rem 1rem', cursor: 'pointer' }}>
                      {improving ? <>Rewriting...</> : <>Improve Clause</>}
                    </button>
                    <p className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.5rem', textAlign: 'center', lineHeight: '1.3' }}>Uses AI grounded in legal knowledge base to rewrite this clause and eliminate identified risks.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h4>Flagged Concerns</h4>
            {legendItems.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No concerns — this contract looks healthy!</div>
            ) : (
              legendItems.map(({ risk, hlClass, paraIdx }, i) => (
                <button key={i} className="legend-item" onClick={() => handleSelectRisk(risk, hlClass, paraIdx)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}>
                  <span className={`legend-dot ${hlClass}`} />
                  <div>
                    <div className="legend-text">{risk.risk_name}</div>
                    {risk.affected_clause && <div className="legend-clause">{risk.affected_clause.replace(/_/g, ' ')}</div>}
                  </div>
                </button>
              ))
            )}
            {legendItems.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[
                  { cls: 'hl-high', label: 'High / Critical' },
                  { cls: 'hl-medium', label: 'Medium' },
                  { cls: 'hl-low', label: 'Low' },
                ].map(({ cls, label }) => (
                  <span key={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className={`legend-dot ${cls}`} style={{ width: 8, height: 8 }} />
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Download improved contract button */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                className="btn-primary"
                onClick={handleDownloadContract}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  padding: '0.7rem 1rem',
                  cursor: 'pointer'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {contractId ? "Download Contract (.docx)" : "Download Contract"}
              </button>
              <p className="text-muted" style={{ fontSize: '0.68rem', marginTop: '0.4rem', textAlign: 'center', lineHeight: '1.3' }}>
                Downloads the current contract text including any applied improvements.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
