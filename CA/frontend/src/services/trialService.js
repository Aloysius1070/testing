import { API_URL } from '../config';

/**
 * Call secure-test endpoint for a specific tool
 * @param {string} toolName - 'gst', 'tds', 'invoice', or 'ledger'
 * @returns {Promise<{ok: boolean, mode: string, message: string}>}
 */
export async function callSecureTest(toolName) {
  const trialToken = localStorage.getItem('trial_token');
  
  console.log('callSecureTest - Trial token present:', trialToken ? 'Yes' : 'No');
  if (trialToken) {
    console.log('Token length:', trialToken.length);
    console.log('Token preview:', trialToken.substring(0, 50) + '...');
  }
  
  const headers = {
    'Content-Type': 'application/json'
  };

  // Add trial token if it exists
  if (trialToken) {
    headers['Authorization'] = `Bearer ${trialToken}`;
  }

  console.log('Calling secure-test for tool:', toolName);
  console.log('Headers:', headers);

  const response = await fetch(`${API_URL}/api/${toolName}/secure-test`, {
    method: 'GET',
    headers,
    credentials: 'include' // Include cookies for subscriber auth
  });

  console.log('Secure-test response status:', response.status);

  if (response.ok) {
    const data = await response.json();
    console.log('Secure-test response data:', data);
    return {
      ok: true,
      mode: data.mode, // 'classic', 'profile', or 'trial'
      message: data.message
    };
  }

  // Handle error responses
  if (response.status === 403) {
    const data = await response.json();
    const errorDetail = data.detail || '';
    
    // Check if it's a plan expiration error
    if (errorDetail.toLowerCase().includes('plan expired') || 
        errorDetail.toLowerCase().includes('subscription expired')) {
      const error = new Error(errorDetail);
      error.isPlanExpired = true; // Special flag for plan expiration
      throw error;
    }
    
    // Other 403 errors (like admin access)
    throw new Error(errorDetail || 'Admins cannot access tools');
  }

  if (response.status === 401) {
    const data = await response.json();
    console.log('401 error response:', data);
    throw new Error(data.detail || 'Login required');
  }

  throw new Error('Failed to verify access');
}

/**
 * Start free trial - send OTP to email
 * @param {string} email
 * @returns {Promise<{trial_id: string}>}
 */
export async function startFreeTrial(email) {
  const response = await fetch(`${API_URL}/api/trial/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Failed to start trial');
  }

  return response.json();
}

/**
 * Verify trial OTP and activate trial
 * @param {string} trialId
 * @param {string} otp
 * @returns {Promise<{trial_jwt_token: string, remaining_runs: number}>}
 */
export async function verifyTrialOTP(trialId, otp) {
  const response = await fetch(`${API_URL}/api/trial/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trial_id: trialId,
      otp: otp
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Invalid OTP');
  }

  return response.json();
}

/**
 * Execute tool via /api/execute endpoint
 * @param {string} toolName - 'GST', 'TDS', 'INVOICE', or 'LEDGER'
 * @param {object} payload - Tool-specific payload
 * @returns {Promise<{ok: boolean, trial?: {remaining_runs: number}, result: any}>}
 */
export async function executeToolWithTrial(toolName, payload) {
  const trialToken = localStorage.getItem('trial_token');
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (trialToken) {
    headers['Authorization'] = `Bearer ${trialToken}`;
  }

  const response = await fetch(`${API_URL}/api/execute`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      tool: toolName,
      payload: payload
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Execution failed');
  }

  return response.json();
}
