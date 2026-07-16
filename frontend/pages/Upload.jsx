import React, { useState, useRef } from 'react'

export default function Upload({ onUpload, loading, status, error, userId, onUserIdChange }) {
  const [file, setFile] = useState(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile)
      } else {
        alert("Please select a PDF file.")
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const onButtonClick = () => {
    fileInputRef.current.click()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!file) return
    onUpload(file, userId)
  }

  const getStatusText = (currentStatus) => {
    switch(currentStatus) {
      case 'uploading': return 'Uploading contract PDF to server...';
      case 'retrieving': return 'Querying vector database for legal context (RAG)...';
      case 'analyzing': return 'Running LangGraph workflow (Extracting clauses, detecting risks, scoring fairness)...';
      case 'saving': return 'Writing analysis output to Supabase contracts table...';
      case 'completed': return 'Analysis complete!';
      default: return 'Processing...';
    }
  }

  if (loading) {
    return (
      <div className="card loading-panel">
        <div className="spinner"></div>
        <h3 style={{ marginBottom: '1rem', fontFamily: 'Outfit' }}>Analyzing Agreement</h3>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>This can take a minute as we run multiple LLM nodes and check context.</p>
        
        <div className="progress-steps">
          <div className={`progress-step ${status === 'uploading' ? 'active' : ''} ${['retrieving', 'analyzing', 'saving', 'completed'].includes(status) ? 'completed' : ''}`}>
            <span className="step-bullet">1</span>
            <span>PDF Upload</span>
          </div>
          <div className={`progress-step ${status === 'retrieving' ? 'active' : ''} ${['analyzing', 'saving', 'completed'].includes(status) ? 'completed' : ''}`}>
            <span className="step-bullet">2</span>
            <span>RAG Context Search</span>
          </div>
          <div className={`progress-step ${status === 'analyzing' ? 'active' : ''} ${['saving', 'completed'].includes(status) ? 'completed' : ''}`}>
            <span className="step-bullet">3</span>
            <span>LangGraph Evaluation</span>
          </div>
          <div className={`progress-step ${status === 'saving' ? 'active' : ''} ${['completed'].includes(status) ? 'completed' : ''}`}>
            <span className="step-bullet">4</span>
            <span>Supabase Sync</span>
          </div>
        </div>

        <p className="text-muted" style={{ marginTop: '2.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
          Current Step: {getStatusText(status)}
        </p>
      </div>
    )
  }

  return (
    <div className="upload-screen">
      <div className="title-section">
        <h2>Shield Your Gig Income</h2>
        <p>Upload your freelance contract to analyze hidden risks, score fairness, and fetch legal protection insights.</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <input 
          ref={fileInputRef}
          type="file" 
          id="file-upload" 
          accept=".pdf" 
          style={{ opacity: 0, position: 'absolute', width: '1px', height: '1px', pointerEvents: 'none' }}
          onChange={handleFileChange}
        />

        <div 
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          {file ? (
            <div>
              <div className="dropzone-icon-container" style={{ display: 'flex', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '2.5rem', height: '2.5rem' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3>Selected Contract</h3>
              <div className="file-pill" title={file.name}>{file.name}</div>
              <p style={{ marginTop: '1rem' }}>Click or drop a different file to replace</p>
            </div>
          ) : (
            <div>
              <div className="dropzone-icon-container" style={{ display: 'flex', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '2.5rem', height: '2.5rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3>Drag and drop your contract PDF here</h3>
              <p>or click to browse from files</p>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="user-id">Supabase User ID</label>
          <input 
            type="text" 
            id="user-id" 
            className="form-input"
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            placeholder="Enter User UUID"
            required
          />
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
            Pre-filled with the authenticated user ID to bypass constraints.
          </p>
        </div>

        {error && (
          <div className="assessment-box danger" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <div className="assessment-title">Error Analyzing Contract</div>
            <p style={{ fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={!file || loading}
        >
          Analyze Agreement
        </button>
      </form>
    </div>
  )
}
