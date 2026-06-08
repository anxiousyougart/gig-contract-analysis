import React, { useState, useRef } from 'react'

export default function Upload({ onUpload, loading, status, error }) {
  const [file, setFile] = useState(null)
  const [userId, setUserId] = useState('123e0907-7219-4fdc-97ab-dffa6d0771e6')
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
              <div className="dropzone-icon-container">📄</div>
              <h3>Selected Contract</h3>
              <div className="file-pill" title={file.name}>{file.name}</div>
              <p style={{ marginTop: '1rem' }}>Click or drop a different file to replace</p>
            </div>
          ) : (
            <div>
              <div className="dropzone-icon-container">📥</div>
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
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User UUID"
            required
          />
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
            Pre-filled with the authenticated user ID to bypass constraints.
          </p>
        </div>

        {error && (
          <div className="assessment-box danger" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <div className="assessment-title">⚠️ Error Analyzing Contract</div>
            <p style={{ fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={!file || loading}
        >
          🔍 Analyze Agreement
        </button>
      </form>
    </div>
  )
}
