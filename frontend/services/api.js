/**
 * Client-side API Service for Gigshield Contract Analysis
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
