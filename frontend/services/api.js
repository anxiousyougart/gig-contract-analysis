/**
 * Client-side API Service for LexFlow AI Contract Analysis
 */

export async function analyzeContract(file, userId, onStatusChange = null) {
  if (onStatusChange) onStatusChange('uploading');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId || '00000000-0000-0000-0000-000000000000');
  
  try {
    if (onStatusChange) onStatusChange('retrieving');
    
    // Step progress mocks updates (handled locally since upload is a single post request)
    const mockStepTimer = setTimeout(() => {
      if (onStatusChange) onStatusChange('analyzing');
    }, 2000);
    
    const mockStepTimer2 = setTimeout(() => {
      if (onStatusChange) onStatusChange('saving');
    }, 6000);

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });
    
    clearTimeout(mockStepTimer);
    clearTimeout(mockStepTimer2);
    
    if (onStatusChange) onStatusChange('completed');
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (onStatusChange) onStatusChange('error');
    console.error('API Error in analyzeContract:', error);
    throw error;
  }
}

/**
 * Fetches analysis history for a given user ID
 */
export async function getHistory(userId) {
  try {
    const response = await fetch(`/api/history?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `History fetch failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error in getHistory:', error);
    throw error;
  }
}

/**
 * Deletes a contract analysis record
 */
export async function deleteHistoryItem(contractId, userId) {
  try {
    const response = await fetch(`/api/history/${encodeURIComponent(contractId)}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Delete item failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error in deleteHistoryItem:', error);
    throw error;
  }
}

/**
 * Sends a clause along with risk context to the backend for AI improvement/rectification.
 */
export async function improveClause(clauseName, originalText, riskExplanation, legalReference) {
  try {
    const response = await fetch('/api/improve-clause', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clause_name: clauseName,
        original_text: originalText,
        risk_explanation: riskExplanation,
        legal_reference: legalReference || "Indian Contract Act, 1872"
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Clause improvement failed: ${response.status}`);
    }
    return await response.json(); // returns { improved_text: "..." }
  } catch (error) {
    console.error('API Error in improveClause:', error);
    throw error;
  }
}

export async function improveContract(contractId, rawText, clauses, risks, missingClauses) {
  try {
    const response = await fetch('/api/improve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contract_id: contractId,
        raw_text: rawText,
        clauses,
        risks,
        missing_clauses: missingClauses
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Contract improvement failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error in improveContract:', error);
    throw error;
  }
}



