/**
 * TDS Calculation API Client - Synchronous Processing
 */

import { API_URL } from '../../config';
import { isSessionDeactivatedError, handleSessionDeactivated } from '../../utils/sessionHandler';

export default function TdsCalculation() { return null; }

/**
 * Process TDS file and trigger download
 * @param {File} file - CSV file to upload
 * @param {function} onProgress - Progress callback (progressPercent, message)
 * @returns {Promise<string>} Success message
 */
export async function simulateTds(file, onProgress) {
  // Validate file type
  if (!/\.csv$/i.test(file.name)) {
    throw new Error('Please upload a .csv file for TDS calculation.');
  }
  
  const formData = new FormData();
  formData.append('file', file);

  // Get trial token if in trial mode
  const trialToken = localStorage.getItem('trial_token');
  const headers = {};
  if (trialToken) {
    headers['Authorization'] = `Bearer ${trialToken}`;
  }

  if (onProgress) {
    onProgress(10, 'Uploading file...');
  }

  const response = await fetch(`${API_URL}/api/tds/calculate`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // Check for session deactivation
    if (response.status === 401 && isSessionDeactivatedError(errorText)) {
      handleSessionDeactivated();
      throw new Error('SESSION_DEACTIVATED');
    }
    
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.detail || 'TDS processing failed');
    } catch (e) {
      throw new Error(errorText || 'TDS processing failed');
    }
  }

  if (onProgress) {
    onProgress(90, 'Processing complete, downloading...');
  }

  // Get the result blob
  const blob = await response.blob();
  
  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers.get('content-disposition') || '';
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : file.name.replace(/\.csv$/i, '') + '_tds_result.xlsx';
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (onProgress) {
    onProgress(100, 'Download complete!');
  }

  return `Downloaded ${filename}`;
}

/**
 * Process TDS file - uploads and gets result directly (legacy)
 * @param {File} file - CSV file to upload
 * @param {function} onProgress - Progress callback
 * @param {string} token - Auth token (for trial users)
 * @returns {Promise<Blob>}
 */
export async function processTdsFile(file, onProgress = null, token = null) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (onProgress) {
      onProgress({ status: 'processing', progress: 20, message: 'Processing TDS file...' });
    }

    const response = await fetch(`${API_URL}/api/tds/calculate`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.detail || 'TDS processing failed');
      } catch {
        throw new Error('TDS processing failed');
      }
    }

    if (onProgress) {
      onProgress({ status: 'completed', progress: 100, message: 'Completed!' });
    }

    return response.blob();
  } catch (error) {
    if (onProgress) {
      onProgress({ status: 'error', progress: 0, message: error.message });
    }
    throw error;
  }
}
