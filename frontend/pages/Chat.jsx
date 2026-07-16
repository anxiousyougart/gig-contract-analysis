import React from 'react'

export default function Chat({ onReset }) {
  return (
    <div className="card" style={{ maxWidth: '750px', margin: '2rem auto', padding: '2.5rem' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontFamily: 'Outfit' }}>About LexFlow AI Contract Analyzer</h2>
      <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
        LexFlow AI is an agentic contract audit tool designed specifically for gig workers, freelancers, and independent contractors in India.
      </p>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', marginTop: '1.5rem', color: '#c7d2fe' }}>How the Analysis Works:</h3>
      <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <li>
          <strong>PDF Extraction:</strong> We extract the full raw text from your uploaded document.
        </li>
        <li>
          <strong>RAG Search:</strong> The system runs similarity embeddings on the contract headers to fetch active legal references from the Indian Contract Act (1872) and freelancer code standards stored in our FAISS vector index.
        </li>
        <li>
          <strong>Multi-Agent Graph:</strong> A multi-agent LangGraph workflow processes the contract:
          <ul style={{ paddingLeft: '1rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyleType: 'circle' }}>
            <li>Extracts specific clauses.</li>
            <li>Detects parallel risks (e.g. indemnity, liability).</li>
            <li>Detects missing contract protections.</li>
            <li>Calculates an objective Fairness Score from 0 to 100.</li>
            <li>Maps contract quotes to detected risks as evidence.</li>
          </ul>
        </li>
        <li>
          <strong>Supabase Synchronization:</strong> Saves raw texts and analyses directly to your remote Postgres database.
        </li>
      </ol>

      <button className="btn-primary" onClick={onReset} style={{ marginTop: '2.5rem' }}>
        Start New Analysis
      </button>
    </div>
  )
}
