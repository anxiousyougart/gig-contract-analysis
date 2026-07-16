import React, { useState } from 'react'
import Upload from '../pages/Upload'
import Results from '../pages/Results'
import Chat from '../pages/Chat'
import History from '../pages/History'
import { analyzeContract } from '../services/api'

export default function App() {
  const [screen, setScreen] = useState('upload') // 'upload', 'results', 'history', 'about'
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle') // 'uploading', 'retrieving', 'analyzing', 'saving', 'completed', 'error'
  const [result, setResult] = useState(null)
  const [filename, setFilename] = useState('')
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('gigshield_user_id') || '123e0907-7219-4fdc-97ab-dffa6d0771e6'
  })

  const handleUserIdChange = (newId) => {
    setUserId(newId)
    localStorage.setItem('gigshield_user_id', newId)
  }

  const handleUpload = async (file, currentUserId) => {
    setLoading(true)
    setError(null)
    setFilename(file.name)
    handleUserIdChange(currentUserId)
    
    try {
      const data = await analyzeContract(file, currentUserId, (currentStatus) => {
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

  const handleSelectContract = (payload, name) => {
    setResult(payload)
    setFilename(name)
    setScreen('results')
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
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1.2rem', height: '1.2rem' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="logo-text">LexFlow AI</span>
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
            className={`btn-ghost-nav ${screen === 'history' ? 'active' : ''}`}
            onClick={() => setScreen('history')}
          >
            History
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
            userId={userId}
            onUserIdChange={handleUserIdChange}
          />
        )}
        {screen === 'results' && (
          <Results 
            result={result} 
            filename={filename} 
            onReset={handleReset} 
          />
        )}
        {screen === 'history' && (
          <History
            userId={userId}
            onSelectContract={handleSelectContract}
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
        © 2026 LexFlow AI. Built to empower freelancers. Powered by LangGraph & Supabase.
      </footer>
    </div>
  )
}

