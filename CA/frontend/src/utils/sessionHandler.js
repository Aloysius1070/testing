/**
 * Handle session deactivation (force logout from another device)
 */
export function handleSessionDeactivated() {
  console.warn('⚠️ Session deactivated - you have been logged out from another device');
  
  // Preserve device_id (must persist across logout)
  const deviceId = localStorage.getItem('device_id');
  
  // Clear ALL auth data
  localStorage.clear();
  
  // Restore device_id
  if (deviceId) {
    localStorage.setItem('device_id', deviceId);
  }
  
  // Notify navbar to update UI
  window.dispatchEvent(new Event('auth-change'));
  
  // Redirect to home page and force reload (ensures clean state)
  window.location.hash = '#/';
  window.location.reload();
}

/**
 * Check if error is a session deactivation error
 */
export function isSessionDeactivatedError(error) {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' ? error : error.message || error.detail || '';
  return errorMessage.includes('SESSION_DEACTIVATED') || 
         errorMessage.includes('logged out from another device');
}
