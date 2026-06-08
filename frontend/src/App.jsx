import React, { useState } from 'react'
import Upload from '../pages/Upload'
import Results from '../pages/Results'
import Chat from '../pages/Chat'
import { analyzeContract } from '../services/api'

export default function App() {
  const [screen, setScreen] = useState('upload') // 'upload', 'results', 'about'
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle') // 'uploading', 'retrieving', 'analyzing', 'saving', 'completed', 'error'
  const [result, setResult] = useState(null)
  const [filename, setFilename] = useState('')
  const [error, setError] = useState(null)

  const handleUpload = async (file, userId) => {
    setLoading(true)
    setError(null)
    setFilename(file.name)
    
    try {
      const data = await analyzeContract(file, userId, (currentStatus) => {
        setStatus(currentStatus)
      })
      setResult(data)
      setScreen('results')
    } catch (err) {
      setError(err.message || "Failed to analyze contract. Please try again.")
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setFilename('')
    setError(null)
    setStatus('idle')
    setScreen('upload')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <a href="#" className="logo-container" onClick={(e) => { e.preventDefault(); handleReset(); }}>
          <div className="logo-icon">🛡️</div>
          <span className="logo-text">GigShield</span>
          <span className="logo-badge">Beta</span>
        </a>
        <nav className="header-links">
          <button 
            className={`btn-ghost-nav ${screen === 'upload' ? 'active' : ''}`}
            onClick={handleReset}
          >
            Analyzer
          </button>
          <button 
            className={`btn-ghost-nav ${screen === 'about' ? 'active' : ''}`}
            onClick={() => setScreen('about')}
          >
            About
          </button>
        </nav>
      </header>

      <main className="app-main">
        {screen === 'upload' && (
          <Upload 
            onUpload={handleUpload} 
            loading={loading} 
            status={status} 
            error={error} 
          />
        )}
        {screen === 'results' && (
          <Results 
            result={result} 
            filename={filename} 
            onReset={handleReset} 
          />
        )}
        {screen === 'about' && (
          <Chat 
            onReset={handleReset} 
          />
        )}
      </main>

      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
        © 2026 GigShield. Built to empower freelancers. Powered by LangGraph & Supabase.
      </footer>
    </div>
  )
}
